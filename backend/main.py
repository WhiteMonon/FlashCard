import io
import os
import edge_tts
import uuid
import json
from fastapi import FastAPI, UploadFile, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from databases import Database
from sqlalchemy import create_engine
from contextlib import asynccontextmanager
import models
import eng_to_ipa as ipa

# Environment Variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://flashcard:flashcard123@localhost:5432/flashcard_db")

# Database Connection
database = Database(DATABASE_URL)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # Create tables if not exist (Synchronous for simplicity in this setup, usually handled by alembic)
    # Note: We need a synchronous engine for metadata.create_all
    sync_engine = create_engine(DATABASE_URL.replace("+asyncpg", "")) # databases uses asyncpg, sqlalchemy create_all needs sync driver usually or special handling.
    # To avoid complex driver issues, we use the simple string if it's standard postgresql://
    # If using asyncpg encoded in URL validation might fail for create_engine if not handled.
    # Docker-compose sets: postgresql://flashcard:flashcard123@db:5432/flashcard_db
    # This acts as sync for psycopg2 if installed or we can try. 
    # For now, let's assume psycopg2-binary might be needed for create_engine sync check or we just use raw query via database.execute
    
    # Simpler approach for table creation without extra sync driver dependency if possible:
    # But usually creating tables is done strictly once. 
    # Let's try to use the query directly if create_all fails or just assume we can run a script.
    # Actually, let's just add psycopg2-binary to requirements or use a try/except.
    # Better: Use the 'databases' connection to run raw DDL if table doesn't exist.
    
    await database.connect()
    
    # Manual Table Creation (Idempotent)
    # create_table_query
    await database.execute("""
    CREATE TABLE IF NOT EXISTS audio_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        word TEXT NOT NULL,
        voice TEXT NOT NULL,
        audio_data BYTEA NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
    """)
    await database.execute("CREATE INDEX IF NOT EXISTS idx_audio_cache_word_voice ON audio_cache (word, voice);")

    # Decks Table
    await database.execute("""
    CREATE TABLE IF NOT EXISTS decks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
    """)

    # Cards Table
    await database.execute("""
    CREATE TABLE IF NOT EXISTS cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deck_id UUID NOT NULL,
        word TEXT NOT NULL,
        meaning TEXT NOT NULL,
        interval FLOAT DEFAULT 0,
        repetition INTEGER DEFAULT 0,
        ease FLOAT DEFAULT 2.5,
        next_review BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
    );
    """)
    await database.execute("CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards (deck_id);")

    # Migration: Add ipa column to cards if it doesn't exist
    try:
        await database.execute("ALTER TABLE cards ADD COLUMN IF NOT EXISTS ipa TEXT;")
    except Exception as e:
        print(f"Migration warning: {e}")

    yield
    # Shutdown
    await database.disconnect()

app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
from pydantic import BaseModel
from typing import List

class DeckCreate(BaseModel):
    name: str

class CardCreate(BaseModel):
    word: str
    meaning: str

class DeckImport(BaseModel):
    name: str
    cards: List[CardCreate]

@app.get("/")
async def root():
    return {"message": "FlashCard TTS Backend Running"}

# --- Deck APIs ---

@app.get("/decks")
async def get_decks():
    query = "SELECT * FROM decks ORDER BY created_at DESC"
    return await database.fetch_all(query)

@app.post("/decks")
async def create_deck(deck: DeckImport):
    # 1. Create Deck
    deck_id = uuid.uuid4()
    query_deck = "INSERT INTO decks (id, name) VALUES (:id, :name)"
    await database.execute(query_deck, values={"id": deck_id, "name": deck.name})

    # 2. Create Cards & Trigger Audio
    if deck.cards:
        values = []
        for card in deck.cards:
            values.append({
                "id": uuid.uuid4(),
                "deck_id": deck_id,
                "word": card.word,
                "meaning": card.meaning,
                "ipa": ipa.convert(card.word)
            })
            # Background Audio Generation Trigger (Fire and forget or queue)
            # For now, we'll let the client trigger audio fetches or do it lazily. 
            # Or we can just let 'get_audio' handle it when reviewed.
            
        query_cards = """
        INSERT INTO cards (id, deck_id, word, meaning, ipa) 
        VALUES (:id, :deck_id, :word, :meaning, :ipa)
        """
        await database.execute_many(query_cards, values)

    return {"id": deck_id, "name": deck.name, "card_count": len(deck.cards)}

