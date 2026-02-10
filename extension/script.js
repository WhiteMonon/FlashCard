const API_URL = 'http://localhost:8000';

// View Containers
const viewDashboard = document.getElementById('view-dashboard');
const viewManage = document.getElementById('view-manage');
const viewReview = document.getElementById('view-review');
const views = [viewDashboard, viewManage, viewReview];

// Dashboard Elements
const deckGrid = document.getElementById('deck-grid');
const createDeckTrigger = document.getElementById('create-deck-trigger');

// Modal Elements
const createDeckModal = document.getElementById('create-deck-modal');
const closeCreateModalBtn = document.getElementById('close-create-modal');
const newDeckNameInput = document.getElementById('new-deck-name');
const confirmCreateDeckBtn = document.getElementById('confirm-create-deck-btn');

// Manage Deck Elements
const manageDeckTitle = document.getElementById('manage-deck-title');
const startReviewBtn = document.getElementById('start-review-btn');
const exportDeckBtn = document.getElementById('export-deck-btn');
const cardList = document.getElementById('card-list');
const cardCountBadge = document.getElementById('card-count-badge');

// Manage - Add Card
const inputWord = document.getElementById('input-word');
const inputMeaning = document.getElementById('input-meaning');
const addCardBtn = document.getElementById('add-card-btn');

// Manage - Card Details
const cardDetailsPanel = document.getElementById('card-details-panel');
const noSelectionMsg = document.getElementById('no-selection-msg');
const detailWord = document.getElementById('detail-word');
const detailIpa = document.getElementById('detail-ipa');
const detailMeaning = document.getElementById('detail-meaning');
const detailNextReview = document.getElementById('detail-next-review');
const detailInterval = document.getElementById('detail-interval');
const detailEase = document.getElementById('detail-ease');
const playAudioDetailBtn = document.getElementById('play-audio-detail');
const deleteCardBtn = document.getElementById('delete-card-btn');

// Review Elements
const cardEl = document.getElementById('flashcard');
const wordEl = document.getElementById('word');
const ipaEl = document.getElementById('ipa');
const meaningEl = document.getElementById('meaning');
const revealArea = document.getElementById('reveal-area');
const actionsEl = document.getElementById('actions');
const playBtn = document.getElementById('play-audio');
const emptyState = document.getElementById('empty-state');
const dueCountEl = document.getElementById('due-count');
const revealBtn = document.getElementById('reveal-btn');
const backToHomeBtn = document.getElementById('back-to-home-btn');

// Top Bar
const homeBtn = document.getElementById('home-btn');
const dashboardBtn = document.getElementById('dashboard-btn');

// State
let currentDeckId = null;
let currentDeck = null;
let currentCard = null;
let selectedCardId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await fsync();

    // Setup Global Event Listeners (Event Delegation)
    setupEventListeners();

    // Default View: Home (Review)
    switchView('review');
});

// --- Navigation ---
function switchView(viewName) {
    views.forEach(v => v.classList.add('hidden'));

    if (viewName === 'dashboard') {
        // Deck Manager View
        viewDashboard.classList.remove('hidden');
        homeBtn.style.display = 'flex'; // Back to Home (Review)
        homeBtn.dataset.target = 'review';
        dashboardBtn.style.display = 'none'; // Already here
        renderDashboard();
    } else if (viewName === 'manage') {
        // Deck Details View
        viewManage.classList.remove('hidden');
        homeBtn.style.display = 'flex'; // Back to Deck Manager
        homeBtn.dataset.target = 'dashboard';
        dashboardBtn.style.display = 'flex'; // Access to Deck Manager root
        renderManageView();
    } else if (viewName === 'review') {
        // Home View (Default)
        viewReview.classList.remove('hidden');
        homeBtn.style.display = 'none'; // No Back Button on Home
        dashboardBtn.style.display = 'flex'; // Go to Deck Manager
        currentDeckId = null; // Reset to "Review All" mode when going home
        renderReviewView();
    }
}

