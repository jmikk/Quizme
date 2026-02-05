let deck = [];
let currentCardIndex = 0;
let quizQuestions = [];
let currentQuizIndex = 0;
let score = 0;

// DOM Elements
const flashcard = document.getElementById('flashcard');
const termText = document.getElementById('term-text');
const defText = document.getElementById('def-text');
const counter = document.getElementById('counter');
const qContainer = document.getElementById('question-container');
const feedbackDiv = document.getElementById('feedback');
const nextQBtn = document.getElementById('next-question-btn');
const progressBar = document.getElementById('quiz-progress-bar');

// --- INITIALIZATION ---
async function loadDeck() {
    try {
        const response = await fetch('words.json');
        deck = await response.json();
        
        // Setup Max Limits
        document.getElementById('q-count').max = deck.length;
        document.getElementById('max-q-note').textContent = `(Max available: ${deck.length})`;
        document.getElementById('q-count').value = Math.min(5, deck.length);
        
        updateCard(); 
    } catch (error) {
        console.error('Error loading deck:', error);
        termText.textContent = "Error loading words.json";
        defText.textContent = "Please ensure words.json exists.";
    }
}

// --- NAVIGATION ---
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

// --- FLASHCARDS ---
function updateCard() {
    if(deck.length === 0) return;
    const cardData = deck[currentCardIndex];
    flashcard.classList.remove('is-flipped');
    
    // Wait for flip back
    setTimeout(() => {
        termText.textContent = cardData.term;
        defText.textContent = cardData.definition;
        counter.textContent = `${currentCardIndex + 1} / ${deck.length}`;
    }, 200);
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
    const qCount = parseInt(document.getElementById('q-count').value);
    const answerWith = document.getElementById('answer-with').value;
    const types = Array.from(document.querySelectorAll('.checkbox-grid input:checked')).map(cb => cb.value);

    if (types.length === 0) { alert("Please select at least one question type."); return; }

    // Generate Pool
    let pool = [...deck].sort(() => Math.random() - 0.5).slice(0, qCount);
    
    quizQuestions = pool.map(item => {
        const type = types[Math.floor(Math.random() * types.length)];
        let mode = answerWith;
        if (mode === 'mixed') mode = Math.random() > 0.5 ? 'term' : 'def';
        
        return {
            type: type,
            question: mode === 'def' ? item.term : item.definition,
            correct: mode === 'def' ? item.definition : item.term,
            originalItem: item,
            mode: mode
        };
    });

    currentQuizIndex = 0;
    score = 0;
    
    // UI Transitions
    document.getElementById('quiz-setup').classList.add('hidden');
    document.getElementById('quiz-active').classList.remove('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    
    showNextQuestion();
}

function showNextQuestion() {
    if (currentQuizIndex >= quizQuestions.length) {
        endQuiz();
        return;
    }

    const qData = quizQuestions[currentQuizIndex];
    
    // Update Header
    document.getElementById('quiz-progress-text').textContent = `Question ${currentQuizIndex + 1} of ${quizQuestions.length}`;
    document.getElementById('quiz-score').textContent = `Score: ${score}`;
    
    // Update Progress Bar
    const progressPercent = ((currentQuizIndex) / quizQuestions.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Clear Previous
    qContainer.innerHTML = '';
    feedbackDiv.classList.add('hidden');
    feedbackDiv.className = ''; 
    nextQBtn.classList.add('hidden');

    // Create Question Card
    const card = document.createElement('div');
    card.className = 'question-card';
    
    const label = document.createElement('div');
    label.className = 'q-label';
    label.textContent = qData.mode === 'term' ? 'Definition' : 'Term';
    card.appendChild(label);

    const text = document.createElement('div');
    text.className = 'q-text';
    text.textContent = qData.question;
    card.appendChild(text);

    const optionsContainer = document.createElement('div');
    
    if (qData.type === 'multiple') {
        optionsContainer.className = 'options-grid';
        renderMultipleChoice(qData, optionsContainer);
    } else if (qData.type === 'tf') {
        optionsContainer.className = 'tf-container';
        optionsContainer.style.display = 'flex';
        optionsContainer.style.gap = '1rem';
        renderTrueFalse(qData, optionsContainer);
    } else if (qData.type === 'writing') {
        renderWriting(qData, optionsContainer);
    }

    card.appendChild(optionsContainer);
    qContainer.appendChild(card);
}

function renderMultipleChoice(qData, container) {
    // Distractors
    const distractors = deck
        .filter(item => item !== qData.originalItem)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(item => qData.mode === 'def' ? item.definition : item.term);
    
    const options = [qData.correct, ...distractors].sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-card';
        btn.textContent = opt;
        btn.onclick = () => checkAnswer(opt, qData.correct, btn);
        container.appendChild(btn);
    });
}

