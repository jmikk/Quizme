let deck = [];
// Flashcard State
let currentCardIndex = 0;
// Quiz State
let quizQuestions = [];
let currentQuizIndex = 0;
let score = 0;
let quizSettings = {};

// DOM Elements
const flashcard = document.getElementById('flashcard');
const termText = document.getElementById('term-text');
const defText = document.getElementById('def-text');
const counter = document.getElementById('counter');
const qContainer = document.getElementById('question-container');
const feedbackDiv = document.getElementById('feedback');
const nextQBtn = document.getElementById('next-question-btn');

// --- INITIALIZATION ---
async function loadDeck() {
    try {
        const response = await fetch('words.json');
        deck = await response.json();
        
        // Update max questions count in setup
        document.getElementById('q-count').max = deck.length;
        document.getElementById('max-q-note').textContent = `(Max: ${deck.length})`;
        document.getElementById('q-count').value = Math.min(5, deck.length);
        
        updateCard(); // Load first flashcard
    } catch (error) {
        console.error('Error loading deck:', error);
        termText.textContent = "Error loading words.";
    }
}

// --- NAVIGATION TABS ---
function switchMode(mode) {
    document.querySelectorAll('.mode-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active-mode'));

    if (mode === 'study') {
        document.getElementById('study-mode').classList.remove('hidden');
        document.getElementById('nav-study').classList.add('active-mode');
    } else if (mode === 'quiz') {
        document.getElementById('quiz-setup').classList.remove('hidden');
        document.getElementById('nav-quiz').classList.add('active-mode');
    }
}

// --- FLASHCARD LOGIC (Existing) ---
function updateCard() {
    if(deck.length === 0) return;
    const cardData = deck[currentCardIndex];
    flashcard.classList.remove('is-flipped');
    setTimeout(() => {
        termText.textContent = cardData.term;
        defText.textContent = cardData.definition;
        counter.textContent = `${currentCardIndex + 1} / ${deck.length}`;
    }, 150);
}

flashcard.addEventListener('click', () => flashcard.classList.toggle('is-flipped'));

document.getElementById('next-btn').addEventListener('click', () => {
    if (currentCardIndex < deck.length - 1) { currentCardIndex++; updateCard(); }
});
document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentCardIndex > 0) { currentCardIndex--; updateCard(); }
});
document.getElementById('shuffle-btn').addEventListener('click', () => {
    deck.sort(() => Math.random() - 0.5);
    currentCardIndex = 0;
    updateCard();
});

// --- QUIZ LOGIC ---

function startQuiz() {
    // 1. Get Settings
    const qCount = parseInt(document.getElementById('q-count').value);
    const answerWith = document.getElementById('answer-with').value; // 'term', 'def', 'mixed'
    const types = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value);

    if (types.length === 0) { alert("Please select at least one question type."); return; }

    // 2. Prepare Question Pool
    // Shuffle deck and slice to qCount
    let pool = [...deck].sort(() => Math.random() - 0.5).slice(0, qCount);
    
    quizQuestions = pool.map(item => {
        // Determine question type randomly from selected types
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Determine Question/Answer direction
        let mode = answerWith;
        if (mode === 'mixed') mode = Math.random() > 0.5 ? 'term' : 'def';

        const questionText = mode === 'def' ? item.term : item.definition;
        const correctAnswer = mode === 'def' ? item.definition : item.term;
        
        return {
            type: type,
            question: questionText,
            correct: correctAnswer,
            originalItem: item,
            mode: mode // 'term' means user must provide term, 'def' means user must provide definition
        };
    });

    // 3. Reset State
    currentQuizIndex = 0;
    score = 0;
    document.getElementById('quiz-setup').classList.add('hidden');
    document.getElementById('quiz-active').classList.remove('hidden');
    showNextQuestion();
}

function showNextQuestion() {
    if (currentQuizIndex >= quizQuestions.length) {
        endQuiz();
        return;
    }

    const qData = quizQuestions[currentQuizIndex];
    document.getElementById('quiz-progress').textContent = `Question ${currentQuizIndex + 1}/${quizQuestions.length}`;
    document.getElementById('quiz-score').textContent = `Score: ${score}`;
    
    // Clear previous
    qContainer.innerHTML = '';
    feedbackDiv.classList.add('hidden');
    feedbackDiv.className = ''; 
    nextQBtn.classList.add('hidden');

    // Render based on type
    const card = document.createElement('div');
    card.className = 'question-card';
    
    const prompt = document.createElement('span');
    prompt.className = 'q-prompt';
    prompt.textContent = qData.question;
    card.appendChild(prompt);

    if (qData.type === 'multiple') {
        renderMultipleChoice(qData, card);
    } else if (qData.type === 'tf') {
        renderTrueFalse(qData, card);
    } else if (qData.type === 'writing') {
        renderWriting(qData, card);
    }

    qContainer.appendChild(card);
}