// Global Click Handlers (Delegation)
function setupEventListeners() {
    // Navigation
    homeBtn.addEventListener('click', () => {
        const target = homeBtn.dataset.target || 'dashboard';
        switchView(target);
    });

    dashboardBtn.addEventListener('click', () => switchView('dashboard'));
    backToHomeBtn.addEventListener('click', () => switchView('dashboard'));

    // Dashboard: Deck List Delegation
    deckGrid.addEventListener('click', (e) => {
        const deckCard = e.target.closest('.deck-card');
        if (!deckCard || deckCard.classList.contains('create-deck-card')) return;

        // Check for specific actions
        if (e.target.closest('.switch')) return; // Ignore switch clicks (handled by change event)
        if (e.target.closest('.btn-rename')) {
            const id = e.target.closest('.btn-rename').dataset.id;
            const name = e.target.closest('.btn-rename').dataset.name;
            renameDeck(id, name);
            return;
        }
        if (e.target.closest('.btn-delete')) {
            const id = e.target.closest('.btn-delete').dataset.id;
            const name = e.target.closest('.btn-delete').dataset.name;
            deleteDeck(id, name);
            return;
        }

        // Open Deck
        const deckId = deckCard.dataset.id;
        if (deckId) openDeck(deckId);
    });

    // Dashboard: Toggle Active Switch Delegation
    deckGrid.addEventListener('change', (e) => {
        if (e.target.matches('.deck-active-switch')) {
            const deckId = e.target.dataset.id;
            toggleDeckActive(deckId, e.target.checked);
        }
    });

    // Manage: Card List Delegation
    cardList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li && li.dataset.id) {
            const cardId = li.dataset.id;
            const card = getCardById(cardId);
            if (card) selectCard(card);
        }
    });

    // Manage: Buttons
    startReviewBtn.addEventListener('click', () => {
        // Keep currentDeckId as is (set in openDeck)
        switchView('review');
    });
    exportDeckBtn.addEventListener('click', exportDeck);
    addCardBtn.addEventListener('click', handleAddCard);
    deleteCardBtn.addEventListener('click', handleDeleteCard);
    playAudioDetailBtn.addEventListener('click', () => {
        const word = detailWord.textContent;
        if (word) playAudio(word);
    });

    // Review: Buttons
    revealBtn.addEventListener('click', toggleFlashcard);
    playBtn.addEventListener('click', () => {
        if (currentCard) playAudio(currentCard.word);
    });

    actionsEl.addEventListener('click', (e) => {
        if (e.target.matches('.btn-action')) {
            const ease = parseFloat(e.target.dataset.ease);
            handleReview(ease);
        }
    });

    // Create Deck Modal
    createDeckTrigger.addEventListener('click', () => {
        createDeckModal.classList.remove('hidden');
        newDeckNameInput.focus();
    });
    closeCreateModalBtn.addEventListener('click', () => createDeckModal.classList.add('hidden'));
    window.addEventListener('click', (e) => {
        if (e.target == createDeckModal) createDeckModal.classList.add('hidden');
    });
    confirmCreateDeckBtn.addEventListener('click', handleCreateDeck);

    // Keyboard Shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// --- Data Helpers ---
let cachedCards = [];
async function loadCards() {
    const data = await chrome.storage.local.get('cards');
    cachedCards = data.cards || [];
    return cachedCards;
}
function getCardById(id) {
    return cachedCards.find(c => c.id === id);
}

