const API_URL = 'http://localhost:8000';

const DEFAULT_VOCAB = [
    { id: '1', word: 'Hello', meaning: 'Xin chào', interval: 0, repetition: 0, ease: 2.5, nextReview: 0 },
    { id: '2', word: 'Computer', meaning: 'Máy tính', interval: 0, repetition: 0, ease: 2.5, nextReview: 0 },
    { id: '3', word: 'Software', meaning: 'Phần mềm', interval: 0, repetition: 0, ease: 2.5, nextReview: 0 },
    { id: '4', word: 'Database', meaning: 'Cơ sở dữ liệu', interval: 0, repetition: 0, ease: 2.5, nextReview: 0 },
    { id: '5', word: 'Network', meaning: 'Mạng', interval: 0, repetition: 0, ease: 2.5, nextReview: 0 }
];

// DOM Elements
const cardEl = document.getElementById('flashcard');
const wordEl = document.getElementById('word');
const meaningEl = document.getElementById('meaning');
const revealArea = document.getElementById('reveal-area');
const actionsEl = document.getElementById('actions');
const playBtn = document.getElementById('play-audio');
const emptyState = document.getElementById('empty-state');
const resetBtn = document.getElementById('reset-btn');
const dueCountEl = document.getElementById('due-count');
const revealBtn = document.getElementById('reveal-btn');

let currentCard = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadCards();
    setupEventListeners();
});

function setupEventListeners() {
    revealBtn.addEventListener('click', showAnswer);
    
    document.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ease = parseFloat(e.target.dataset.ease); // Using dataset as a proxy for difficulty multiplier
            handleReview(ease);
        });
    });

    playBtn.addEventListener('click', () => {
        if (currentCard) playAudio(currentCard.word);
    });

    resetBtn.addEventListener('click', async () => {
        await chrome.storage.local.set({ vocab: DEFAULT_VOCAB });
        location.reload();
    });
}

async function loadCards() {
    const data = await chrome.storage.local.get('vocab');
    let vocab = data.vocab;

    if (!vocab || vocab.length === 0) {
        vocab = DEFAULT_VOCAB;
        await chrome.storage.local.set({ vocab });
    }

    const now = Date.now();
    const dueCards = vocab.filter(card => card.nextReview <= now);
    
    dueCountEl.textContent = dueCards.length;

    if (dueCards.length > 0) {
        showCard(dueCards[0]);
    } else {
        showEmptyState();
    }
}

function showCard(card) {
    currentCard = card;
    wordEl.textContent = card.word;
    meaningEl.textContent = card.meaning;
    
    // Reset UI state
    meaningEl.classList.add('hidden');
    actionsEl.classList.add('hidden');
    revealArea.classList.remove('hidden');
    cardEl.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Auto play audio (optional, maybe distracting)
    // playAudio(card.word);
}

function showAnswer() {
    meaningEl.classList.remove('hidden');
    actionsEl.classList.remove('hidden');
    revealArea.classList.add('hidden');
    playAudio(currentCard.word);
}

function showEmptyState() {
    cardEl.classList.add('hidden');
    emptyState.classList.remove('hidden');
}

async function handleReview(difficultyMultiplier) {
    if (!currentCard) return;

    // Simple SRS Algorithm
    // difficultyMultiplier: 1 (Hard), 2.5 (Good), 4 (Easy)
    
    const now = Date.now();
    let interval = currentCard.interval; // in minutes

    if (difficultyMultiplier === 1) {
        interval = 1; // Reset to 1 minute if Hard
        currentCard.repetition = 0;
    } else {
        if (currentCard.repetition === 0) {
            interval = 1;
        } else if (currentCard.repetition === 1) {
            interval = 10;
        } else {
            interval = Math.round(interval * difficultyMultiplier);
        }
        currentCard.repetition += 1;
    }

    // Update next review time (convert minutes to ms)
    currentCard.nextReview = now + (interval * 60 * 1000);
    currentCard.interval = interval;
    currentCard.lastReview = now;

    // Save to storage
    const data = await chrome.storage.local.get('vocab');
    const updatedVocab = data.vocab.map(c => c.id === currentCard.id ? currentCard : c);
    
    await chrome.storage.local.set({ vocab: updatedVocab });

    // Load next card
    loadCards();
}

async function playAudio(word) {
    try {
        const url = `${API_URL}/audio?word=${encodeURIComponent(word)}`;
        const audio = new Audio(url);
        await audio.play();
    } catch (err) {
        console.error("Audio playback failed", err);
    }
}