@app.post("/decks/{deck_id}/cards")
async def add_cards_to_deck(deck_id: str, cards: List[CardCreate]):
    if not cards:
        return {"message": "No cards to add"}
        
    values = []
    for card in cards:
        values.append({
            "id": uuid.uuid4(),
            "deck_id": deck_id,
            "word": card.word,
            "meaning": card.meaning,
            "ipa": ipa.convert(card.word)
        })
        
    query_cards = """
    INSERT INTO cards (id, deck_id, word, meaning, ipa) 
    VALUES (:id, :deck_id, :word, :meaning, :ipa)
    """
    await database.execute_many(query_cards, values)
    
    return {"deck_id": deck_id, "added_count": len(cards)}

@app.get("/sync")
async def sync_data():
    """Returns all decks and cards for client sync"""
    decks = await database.fetch_all("SELECT * FROM decks")
    cards = await database.fetch_all("SELECT * FROM cards")
    
    # Format for client
    result = {
        "decks": [dict(d) for d in decks],
        "cards": [dict(c) for c in cards]
    }
    return result

class CardUpdate(BaseModel):
    interval: float
    repetition: int
    ease: float
    next_review: int

@app.patch("/cards/{card_id}")
async def update_card(card_id: str, update: CardUpdate):
    query = """
    UPDATE cards 
    SET interval = :interval, repetition = :repetition, ease = :ease, next_review = :next_review
    WHERE id = :id
    """
    await database.execute(query, values={
        "id": card_id,
        "interval": update.interval,
        "repetition": update.repetition,
        "ease": update.ease,
        "next_review": update.next_review
    })
    return {"status": "updated", "id": card_id}

# --- TTS API ---

@app.get("/audio")
async def get_audio(
    word: str = Query(..., description="The word to generate audio for"),
    voice: str = Query("en-US-JennyNeural", description="Voice to use")
):
    """
    Fetch audio for a word. 
    1. Check DB cache.
    2. If missing, generate via Edge TTS.
    3. Save to DB.
    4. Return audio stream.
    """
    word = word.lower().strip()
    
    # 1. Check Cache
    query = "SELECT audio_data FROM audio_cache WHERE word = :word AND voice = :voice"
    cached_audio = await database.fetch_one(query=query, values={"word": word, "voice": voice})
    
    if cached_audio:
        return Response(content=cached_audio["audio_data"], media_type="audio/mpeg")

    # 2. Generate Audio
    try:
        communicate = edge_tts.Communicate(word, voice)
        audio_bytes = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_bytes += chunk["data"]
                
        if not audio_bytes:
             raise HTTPException(status_code=500, detail="Failed to generate audio")

        # 3. Save to DB
        insert_query = """
        INSERT INTO audio_cache (word, voice, audio_data) 
        VALUES (:word, :voice, :audio_data)
        """
        await database.execute(query=insert_query, values={"word": word, "voice": voice, "audio_data": audio_bytes})
        
        # 4. Return Audio
        return Response(content=audio_bytes, media_type="audio/mpeg")

    except Exception as e:
        print(f"Error generating TTS: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Deck Management (Delete & Rename) ---

@app.delete("/decks/{deck_id}")
async def delete_deck(deck_id: str):
    # 1. Delete all cards in deck
    await database.execute("DELETE FROM cards WHERE deck_id = :deck_id", values={"deck_id": deck_id})
    
    # 2. Delete deck
    await database.execute("DELETE FROM decks WHERE id = :id", values={"id": deck_id})
    
    return {"status": "deleted", "id": deck_id}

class DeckUpdate(BaseModel):
    name: str

@app.patch("/decks/{deck_id}")
async def update_deck(deck_id: str, deck: DeckUpdate):
    query = "UPDATE decks SET name = :name WHERE id = :id"
    await database.execute(query, values={"name": deck.name, "id": deck_id})
    return {"status": "updated", "id": deck_id, "name": deck.name}

@app.delete("/cards/{card_id}")
async def delete_card(card_id: str):
    query = "DELETE FROM cards WHERE id = :id"
    await database.execute(query, values={"id": card_id})
    return {"status": "deleted", "id": card_id}