// --- Dashboard Logic ---
async function renderDashboard() {
    const data = await chrome.storage.local.get(['decks', 'cards']);
    const decks = data.decks || [];
    cachedCards = data.cards || [];
    const cards = cachedCards;

    // Clear grid but keep create button
    Array.from(deckGrid.children).forEach(child => {
        if (!child.classList.contains('create-deck-card')) {
            child.remove();
        }
    });

    decks.forEach(deck => {
        const deckCards = cards.filter(c => c.deck_id === deck.id);
        const dueCount = deckCards.filter(c => (c.next_review || 0) <= Date.now()).length;
        const isActive = deck.active !== false;

        const el = document.createElement('div');
        el.className = `deck-card ${isActive ? '' : 'inactive'}`;
        el.dataset.id = deck.id;

        // Correctly escaping for data attributes
        const safeName = deck.name.replace(/"/g, '&quot;');

        el.innerHTML = `
            <div class="deck-header-row">
                <div class="switch-container" title="${isActive ? 'Disable Deck' : 'Enable Deck'}">
                    <label class="switch">
                        <input type="checkbox" class="deck-active-switch" data-id="${deck.id}" ${isActive ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <div class="deck-actions">
                     <button class="btn-icon small secondary btn-rename" title="Rename Deck" data-id="${deck.id}" data-name="${safeName}">
                        <svg class="icon" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button class="btn-icon small danger-icon btn-delete" title="Delete Deck" data-id="${deck.id}" data-name="${safeName}">
                        <svg class="icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            </div>
            <div class="deck-icon">📚</div>
            <div class="deck-info">
                <h3>${deck.name}</h3>
                <p>${deckCards.length} cards · <span style="color:var(--primary-color)">${dueCount} due</span></p>
            </div>
        `;

        deckGrid.insertBefore(el, createDeckTrigger);
    });
}

function openDeck(deckId) {
    currentDeckId = deckId;
    chrome.storage.local.get('decks').then(data => {
        currentDeck = data.decks.find(d => d.id === deckId);
        switchView('manage');
    });
}

async function toggleDeckActive(deckId, isActive) {
    const data = await chrome.storage.local.get('decks');
    const decks = data.decks || [];
    const updatedDecks = decks.map(d => {
        if (d.id === deckId) return { ...d, active: isActive };
        return d;
    });

    await chrome.storage.local.set({ decks: updatedDecks });
    renderDashboard();
}

async function renameDeck(deckId, currentName) {
    const newName = prompt("Enter new deck name:", currentName);
    if (!newName || newName.trim() === "" || newName === currentName) return;

    try {
        const res = await fetch(`${API_URL}/decks/${deckId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() })
        });

        if (res.ok) {
            await fsync();
            renderDashboard();
        } else {
            alert("Failed to rename deck");
        }
    } catch (e) {
        console.error("Rename deck failed", e);
        alert("Error renaming deck");
    }
}

async function deleteDeck(deckId, deckName) {
    if (!confirm(`Are you sure you want to delete deck "${deckName}"?\nThis will remove all cards in it.`)) return;

    try {
        const res = await fetch(`${API_URL}/decks/${deckId}`, { method: 'DELETE' });
        if (res.ok) {
            await fsync();
            renderDashboard();
        } else {
            alert("Failed to delete deck");
        }
    } catch (e) {
        console.error("Delete deck failed", e);
        alert("Error deleting deck");
    }
}

async function handleCreateDeck() {
    const name = newDeckNameInput.value.trim();
    if (!name) return;

    confirmCreateDeckBtn.textContent = "Creating...";
    confirmCreateDeckBtn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/decks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, cards: [] })
        });

        if (res.ok) {
            await fsync();
            createDeckModal.classList.add('hidden');
            newDeckNameInput.value = '';
            renderDashboard();
        }
    } catch (e) {
        alert("Error creating deck");
        console.error(e);
    } finally {
        confirmCreateDeckBtn.textContent = "Create Deck";
        confirmCreateDeckBtn.disabled = false;
    }
}


// --- Manage View Logic ---
async function renderManageView() {
    if (!currentDeck) return;
    manageDeckTitle.textContent = currentDeck.name;

    const cards = await loadCards();
    const deckCards = cards.filter(c => c.deck_id === currentDeckId);

    cardCountBadge.textContent = `${deckCards.length} cards`;

    cardList.innerHTML = '';
    const sortedCards = deckCards.slice().reverse();

    sortedCards.forEach(card => {
        const li = document.createElement('li');
        li.dataset.id = card.id;
        li.innerHTML = `<span><b>${card.word}</b></span>`;
        if (selectedCardId === card.id) {
            li.classList.add('active');
        }
        cardList.appendChild(li);
    });

    if (selectedCardId) {
        const card = sortedCards.find(c => c.id === selectedCardId);
        if (card) {
            showCardDetails(card);
        } else {
            selectedCardId = null;
            showNoSelection();
        }
    } else {
        showNoSelection();
    }
}

function selectCard(card) {
    selectedCardId = card.id;
    // Highlight in list
    Array.from(cardList.children).forEach(li => {
        if (li.dataset.id == card.id) li.classList.add('active');
        else li.classList.remove('active');
    });
    showCardDetails(card);
}

function showCardDetails(card) {
    noSelectionMsg.classList.add('hidden');
    cardDetailsPanel.classList.remove('hidden');

    detailWord.textContent = card.word;
    detailIpa.textContent = card.ipa ? `/${card.ipa}/` : '';
    detailMeaning.textContent = card.meaning;

    const nextReview = card.next_review ? new Date(card.next_review).toLocaleString() : 'Ready';
    detailNextReview.textContent = nextReview;

    const interval = card.interval ? card.interval : 0;
    detailInterval.textContent = interval >= 60 * 24
        ? `${Math.round(interval / (60 * 24))}d`
        : `${Math.round(interval / 60)}h`;

    detailEase.textContent = (card.ease || 2.5).toFixed(2);

    // Store current detail card id if needed for actions
    deleteCardBtn.dataset.id = card.id;
    deleteCardBtn.dataset.word = card.word;
}

function showNoSelection() {
    noSelectionMsg.classList.remove('hidden');
    cardDetailsPanel.classList.add('hidden');
}

async function handleDeleteCard() {
    const cardId = deleteCardBtn.dataset.id;
    const word = deleteCardBtn.dataset.word;
    if (!cardId) return;

    if (confirm(`Delete "${word}"?`)) {
        try {
            // Optimistic update
            const newCards = cachedCards.filter(c => c.id !== cardId);
            await chrome.storage.local.set({ cards: newCards });

            await fetch(`${API_URL}/cards/${cardId}`, { method: 'DELETE' });

            selectedCardId = null;
            renderManageView();
        } catch (e) {
            console.error("Delete failed", e);
            alert("Delete failed");
        }
    }
}

async function handleAddCard() {
    if (!currentDeckId) {
        alert("Error: No deck selected.");
        return;
    }

    const word = inputWord.value.trim();
    const meaning = inputMeaning.value.trim();

    if (!word || !meaning) {
        alert("Please enter both Word and Meaning");
        return;
    }

    addCardBtn.textContent = "Adding...";
    addCardBtn.disabled = true;

    try {
        const newCards = [{
            word: word,
            meaning: meaning,
            next_review: Date.now(),
            interval: 0,
            repetition: 0,
            ease: 2.5
        }];

        const res = await fetch(`${API_URL}/decks/${currentDeckId}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCards)
        });

        if (res.ok) {
            // Prefetch audio
            fetch(`${API_URL}/audio?word=${encodeURIComponent(word)}&voice=en-US-JennyNeural`).catch(console.error);

            inputWord.value = '';
            inputMeaning.value = '';
            inputWord.focus();

            await fsync();

            // Auto-select new card
            const cards = await loadCards();
            const created = cards.find(c => c.word === word && c.meaning === meaning);
            if (created) selectedCardId = created.id;

            renderManageView();
        } else {
            alert("Failed to add card: Server error " + res.status);
        }
    } catch (e) {
        alert("Failed to add card: " + e.message);
    } finally {
        addCardBtn.textContent = "Add";
        addCardBtn.disabled = false;
    }
}

