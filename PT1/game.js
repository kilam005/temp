// --- GAME LOGIC ---
const game = {
    isPlaying: false,
    timerInterval: null,
    startTime: 0,
    questionCount: 0,
    targetQuestions: 25, // Default
    currentQ: null, 
    history: [], 
    
    // Logic Buffers
    recentElements: [], // Stores indices of last 25 elements to avoid repetition
    lastQuestionType: null, // Stores the field key of the last question to avoid repeats

    // DOM Elements
    elems: {
        startScreen: document.getElementById('startScreen'),
        gameContainer: document.getElementById('gameContainer'),
        elementTile: document.getElementById('elementTile'),
        timer: document.getElementById('timer'),
        questionCounter: document.getElementById('questionCounter'),
        gameControls: document.getElementById('gameControls'),
        mainArea: document.getElementById('mainArea'),
        resultModal: document.getElementById('resultModal'),
        resultCount: document.getElementById('resultCount'),
        resultTime: document.getElementById('resultTime'),
        historyList: document.getElementById('historyList'),
        // Mode Selection
        modeButtons: document.querySelectorAll('.btn-mode'),
        customInput: document.getElementById('customInput'),
        customInputContainer: document.getElementById('customInputContainer'),
        // Print Elements
        printDate: document.getElementById('printDate'),
        printCount: document.getElementById('printCount'),
        printTime: document.getElementById('printTime'),
        printTableBody: document.getElementById('printTableBody'),
        sidebar:document.getElementById('sidebarMain')
    },

    init() {
        this.setupModeSelection();
        this.elems.sidebar.style.display = 'none';
    },

    setupModeSelection() {
        this.elems.modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // UI Toggle
                this.elems.modeButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                const value = btn.getAttribute('data-value');
                
                // Show/Hide Custom Input
                if (value === 'custom') {
                    this.elems.customInputContainer.style.display = 'block';
                    this.elems.customInput.focus();
                } else {
                    this.elems.customInputContainer.style.display = 'none';
                }
            });
        });
    },

    start() {
        // Determine number of questions
        const selectedBtn = document.querySelector('.btn-mode.selected');
        const mode = selectedBtn ? selectedBtn.getAttribute('data-value') : '25';

        if (mode === 'endless') {
            this.targetQuestions = 1000000000; // Effectively endless
        } else if (mode === 'custom') {
            const inputVal = parseInt(this.elems.customInput.value);
            if (!inputVal || inputVal <= 0) {
                alert("Please enter a valid number of questions.");
                return;
            }
            this.targetQuestions = inputVal;
        } else {
            this.targetQuestions = parseInt(mode);
        }

        // Reset Logic
        this.isPlaying = true;
        this.questionCount = 0;
        this.elems.historyList.innerHTML = ''; 
        this.history = []; 
        this.recentElements = [];
        this.lastQuestionType = null;
        
        // UI Transitions
        this.elems.startScreen.style.display = 'none';
        this.elems.gameContainer.style.opacity = '1';
        this.elems.gameContainer.style.pointerEvents = 'auto';
        this.elems.questionCounter.style.opacity = '1';
        this.elems.timer.style.opacity = '1';
        this.elems.gameControls.classList.add('visible');
        
        this.elems.sidebar.style.display = 'block';

        this.advance(); 
        this.startTime = Date.now();
        this.startTimer();
    },

    stop() {
        if(!this.isPlaying) return;
        this.isPlaying = false;
        this.stopTimer();
        this.addToHistory(); // Add final question
        this.generateReport(); // Prepare print data
        this.showResult();
    },

    reset() {
        this.stopTimer();
        this.isPlaying = false;
        
        this.elems.startScreen.style.display = 'flex'; // Flex to center content
        this.elems.gameContainer.style.opacity = '0';
        this.elems.gameContainer.style.pointerEvents = 'none';
        this.elems.questionCounter.style.opacity = '0';
        this.elems.timer.style.opacity = '0';
        this.elems.gameControls.classList.remove('visible');
        this.elems.elementTile.innerHTML = '';
        this.elems.historyList.innerHTML = '';
        
        this.questionCount = 0;
        this.currentQ = null;
        this.history = [];
        this.elems.timer.textContent = '00:00:00';
        this.elems.sidebar.style.display = 'none';
    },

    startTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
        }, 10);
    },

    stopTimer() {
        clearInterval(this.timerInterval);
    },

    updateTimerDisplay() {
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.startTime;
        const mins = Math.floor(elapsedTime / 60000).toString().padStart(2, '0');
        const secs = Math.floor((elapsedTime % 60000) / 1000).toString().padStart(2, '0');
        const ms = Math.floor((elapsedTime % 1000) / 10).toString().padStart(2, '0');
        this.elems.timer.textContent = `${mins}:${secs}:${ms}`;
    },

    updateQuestionCounter() {
        const totalText = this.targetQuestions > 1000000 ? '∞' : this.targetQuestions;
        this.elems.questionCounter.textContent = `Question ${this.questionCount} / ${totalText}`;
    },

    addToHistory() {
        if (!this.currentQ) return;

        const q = this.currentQ;
        this.history.push(q);

        const card = document.createElement('div');
        card.className = 'history-card';

        const miniTile = document.createElement('div');
        miniTile.className = 'mini-tile';
        miniTile.innerHTML = q.html;

        const info = document.createElement('div');
        info.className = 'history-right';
        
        info.innerHTML = `
            <div class="h-q-num">Question ${q.num}</div>
            <div class="h-asked">Asked: ${this.getReadableLabel(q.field)}</div>
            <div class="h-answer">${q.answer}</div>
        `;

        card.appendChild(miniTile);
        card.appendChild(info);
        
        this.elems.historyList.appendChild(card);
        this.elems.historyList.scrollTop = this.elems.historyList.scrollHeight;
    },

    generateReport() {
        this.elems.printDate.textContent = new Date().toLocaleString();
        this.elems.printCount.textContent = this.history.length;
        this.elems.printTime.textContent = this.elems.timer.textContent;

        this.elems.printTableBody.innerHTML = '';

        this.history.forEach(item => {
            const tr = document.createElement('tr');
            
            const tileDiv = document.createElement('div');
            tileDiv.className = 'mini-tile';
            tileDiv.innerHTML = item.html;

            tr.innerHTML = `
                <td>${item.num}</td>
                <td style="width: 80px;"></td> 
                <td>${this.getReadableLabel(item.field)}</td>
                <td style="font-weight: bold;">${item.answer}</td>
            `;
            
            tr.children[1].appendChild(tileDiv);
            this.elems.printTableBody.appendChild(tr);
        });
    },

    getReadableLabel(key) {
        const map = {
            'atomic_number': 'Atomic Number',
            'symbol': 'Symbol',
            'name': 'Name',
            'element_type': 'Type',
            'atomic_mass': 'Atomic Mass'
        };
        return map[key] || key;
    },

    nextQuestion() {
        if (!this.isPlaying) return;

        // 1. Pick Random Element (avoiding recent repeats)
        let elementIndex;
        let attempts = 0;
        
        // Safety check: if pool is small (e.g. debugging with small array), reduce buffer
        const bufferSize = Math.min(25, Math.floor(elementsData.length / 2));

        do {
            elementIndex = Math.floor(Math.random() * elementsData.length);
            attempts++;
        } while (this.recentElements.includes(elementIndex) && attempts < 100);

        // Update Recent Elements Buffer
        this.recentElements.push(elementIndex);
        if (this.recentElements.length > bufferSize) {
            this.recentElements.shift(); // Remove oldest
        }

        const randomElement = elementsData[elementIndex];
        
        // 2. Pick Field to Obscure (avoid consecutive repeats)
        const fields = [
            { key: 'atomic_number', class: 'top-left' },
            { key: 'symbol', class: 'symbol' },
            { key: 'name', class: 'name' },
            { key: 'element_type', class: 'type' }
        ];

        let obscureIndex;
        let obscuredField;
        attempts = 0;

        do {
            obscureIndex = Math.floor(Math.random() * fields.length);
            obscuredField = fields[obscureIndex].key;
            attempts++;
        } while (obscuredField === this.lastQuestionType && attempts < 20);

        this.lastQuestionType = obscuredField;
        
        const correctAnswer = randomElement[obscuredField];

        // 3. Generate HTML
        let html = '';
        const valNum = obscureIndex === 0 ? '<span class="question-mark">?</span>' : randomElement.atomic_number;
        html += `<div class="tile-corner top-left">${valNum}</div>`;
        html += `<div class="tile-corner top-right">${randomElement.atomic_mass} u</div>`;
        const valSym = obscureIndex === 1 ? '<span class="question-mark">?</span>' : randomElement.symbol;
        html += `<div class="tile-symbol">${valSym}</div>`;
        const valName = obscureIndex === 2 ? '<span class="question-mark">?</span>' : randomElement.name;
        html += `<div class="tile-name">${valName}</div>`;
        const valType = obscureIndex === 3 ? '<span class="question-mark">?</span>' : randomElement.element_type;
        html += `<div class="tile-chip">${valType}</div>`;

        this.elems.elementTile.innerHTML = html;

        this.currentQ = {
            num: this.questionCount,
            html: html,
            field: obscuredField,
            answer: correctAnswer
        };
    },

    advance() {
        if(this.isPlaying) {
            if (this.questionCount >= this.targetQuestions) {
                this.stop();
                return;
            }

            if(this.questionCount >= 0) {
                this.addToHistory();
            }

            this.questionCount++;
            this.updateQuestionCounter();
            this.nextQuestion();
        }
    },
    
    showResult() {
        console.table(this.history);
        this.elems.resultCount.textContent = this.history.length;
        this.elems.resultTime.textContent = this.elems.timer.textContent;
        this.elems.resultModal.classList.add('open');
    },
    
    closeModal() {
        this.elems.resultModal.classList.remove('open');
        this.reset();
    }
};

// --- INITIALIZATION & EVENTS ---

game.init();

// Buttons
document.getElementById('btnStart').addEventListener('click', () => game.start());
document.getElementById('btnStop').addEventListener('click', () => game.stop());
document.getElementById('btnClose').addEventListener('click', () => game.closeModal());
document.getElementById('btnPrint').addEventListener('click', () => window.print());

// Controls
document.addEventListener('click', (e) => {
    // Ignore clicks on UI elements
    if (e.target.closest('header') || e.target.closest('.modal') || e.target.closest('.sidebar') || e.target.closest('.start-screen')) return;
    if (game.isPlaying) game.advance();
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); 
        if (game.isPlaying) {
            game.elems.elementTile.classList.add('active-anim');
            setTimeout(() => game.elems.elementTile.classList.remove('active-anim'), 100);
            game.advance();
        }
    }
    if (e.code === 'KeyS') {
        if (game.isPlaying) game.stop();
    }
});

document.addEventListener('touchstart', (e) => {
    // We only care about triple touch, single touch is handled by 'click' usually or we can add specific touch handler if needed
    if (e.touches.length === 3) {
        if (game.isPlaying) game.stop();
    }
});