let deck = [];
let currentCardIndex = 0;

const flashcard = document.getElementById('flashcard');
const termText = document.getElementById('term-text');
const defText = document.getElementById('def-text');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const counter = document.getElementById('counter');
const shuffleBtn = document.getElementById('shuffle-btn');

// 1. Fetch data from the JSON file
async function loadDeck() {
    try {
        const response = await fetch('words.json');
        deck = await response.json();
        updateCard();
    } catch (error) {
        console.error('Error loading deck:', error);
        termText.textContent = "Error loading words.";
    }
}

// 2. Update the visual card
function updateCard() {
    const cardData = deck[currentCardIndex];
    
    // Reset flip state to front when changing cards
    flashcard.classList.remove('is-flipped');
    
    // Small timeout to allow the flip to reset before changing text
    setTimeout(() => {
        termText.textContent = cardData.term;
        defText.textContent = cardData.definition;
        counter.textContent = `${currentCardIndex + 1} / ${deck.length}`;
    }, 150);
}

// 3. Flip interaction
flashcard.addEventListener('click', () => {
    flashcard.classList.toggle('is-flipped');
});

// 4. Navigation
nextBtn.addEventListener('click', () => {
    if (currentCardIndex < deck.length - 1) {
        currentCardIndex++;
        updateCard();
    }
});

prevBtn.addEventListener('click', () => {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        updateCard();
    }
});

// 5. Shuffle Logic
shuffleBtn.addEventListener('click', () => {
    // Fisher-Yates shuffle algorithm
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    currentCardIndex = 0;
    updateCard();
});

// Initialize
loadDeck();