function renderTrueFalse(qData, container) {
    const isTrue = Math.random() > 0.5;
    let displayAnswer = qData.correct;
    
    if (!isTrue) {
        const randomWrong = deck.filter(i => i !== qData.originalItem)[0];
        if (randomWrong) {
            displayAnswer = qData.mode === 'def' ? randomWrong.definition : randomWrong.term;
        }
    }

    // Append context to question text
    const qText = container.previousSibling; 
    qText.innerHTML += `<br><div style="font-size:1rem; margin-top:1.5rem; color:#586380; font-weight:normal;">Is this the correct answer?</div><div style="margin-top:0.5rem; color:var(--text-primary); font-weight:bold;">"${displayAnswer}"</div>`;

    const btnTrue = document.createElement('button');
    btnTrue.className = 'option-card'; // Reuse option styling
    btnTrue.style.flex = '1';
    btnTrue.style.textAlign = 'center';
    btnTrue.textContent = "True";
    btnTrue.onclick = () => checkAnswer("True", isTrue ? "True" : "False", btnTrue);

    const btnFalse = document.createElement('button');
    btnFalse.className = 'option-card';
    btnFalse.style.flex = '1';
    btnFalse.style.textAlign = 'center';
    btnFalse.textContent = "False";
    btnFalse.onclick = () => checkAnswer("False", isTrue ? "True" : "False", btnFalse);

    container.appendChild(btnTrue);
    container.appendChild(btnFalse);
}

function renderWriting(qData, container) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'writing-input';
    input.placeholder = 'Type the answer...';
    input.autocomplete = "off";
    
    const submitBtn = document.createElement('button');
    submitBtn.className = 'action-btn';
    submitBtn.textContent = 'Submit Answer';
    submitBtn.style.width = 'auto';
    submitBtn.onclick = () => checkAnswer(input.value, qData.correct, input);

    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") submitBtn.click();
    });

    container.appendChild(input);
    container.appendChild(submitBtn);
}

function checkAnswer(userAnswer, correctAnswer, element) {
    // Disable inputs
    const buttons = qContainer.querySelectorAll('button');
    buttons.forEach(b => b.disabled = true);
    if(element.tagName === 'INPUT') element.disabled = true;

    const cleanUser = userAnswer.toString().trim().toLowerCase();
    const cleanCorrect = correctAnswer.toString().trim().toLowerCase();
    
    const isCorrect = cleanUser === cleanCorrect;

    if (isCorrect) {
        score++;
        feedbackDiv.textContent = "Correct! Nicely done.";
        feedbackDiv.className = 'feedback-correct';
        if(element.classList.contains('option-card')) {
            element.classList.add('correct');
            element.style.borderColor = 'var(--success-green)';
        }
    } else {
        feedbackDiv.innerHTML = `Incorrect.<br>The correct answer was: <strong>${correctAnswer}</strong>`;
        feedbackDiv.className = 'feedback-wrong';
        if(element.classList.contains('option-card')) {
            element.classList.add('wrong');
        }
        
        // Find and highlight correct answer
        if(element.classList.contains('option-card')) {
             const allOpts = qContainer.querySelectorAll('.option-card');
             allOpts.forEach(opt => {
                 if(opt.textContent === correctAnswer) {
                     opt.classList.add('correct');
                     opt.style.borderColor = 'var(--success-green)';
                 }
             });
        }
    }

    feedbackDiv.classList.remove('hidden');
    nextQBtn.classList.remove('hidden');
    
    // Auto focus next button for keyboard users
    nextQBtn.focus();
}

function endQuiz() {
    progressBar.style.width = '100%';
    document.getElementById('quiz-active').classList.add('hidden');
    document.getElementById('quiz-results').classList.remove('hidden');
    
    const percentage = Math.round((score / quizQuestions.length) * 100);
    document.getElementById('final-score').textContent = `${percentage}%`;
    
    const finalText = document.getElementById('final-text');
    const circle = document.querySelector('.score-circle');
    
    if (percentage === 100) {
        finalText.textContent = "Perfect score! You're a master.";
        circle.style.borderColor = "var(--success-green)";
        circle.style.color = "var(--success-green)";
    } else if (percentage >= 70) {
        finalText.textContent = "Great job! You're doing well.";
        circle.style.borderColor = "var(--primary-blue)";
        circle.style.color = "var(--primary-blue)";
    } else {
        finalText.textContent = "Keep studying! You'll get there.";
        circle.style.borderColor = "var(--accent-yellow)";
        circle.style.color = "var(--text-primary)";
    }
}

// Start
loadDeck();
// Expose functions globally for HTML onclicks
window.switchMode = switchMode;
window.startQuiz = startQuiz;
