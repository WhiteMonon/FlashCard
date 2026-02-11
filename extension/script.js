const API_URL = 'http://localhost:8000';

// View Containers
const viewDashboard = document.getElementById('view-dashboard');
const viewManage = document.getElementById('view-manage');
const viewReview = document.getElementById('view-review');
const viewSettings = document.getElementById('view-settings');
const views = [viewDashboard, viewManage, viewReview, viewSettings];

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
const detailDifficulty = document.getElementById('detail-difficulty');
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
const settingsBtn = document.getElementById('settings-btn');

// Settings Elements
const settingRetention = document.getElementById('setting-retention');
const retentionValueEl = document.getElementById('retention-value');
const settingLearningSteps = document.getElementById('setting-learning-steps');
const settingRelearningSteps = document.getElementById('setting-relearning-steps');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const resetSettingsBtn = document.getElementById('reset-settings-btn');

// State
let currentDeckId = null;
let currentDeck = null;
let currentCard = null;
let selectedCardId = null;
let fsrsSettings = getDefaultSettings();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
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
        settingsBtn.style.display = 'flex';
        currentDeckId = null; // Reset to "Review All" mode when going home
        renderReviewView();
    } else if (viewName === 'settings') {
        // Settings View
        viewSettings.classList.remove('hidden');
        homeBtn.style.display = 'flex';
        homeBtn.dataset.target = 'review';
        dashboardBtn.style.display = 'flex';
        settingsBtn.style.display = 'none'; // Đang ở Settings rồi
        renderSettingsView();
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
    settingsBtn.addEventListener('click', () => switchView('settings'));
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
            const rating = parseInt(e.target.dataset.rating);
            handleReview(rating);
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

    // Settings Events
    settingRetention.addEventListener('input', () => {
        retentionValueEl.textContent = `${settingRetention.value}%`;
    });
    saveSettingsBtn.addEventListener('click', saveSettings);
    resetSettingsBtn.addEventListener('click', resetSettings);

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

    // Hiển thị stability (ngày)
    const stability = card.stability || 0;
    detailInterval.textContent = stability >= 1
        ? `${stability.toFixed(1)}d`
        : `${(stability * 24).toFixed(1)}h`;

    // Hiển thị difficulty (1-10)
    detailDifficulty.textContent = (card.difficulty || 0).toFixed(1);

    // Lưu card id cho các action
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
            stability: 0,
            difficulty: 0,
            state: 0,
            reps: 0,
            step: 0,
            last_review: 0
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

    // Hiển thị interval preview trên các nút
    updateIntervalPreviews(card);

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

async function handleReview(grade) {
    if (!currentCard) return;

    const now = Date.now();

    // Dùng FSRS engine với settings để tính scheduling mới
    const updated = reviewCard(currentCard, grade, now, fsrsSettings);

    // Optimistic Update
    currentCard.stability = updated.stability;
    currentCard.difficulty = updated.difficulty;
    currentCard.state = updated.state;
    currentCard.reps = updated.reps;
    currentCard.step = updated.step;
    currentCard.last_review = updated.last_review;
    currentCard.next_review = updated.next_review;

    const intervalMs = updated.next_review - now;
    console.log(`[FSRS Review] Word: ${currentCard.word}`);
    console.log(`- Rating: ${grade} (1:Again, 2:Hard, 3:Good, 4:Easy)`);
    console.log(`- State: ${updated.state} (0:New, 1:Learning, 2:Review, 3:Relearning)`);
    console.log(`- Stability: ${updated.stability.toFixed(2)}d | Difficulty: ${updated.difficulty.toFixed(2)}`);
    console.log(`- Next Review: ${formatInterval(intervalMs)} (${new Date(updated.next_review).toLocaleString()})`);

    const data = await chrome.storage.local.get('cards');
    const updatedCards = data.cards.map(c => c.id === currentCard.id ? currentCard : c);
    await chrome.storage.local.set({ cards: updatedCards });

    // Gửi lên backend (fire and forget)
    fetch(`${API_URL}/cards/${currentCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            stability: updated.stability,
            difficulty: updated.difficulty,
            state: updated.state,
            reps: updated.reps,
            step: updated.step,
            last_review: updated.last_review,
            next_review: updated.next_review
        })
    }).catch(console.error);

    renderReviewView();
}

function showEmptyState() {
    cardEl.classList.add('hidden');
    emptyState.classList.remove('hidden');
}

// --- Settings Logic ---

/**
 * Load FSRS settings từ chrome.storage.local
 */
async function loadSettings() {
    try {
        const data = await chrome.storage.local.get('fsrsSettings');
        if (data.fsrsSettings) {
            fsrsSettings = { ...getDefaultSettings(), ...data.fsrsSettings };
        }
    } catch (e) {
        console.error('Lỗi load settings:', e);
    }
}

/**
 * Save settings hiện tại trên form vào chrome.storage.local
 */
async function saveSettings() {
    // Parse learning steps
    const learningSteps = parseSteps(settingLearningSteps.value);
    const relearningSteps = parseSteps(settingRelearningSteps.value);

    if (!learningSteps.length) {
        alert('Learning Steps không hợp lệ. Nhập các số cách nhau bằng dấu phẩy (vd: 1, 10)');
        return;
    }
    if (!relearningSteps.length) {
        alert('Relearning Steps không hợp lệ. Nhập các số cách nhau bằng dấu phẩy (vd: 10)');
        return;
    }

    fsrsSettings = {
        desiredRetention: parseInt(settingRetention.value) / 100,
        learningSteps: learningSteps,
        relearningSteps: relearningSteps,
    };

    await chrome.storage.local.set({ fsrsSettings });
    saveSettingsBtn.textContent = 'Saved ✓';
    setTimeout(() => { saveSettingsBtn.textContent = 'Save Settings'; }, 1500);
}

/**
 * Reset settings về mặc định
 */
async function resetSettings() {
    fsrsSettings = getDefaultSettings();
    await chrome.storage.local.set({ fsrsSettings });
    renderSettingsView();
}

/**
 * Render Settings view từ fsrsSettings hiện tại
 */
function renderSettingsView() {
    settingRetention.value = Math.round(fsrsSettings.desiredRetention * 100);
    retentionValueEl.textContent = `${Math.round(fsrsSettings.desiredRetention * 100)}%`;
    settingLearningSteps.value = fsrsSettings.learningSteps.join(', ');
    settingRelearningSteps.value = fsrsSettings.relearningSteps.join(', ');
}

/**
 * Parse chuỗi steps "1, 10, 30" thành array [1, 10, 30]
 */
function parseSteps(str) {
    return str.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
}

/**
 * Cập nhật interval preview trên các nút review
 */
function updateIntervalPreviews(card) {
    if (!card) return;
    const now = Date.now();
    const previews = previewIntervals(card, now, fsrsSettings);

    // Tìm tất cả nút review và thêm preview
    actionsEl.querySelectorAll('.btn-action').forEach(btn => {
        const rating = btn.dataset.rating;
        if (rating && previews[rating]) {
            // Lấy tên nút gốc (Easy, Good, Hard, Again)
            const label = btn.classList.contains('easy') ? 'Easy' :
                btn.classList.contains('good') ? 'Good' :
                    btn.classList.contains('hard') ? 'Hard' : 'Again';
            btn.innerHTML = `${label}<span class="interval-preview">${previews[rating]}</span>`;
        }
    });
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
        // Easy (rating=4)
        if (!meaningEl.classList.contains('hidden')) handleReview(4);
    } else if (e.code === 'Digit2') {
        // Good (rating=3)
        if (!meaningEl.classList.contains('hidden')) handleReview(3);
    } else if (e.code === 'Digit3') {
        // Hard (rating=2)
        if (!meaningEl.classList.contains('hidden')) handleReview(2);
    } else if (e.code === 'Digit4') {
        // Again (rating=1)
        if (!meaningEl.classList.contains('hidden')) handleReview(1);
    }
}
