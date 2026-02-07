---
description: main workflow
---

==================================================
MASTER WORKFLOW — FlashCard
==================================================

USER opens New Tab
    ↓
Extension loads vocabulary from chrome.storage.local
    ↓
Filter vocab where nextReview <= current_time

IF no vocab due:
    Show "All Done" UI
    STOP

ELSE:
    Show Flashcard
    ↓
    User performs review OR plays audio


--------------------------------------------------
REVIEW FLOW
--------------------------------------------------

User selects rating (Again / Hard / Good / Easy)
    ↓
Extension updates:
    interval
    repetition
    ease
    nextReview
    ↓
Save updated vocab → chrome.storage.local


--------------------------------------------------
AUDIO PLAY FLOW
--------------------------------------------------

User clicks Play Audio
    ↓
Extension sends request:

GET /audio?word={word}&voice={voice}

    ↓
Backend receives request
    ↓
Normalize input:
    lowercase(word)
    trim(word)

    ↓
Query PostgreSQL:
SELECT audio_data FROM audio_cache
WHERE word = normalized_word
AND voice = voice


--------------------------------------------------
CACHE HIT FLOW
--------------------------------------------------

IF audio exists in DB:
    ↓
Stream audio/mpeg response
    ↓
Extension plays audio using HTML Audio


--------------------------------------------------
CACHE MISS FLOW
--------------------------------------------------

IF audio NOT exists:
    ↓
Generate TTS using Edge TTS
    ↓
Save audio to PostgreSQL:
    word
    voice
    audio_data
    created_at
    ↓
Stream audio response
    ↓
Extension plays audio


--------------------------------------------------
DATA PERSISTENCE RULES
--------------------------------------------------

Extension stores:
- Vocabulary metadata
- Review state

Backend stores:
- Audio binary cache
- Audio metadata

Audio is NEVER stored in Extension storage.


--------------------------------------------------
SYSTEM STARTUP FLOW
--------------------------------------------------

Docker Compose Up
    ↓
Start PostgreSQL
    ↓
Start FastAPI Backend
    ↓
Extension connects via REST API


--------------------------------------------------
FAILURE HANDLING
--------------------------------------------------

IF TTS generation fails:
    Backend returns HTTP 500
    ↓
Extension shows:
    "Audio unavailable"


--------------------------------------------------
FUTURE EXTENSION READY (DESIGN GUARANTEE)
--------------------------------------------------

System supports future addition of:
- User accounts
- Cloud vocab sync
- Multiple TTS voices
- Mobile client
- SaaS deployment
- Object storage migration (S3 / MinIO)


==================================================
END MASTER WORKFLOW
==================================================