async function exportDeck() {
    if (!currentDeck) return;
    const cards = await loadCards();
    const deckCards = cards.filter(c => c.deck_id === currentDeck.id);

    const exportData = {
        deck: currentDeck,
        cards: deckCards,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDeck.name.replace(/\s+/g, '_')}_export.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}


// --- Review Logic ---
async function renderReviewView() {
    const data = await chrome.storage.local.get(['cards', 'decks']);
    const allCards = data.cards || [];
    const decks = data.decks || [];

    let deckCards = [];

    if (currentDeckId) {
        // Mode: Review specific deck (from Manager -> Start Review)
        const currentDeckObj = decks.find(d => d.id === currentDeckId);
        if (!currentDeckObj || currentDeckObj.active === false) {
            // If deck is inactive/deleted, show empty state with message
            dueCountEl.textContent = '0';
            showEmptyState();
            document.querySelector('#empty-state .meaning').textContent = "This deck is currently inactive.";
            return;
        }
        deckCards = allCards.filter(c => c.deck_id === currentDeckId);

        // Update Back button for specific review mode
        homeBtn.style.display = 'flex';
        homeBtn.dataset.target = 'manage'; // Go back to manage page of this deck
    } else {
        // Mode: Review All (Home)
        const activeDeckIds = decks.filter(d => d.active !== false).map(d => d.id);
        deckCards = allCards.filter(c => activeDeckIds.includes(c.deck_id));

        // Ensure Home UI state
        homeBtn.style.display = 'none'; // Root view
    }

    const now = Date.now();
    const dueCards = deckCards.filter(c => (c.next_review || 0) <= now);

    dueCountEl.textContent = dueCards.length;
    document.querySelector('#empty-state .meaning').textContent = "You've reviewed all cards for now.";

    if (dueCards.length > 0) {
        showCard(dueCards[0]);
    } else {
        showEmptyState();
    }
}

