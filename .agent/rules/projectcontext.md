---
trigger: always_on
---

# PROJECT CONTEXT — MY FLASHTABS (EXTENSION + TTS BACKEND)

==================================================
1. PROJECT OVERVIEW
==================================================

Project Name: FlashCard
Goal: Chrome Extension học từ vựng + phát âm TTS + lưu audio cache backend.

System gồm 2 phần:

1. Chrome Extension (Frontend UI + Review Logic)
2. Backend Container (TTS + Audio Cache + Database)

System này phải:
- Không mất dữ liệu khi đổi browser
- Cache audio TTS để không generate lại
- Có thể scale thành SaaS sau nếu cần


==================================================
2. GLOBAL ARCHITECTURE
==================================================

Chrome Extension
    ↓ REST API
Backend API (FastAPI - Docker)
    ↓
Edge TTS Generator
    ↓
PostgreSQL (Audio + Metadata)


==================================================
3. CHROME EXTENSION SPEC
==================================================

Type:
Chrome Extension Manifest V3

Tech Rules:
- Vanilla HTML
- Vanilla CSS
- Vanilla JavaScript (ES6)
- No framework
- No build tools
- No external CDN

Permissions:
- storage
- tabs

New Tab Override:
index.html


--------------------------------------------------
Extension Responsibilities
--------------------------------------------------

UI:
- Flashcard display
- Empty state UI
- Play audio button

Storage:
- chrome.storage.local chỉ lưu:
  - vocabulary metadata
  - review state
  - NOT audio data

Audio:
- Fetch audio từ backend API
- Play bằng HTML Audio


--------------------------------------------------
Extension Data Schema
--------------------------------------------------

Vocabulary object:

{
  id: string,
  word: string,
  meaning: string,

  createdAt: number,
  lastReview: number,
  nextReview: number,

  interval: number,
  repetition: number,
  ease: number
}


--------------------------------------------------
Extension Review Logic
--------------------------------------------------

Load vocabulary → filter nextReview <= now

IF no word due:
  Show "All done"

ELSE:
  Show flashcard

After review:
  Update interval
  Update nextReview
  Save chrome.storage.local


==================================================
4. BACKEND SPEC
==================================================

Language:
Python

Framework:
FastAPI

Container:
Docker

TTS Engine:
edge-tts (Python)

Database:
PostgreSQL


==================================================
5. BACKEND RESPONSIBILITIES
==================================================

Backend must:

1. Generate TTS audio using Edge TTS
2. Cache audio in database
3. Return audio stream to extension
4. Avoid generating same audio twice


==================================================
6. API DESIGN
==================================================

GET /audio

Query:
word=string
voice=string

Response:
audio/mpeg stream


Logic:

IF audio exists in DB:
    return audio

ELSE:
    generate via Edge TTS
    save DB
    return audio


==================================================
7. DATABASE SCHEMA
==================================================

Table: audio_cache

Columns:
id (uuid)
word (text)
voice (text)
audio_data (bytea)
created_at (timestamp)

Index:
(word, voice)


==================================================
8. EDGE TTS GENERATION RULES
==================================================

Default Voice:
en-US-JennyNeural

Audio Format:
mp3


==================================================
9. DOCKER SETUP
==================================================

Services:

backend_api
postgres_db

Optional future:
minio object storage


==================================================
10. PERFORMANCE RULES
==================================================

Must:
- Cache audio forever
- Never regenerate same word + voice
- Stream audio response (not base64)


==================================================
11. SECURITY (MINIMAL FOR PERSONAL USE)
==================================================

Allow:
Local network access

No auth required initially


==================================================
12. FUTURE EXTENSION CAPABILITY
==================================================

System must be extendable to support:

- User accounts
- Cloud sync vocab
- Multiple voices
- Mobile app client
- SaaS deployment


==================================================
13. SUCCESS CRITERIA
==================================================

System is correct if:

1. Extension loads with no error
2. Review logic works
3. Audio plays from backend
4. Audio cached after first generation
5. Changing browser does NOT lose vocab/audio


==================================================
END CONTEXT
==================================================