// -- Generators --

function renderMultipleChoice(qData, container) {
    // Get distractors
    const distractors = deck
        .filter(item => item !== qData.originalItem)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(item => qData.mode === 'def' ? item.definition : item.term);
    
    const options = [qData.correct, ...distractors].sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'mc-option';
        btn.textContent = opt;
        btn.onclick = () => checkAnswer(opt, qData.correct, btn);
        container.appendChild(btn);
    });
}

function renderTrueFalse(qData, container) {
    // 50% chance of being true
    const isTrue = Math.random() > 0.5;
    let displayAnswer = qData.correct;
    
    if (!isTrue) {
        // Find a wrong answer
        const randomWrong = deck.filter(i => i !== qData.originalItem)[0];
        if (randomWrong) {
            displayAnswer = qData.mode === 'def' ? randomWrong.definition : randomWrong.term;
        }
    }

    const displayText = document.createElement('p');
    displayText.style.fontStyle = "italic";
    displayText.textContent = `Is this the correct answer?\n\n"${displayAnswer}"`;
    container.appendChild(displayText);

    const btnTrue = document.createElement('button');
    btnTrue.textContent = "True";
    btnTrue.style.marginRight = "10px";
    btnTrue.onclick = () => checkAnswer(isTrue ? "True" : "False", "True", btnTrue); // Logic: User says True, if isTrue is true, correct.

    const btnFalse = document.createElement('button');
    btnFalse.textContent = "False";
    btnFalse.onclick = () => checkAnswer(isTrue ? "False" : "True", "True", btnFalse); 

    // Helper logic for TF: checkAnswer expects (userChoice, correctValue). 
    // If isTrue is true, correct answer is "True". 
    // If isTrue is false, correct answer is "False".
    
    // Re-bind clickers for clarity:
    btnTrue.onclick = () => checkAnswer("True", isTrue ? "True" : "False", btnTrue);
    btnFalse.onclick = () => checkAnswer("False", isTrue ? "True" : "False", btnFalse);

    container.appendChild(btnTrue);
    container.appendChild(btnFalse);
}

function renderWriting(qData, container) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'writing-input';
    input.placeholder = 'Type your answer...';
    
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit';
    submitBtn.onclick = () => checkAnswer(input.value, qData.correct, input);

    // Allow Enter key
    input.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            submitBtn.click();
        }
    });

    container.appendChild(input);
    container.appendChild(submitBtn);
}

// -- Grading --

function checkAnswer(userAnswer, correctAnswer, element) {
    // Disable all buttons in container
    const buttons = qContainer.querySelectorAll('button');
    buttons.forEach(b => b.disabled = true);
    if(element.tagName === 'INPUT') element.disabled = true;

    // Normalize for Writing (ignore case/spacing)
    const cleanUser = userAnswer.toString().trim().toLowerCase();
    const cleanCorrect = correctAnswer.toString().trim().toLowerCase();
    
    const isCorrect = cleanUser === cleanCorrect;

    if (isCorrect) {
        score++;
        feedbackDiv.textContent = "Correct!";
        feedbackDiv.className = 'feedback-correct';
        if(element.className.includes('mc-option')) element.classList.add('correct');
    } else {
        feedbackDiv.innerHTML = `Incorrect.<br>Correct answer: <strong>${correctAnswer}</strong>`;
        feedbackDiv.className = 'feedback-wrong';
        if(element.className.includes('mc-option')) element.classList.add('wrong');
        
        // If MC, highlight the correct one
        if(element.className.includes('mc-option') || element.className.includes('tf')) {
             const allOpts = qContainer.querySelectorAll('.mc-option');
             allOpts.forEach(opt => {
                 if(opt.textContent === correctAnswer) opt.classList.add('correct');
             });
        }
    }

    feedbackDiv.classList.remove('hidden');
    nextQBtn.classList.remove('hidden');
}

nextQBtn.addEventListener('click', () => {
    currentQuizIndex++;
    showNextQuestion();
});

function endQuiz() {
    document.getElementById('quiz-active').classList.add('hidden');
    document.getElementById('quiz-results').classList.remove('hidden');
    
    const percentage = Math.round((score / quizQuestions.length) * 100);
    document.getElementById('final-score').textContent = `${percentage}%`;
    
    const finalText = document.getElementById('final-text');
    if (percentage === 100) finalText.textContent = "Perfect score! You're a master.";
    else if (percentage >= 70) finalText.textContent = "Great job! Keep practicing.";
    else finalText.textContent = "Keep studying, you'll get there!";
}

// Initialize
loadDeck();