function showCard(card) {
    currentCard = card;
    wordEl.textContent = card.word;
    ipaEl.textContent = card.ipa ? `/${card.ipa}/` : '';
    if (card.ipa) ipaEl.classList.remove('hidden'); else ipaEl.classList.add('hidden');
    meaningEl.textContent = card.meaning;

    meaningEl.classList.add('hidden');
    actionsEl.classList.add('hidden');
    revealArea.classList.remove('hidden');

    cardEl.classList.remove('hidden');
    emptyState.classList.add('hidden');

    playAudio(card.word);
}

function toggleFlashcard() {
    if (cardEl.classList.contains('is-flipping')) return;
    cardEl.classList.add('is-flipping');

    setTimeout(() => {
        if (meaningEl.classList.contains('hidden')) {
            meaningEl.classList.remove('hidden');
            actionsEl.classList.remove('hidden');
            revealArea.classList.add('hidden');
        } else {
            meaningEl.classList.add('hidden');
            actionsEl.classList.add('hidden');
            revealArea.classList.remove('hidden');
            playAudio(currentCard.word);
        }
        cardEl.classList.remove('is-flipping');
    }, 200);
}

async function handleReview(difficultyMultiplier) {
    if (!currentCard) return;

    const now = Date.now();
    let interval = currentCard.interval || 0;
    let repetition = currentCard.repetition || 0;
    let ease = currentCard.ease || 2.5;

    if (difficultyMultiplier === 1) { // Hard
        interval = 1;
        repetition = 0;
    } else {
        if (repetition === 0) {
            interval = 1;
        } else if (repetition === 1) {
            interval = 10;
        } else {
            interval = Math.round(interval * ease);
        }
        repetition += 1;
    }

    const nextReview = now + (interval * 60 * 1000);

    // Optimistic Update
    currentCard.interval = interval;
    currentCard.repetition = repetition;
    currentCard.ease = ease;
    currentCard.next_review = nextReview;

    const data = await chrome.storage.local.get('cards');
    const updatedCards = data.cards.map(c => c.id === currentCard.id ? currentCard : c);
    await chrome.storage.local.set({ cards: updatedCards });

    fetch(`${API_URL}/cards/${currentCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            interval, repetition, ease, next_review: nextReview
        })
    }).catch(console.error);

    renderReviewView();
}

function showEmptyState() {
    cardEl.classList.add('hidden');
    emptyState.classList.remove('hidden');
}

// --- Shared Logic ---
async function fsync() {
    try {
        const res = await fetch(`${API_URL}/sync`);
        if (res.ok) {
            const data = await res.json();
            await chrome.storage.local.set({
                decks: data.decks,
                cards: data.cards
            });
        }
    } catch (e) {
        console.error("Sync failed", e);
    }
}

async function playAudio(word) {
    try {
        const url = `${API_URL}/audio?word=${encodeURIComponent(word)}`;
        const audio = new Audio(url);
        await audio.play();
    } catch (err) {
        console.log("Audio play error", err);
    }
}

function handleKeyboardShortcuts(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (viewReview.classList.contains('hidden')) return;

    if (e.code === 'Space') {
        if (!cardEl.classList.contains('hidden')) {
            e.preventDefault();
            toggleFlashcard();
        }
    } else if (e.code === 'Digit1') {
        if (!meaningEl.classList.contains('hidden')) handleReview(4);
    } else if (e.code === 'Digit2') {
        if (!meaningEl.classList.contains('hidden')) handleReview(2.5);
    } else if (e.code === 'Digit3') {
        if (!meaningEl.classList.contains('hidden')) handleReview(1);
    }
}
