# My FlashTabs - Vocabulary Learning Chrome Extension

My FlashTabs is a Chrome Extension designed to help you learn vocabulary effectively using the Spaced Repetition System (SRS). Every time you open a new tab, a flashcard appears for you to review.

The project consists of:
1.  **Chrome Extension**: The user interface, replacing the New Tab screen.
2.  **Backend Server**: Provides high-quality Audio TTS (Text-to-Speech) and data storage.

## ✨ Core Features

-   **New Tab Override**: Replaces the default New Tab screen with a Flashcard.
-   **Default Review Mode**: The home screen initiates Review mode immediately, automatically aggregating words due for review from all active decks.
-   **Spaced Repetition (SRS)**: An intelligent algorithm calculates the optimal review time for each word (Easy, Good, Hard).
-   **High-Quality TTS**: Integrated Edge TTS generates natural-sounding pronunciation audio, which is automatically cached to avoid regeneration.
-   **Deck Management**:
    -   Create, rename, and delete Decks.
    -   Add new vocabulary to specific Decks.
    -   Enable/Disable Decks to focus on specific topics.
-   **Data Sync**: The extension works offline-first but can synchronize data with the Backend server.

## 🛠️ Installation Guide

### Requirements
-   Docker & Docker Compose (to run the Backend)
-   Google Chrome or Chromium-based browsers (Edge, Brave, Cốc Cốc...)

### Step 1: Start the Backend

The backend uses Docker to simplify installation.

1.  Open a terminal at the project's root directory.
2.  Run the following command:

    ```bash
    docker-compose up -d --build
    ```

3.  Wait until the containers (`backend_api`, `postgres_db`) are running successfully.
    -   The API will be available at: `http://localhost:8000`

### Step 2: Install the Extension

1.  Open Chrome browser.
2.  Go to: `chrome://extensions/`
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the `extension` folder within this project (e.g., `.../FlashCard/extension`).

## 📖 Usage Guide

1.  **Open a New Tab**: The extension will automatically display the Review screen.
2.  **Review**:
    -   Press **Space** or click "Show Answer" to reveal the meaning.
    -   Listen to the pronunciation automatically or click the speaker icon to replay.
    -   Select your retention level: **Easy (1)**, **Good (2)**, or **Hard (3)** using the mouse or corresponding number keys.
3.  **Dashboard (Manage)**:
    -   Click the **List Icon** (top right) to enter the Deck Manager.
    -   Here you can create new Decks, add vocabulary, and toggle Decks on/off.
4.  **Add Words**:
    -   Go to a specific Deck -> Enter user word and meaning -> Click Add.
    -   The Backend will automatically fetch and cache the pronunciation audio for the new word.

## 🏗️ Tech Stack

-   **Frontend**: Vanilla HTML, CSS, JavaScript (No framework, optimized for New Tab speed).
-   **Backend**: Python (FastAPI), Edge TTS.
-   **Database**: PostgreSQL.
-   **Infrastructure**: Docker.

---
*Personal project for learning purposes and building a custom English learning tool.*