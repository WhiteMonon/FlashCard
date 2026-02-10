import asyncio
import os
import eng_to_ipa as ipa
from databases import Database

# Use localhost for running script from host machine, or override with env var
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://flashcard:flashcard123@localhost:5432/flashcard_db")

database = Database(DATABASE_URL)

async def main():
    print(f"Connecting to database: {DATABASE_URL}")
    try:
        await database.connect()
    except Exception as e:
        print(f"Failed to connect to DB: {e}")
        return

    print("Fetching cards without IPA...")
    # Fetch cards where ipa is NULL or empty string
    query_fetch = "SELECT id, word FROM cards WHERE ipa IS NULL OR ipa = ''"
    cards = await database.fetch_all(query_fetch)
    
    print(f"Found {len(cards)} cards to update.")
    
    count = 0
    for card in cards:
        word = card["word"]
        card_id = card["id"]
        
        # Generate IPA
        generated_ipa = ipa.convert(word)
        
        # Update DB
        query_update = "UPDATE cards SET ipa = :ipa WHERE id = :id"
        await database.execute(query_update, values={"ipa": generated_ipa, "id": card_id})
        
        print(f"Updated '{word}' -> /{generated_ipa}/")
        count += 1
        
    print(f"Done. Updated {count} cards.")
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
