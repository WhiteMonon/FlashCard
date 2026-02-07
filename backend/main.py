import os
import io
import edge_tts
from fastapi import FastAPI, UploadFile, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from databases import Database
from sqlalchemy import create_engine
from contextlib import asynccontextmanager
import models

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
    
    # create_index_query
    await database.execute("CREATE INDEX IF NOT EXISTS idx_audio_cache_word_voice ON audio_cache (word, voice);")
    
    yield
    # Shutdown
    await database.disconnect()

app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For extension
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "FlashCard TTS Backend Running"}

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
