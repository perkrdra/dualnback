class DualNBackGame {
    constructor() {
        this.gridSize = 3;
        this.nBack = 2;
        this.score = 0;
        this.sequence = [];
        this.currentRound = 0;
        this.interval = null;
        this.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.isPlaying = false;
        this.canRespond = false;
        this.positionMatched = false;
        this.soundMatched = false;
        this.audioContext = null;
        
        // Training session tracking
        this.trialsPerSession = 30;
        this.currentTrial = 0;
        this.positionCorrect = 0;
        this.letterCorrect = 0;
        this.positionTotal = 0;
        this.letterTotal = 0;
        this.actualPositionMatches = 0;
        this.actualLetterMatches = 0;

        this.gridContainer = document.getElementById('grid-container');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.scoreValue = document.getElementById('score-value');
        this.levelValue = document.getElementById('level-value');
        this.levelUpBtn = document.getElementById('level-up');
        this.levelDownBtn = document.getElementById('level-down');
        this.trialValue = document.getElementById('trial-value');
        this.positionScoreValue = document.getElementById('position-score-value');
        this.letterScoreValue = document.getElementById('letter-score-value');
        this.trialUpBtn = document.getElementById('trial-up');
        this.trialDownBtn = document.getElementById('trial-down');
        this.positionBtn = document.getElementById('position-btn');
        this.letterBtn = document.getElementById('letter-btn');

        this.initGrid();
        this.addEventListeners();
        this.initAudio();
        this.updateLevel();
        this.updateTrialDisplay();
        this.updateTrialButtons();
        this.updateScoreDisplays();
    }

    initGrid() {
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.index = i;
            this.gridContainer.appendChild(cell);
        }
    }

    addEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.pauseGame());
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.levelUpBtn.addEventListener('click', () => this.adjustLevel(1));
        this.levelDownBtn.addEventListener('click', () => this.adjustLevel(-1));
        this.trialUpBtn.addEventListener('click', () => this.adjustTrials(5));
        this.trialDownBtn.addEventListener('click', () => this.adjustTrials(-5));
        this.positionBtn.addEventListener('click', () => this.handlePositionClick());
        this.letterBtn.addEventListener('click', () => this.handleLetterClick());
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    startGame() {
        this.isPlaying = true;
        this.generateSequenceWithMatches();
        this.interval = setInterval(() => this.nextRound(), 3000);
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.positionBtn.disabled = false;
        this.letterBtn.disabled = false;
    }

    pauseGame() {
        this.isPlaying = false;
        clearInterval(this.interval);
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.positionBtn.disabled = true;
        this.letterBtn.disabled = true;
    }

    resetGame() {
        this.pauseGame();
        this.score = 0;
        this.resetSession();
        this.updateScore();
        this.clearGrid();
    }

    adjustLevel(change) {
        if (this.isPlaying) return;
        
        const newLevel = this.nBack + change;
        if (newLevel >= 2 && newLevel <= 6) {
            this.nBack = newLevel;
            this.updateLevel();
            this.resetSession();
        }
    }

    adjustTrials(change) {
        if (this.isPlaying) return;
        
        const newTrials = this.trialsPerSession + change;
        if (newTrials >= 10 && newTrials <= 100) {
            this.trialsPerSession = newTrials;
            this.updateTrialDisplay();
            this.updateTrialButtons();
            this.resetSession();
        }
    }

    updateLevel() {
        this.levelValue.textContent = this.nBack;
        this.levelUpBtn.disabled = this.nBack >= 6;
        this.levelDownBtn.disabled = this.nBack <= 2;
    }

    generateSequenceWithMatches() {
        // Generate a sequence that guarantees matches based on trial count
        this.sequence = [];
        const totalRounds = this.trialsPerSession + this.nBack; // Need extra rounds for n-back
        const targetMatches = Math.floor(this.trialsPerSession * 2 / 3); // Scale matches with trials (2/3)
        const positionMatches = Math.ceil(targetMatches / 2);
        const letterMatches = Math.floor(targetMatches / 2);
        
        // First, generate random sequence
        for (let i = 0; i < totalRounds; i++) {
            this.sequence.push({
                position: Math.floor(Math.random() * (this.gridSize * this.gridSize)),
                letter: this.letters[Math.floor(Math.random() * this.letters.length)]
            });
        }
        
        // Track which rounds have intentional matches
        const positionMatchRounds = new Set();
        const letterMatchRounds = new Set();
        
        // Randomly select rounds where we'll force matches (after n-back threshold)
        const matchableRounds = [];
        for (let i = this.nBack; i < totalRounds; i++) {
            matchableRounds.push(i);
        }
        
        // Shuffle the matchable rounds
        for (let i = matchableRounds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [matchableRounds[i], matchableRounds[j]] = [matchableRounds[j], matchableRounds[i]];
        }
        
        // Force position matches
        let positionCount = 0;
        for (let i = 0; i < matchableRounds.length && positionCount < positionMatches; i++) {
            const round = matchableRounds[i];
            this.sequence[round].position = this.sequence[round - this.nBack].position;
            positionMatchRounds.add(round);
            positionCount++;
        }
        
        // Force letter matches (on different rounds to avoid overlap)
        let letterCount = 0;
        for (let i = 0; i < matchableRounds.length && letterCount < letterMatches; i++) {
            const round = matchableRounds[i];
            if (!positionMatchRounds.has(round)) { // Skip rounds that already have position matches
                this.sequence[round].letter = this.sequence[round - this.nBack].letter;
                letterMatchRounds.add(round);
                letterCount++;
            }
        }
        
        // Remove any accidental matches by changing them
        for (let i = this.nBack; i < totalRounds; i++) {
            const current = this.sequence[i];
            const nBackAgo = this.sequence[i - this.nBack];
            
            // If this round should NOT have a position match but does
            if (!positionMatchRounds.has(i) && current.position === nBackAgo.position) {
                // Change position to avoid match
                current.position = (current.position + 1) % (this.gridSize * this.gridSize);
            }
            
            // If this round should NOT have a letter match but does
            if (!letterMatchRounds.has(i) && current.letter === nBackAgo.letter) {
                // Change letter to avoid match
                const currentLetterIndex = this.letters.indexOf(current.letter);
                current.letter = this.letters[(currentLetterIndex + 1) % this.letters.length];
            }
        }
        
        // Store the actual match counts for validation
        this.actualPositionMatches = positionMatchRounds.size;
        this.actualLetterMatches = letterMatchRounds.size;
        
        console.log(`Generated sequence with exactly ${this.actualPositionMatches} position and ${this.actualLetterMatches} letter matches for ${this.trialsPerSession} trials`);
    }

    nextRound() {
        // Check if session is complete
        if (this.currentTrial >= this.trialsPerSession) {
            this.endSession();
            return;
        }

        this.canRespond = false;
        this.positionMatched = false;
        this.soundMatched = false;

        // Use pre-generated sequence
        const current = this.sequence[this.currentRound];
        if (!current) return;
        
        this.clearGrid();
        this.activateCell(current.position);
        this.playSound(current.letter);
        this.showLetter(current.letter);

        this.currentRound++;

        if (this.currentRound > this.nBack) {
            this.canRespond = true;
            this.currentTrial++;
            this.updateTrialDisplay();
            
            // Debug: Check for matches
            const currentIndex = this.currentRound - 1; // Current stimulus
            const nBackIndex = currentIndex - this.nBack; // N steps back
            const current = this.sequence[currentIndex];
            const nBackAgo = this.sequence[nBackIndex];
            
            const positionMatch = current.position === nBackAgo.position;
            const letterMatch = current.letter === nBackAgo.letter;
            
            console.log(`Round ${this.currentRound}: Comparing position ${currentIndex} (${current.position}) with ${nBackIndex} (${nBackAgo.position}) = ${positionMatch}`);
            console.log(`Round ${this.currentRound}: Comparing letter ${currentIndex} (${current.letter}) with ${nBackIndex} (${nBackAgo.letter}) = ${letterMatch}`);
            
            setTimeout(() => this.checkMatches(), 2500);
        }
    }

    activateCell(index) {
        const cell = this.gridContainer.children[index];
        cell.classList.add('active');
        setTimeout(() => {
            cell.classList.remove('active');
            cell.textContent = '';
        }, 500);
    }

    clearGrid() {
        Array.from(this.gridContainer.children).forEach(cell => {
            cell.classList.remove('active');
            cell.textContent = '';
        });
    }

    initAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Initialize speech synthesis voices
        if ('speechSynthesis' in window) {
            // Load voices if not already loaded
            if (window.speechSynthesis.getVoices().length === 0) {
                window.speechSynthesis.addEventListener('voiceschanged', () => {
                    // Voices are now loaded
                });
            }
        }
    }

    playSound(letter) {
        // Use Web Speech API to read the letter name aloud
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();
            
            // Use phonetic spellings for better pronunciation
            const letterNames = {
                'A': 'AY', 'B': 'BEE', 'C': 'SEE', 'D': 'DEE', 'E': 'E',
                'F': 'EFF', 'G': 'JEE', 'H': 'AITCH', 'I': 'EYE', 'J': 'JAY',
                'K': 'KAY', 'L': 'ELL', 'M': 'EMM', 'N': 'EN', 'O': 'OH',
                'P': 'PEE', 'Q': 'CUE', 'R': 'ARR', 'S': 'ESS', 'T': 'TEE',
                'U': 'YOO', 'V': 'VEE', 'W': 'DOUBLE YOO', 'X': 'EX', 'Y': 'WHY', 'Z': 'ZEE'
            };
            
            const letterName = letterNames[letter] || letter;
            const utterance = new SpeechSynthesisUtterance(letterName);
            
            // Set female voice
            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(voice => 
                voice.name.toLowerCase().includes('female') || 
                voice.name.toLowerCase().includes('woman') ||
                voice.name.toLowerCase().includes('samantha') ||
                voice.name.toLowerCase().includes('alex') ||
                voice.name.toLowerCase().includes('karen') ||
                voice.name.toLowerCase().includes('susan') ||
                voice.name.toLowerCase().includes('victoria') ||
                voice.name.toLowerCase().includes('zira')
            );
            
            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }
            
            utterance.rate = 0.9;
            utterance.pitch = 1.2;
            utterance.volume = 0.8;
            
            window.speechSynthesis.speak(utterance);
        }
    }

    handleKeyPress(e) {
        if (!this.isPlaying || !this.canRespond) {
            console.log(`Key press ignored: playing=${this.isPlaying}, canRespond=${this.canRespond}`);
            return;
        }

        if (e.key === 'a' && !this.positionMatched) {
            console.log('A pressed - checking position match');
            this.positionMatched = true;
            this.checkPositionMatch();
        } else if (e.key === 'z' && !this.soundMatched) {
            console.log('Z pressed - checking letter match');
            this.soundMatched = true;
            this.checkLetterMatch();
        }
    }

    handlePositionClick() {
        if (!this.isPlaying || !this.canRespond || this.positionMatched) {
            console.log(`Position button ignored: playing=${this.isPlaying}, canRespond=${this.canRespond}, already matched=${this.positionMatched}`);
            return;
        }
        console.log('Position button clicked - checking position match');
        this.positionMatched = true;
        this.checkPositionMatch();
    }

    handleLetterClick() {
        if (!this.isPlaying || !this.canRespond || this.soundMatched) {
            console.log(`Letter button ignored: playing=${this.isPlaying}, canRespond=${this.canRespond}, already matched=${this.soundMatched}`);
            return;
        }
        console.log('Letter button clicked - checking letter match');
        this.soundMatched = true;
        this.checkLetterMatch();
    }

    updateScore() {
        this.scoreValue.textContent = this.score;
    }

    showLetter(letter) {
        const activeCell = document.querySelector('.grid-cell.active');
        if (activeCell) {
            activeCell.textContent = letter;
        }
    }

    checkPositionMatch() {
        if (this.currentRound <= this.nBack) return;
        
        const currentIndex = this.currentRound - 1;
        const nBackIndex = currentIndex - this.nBack;
        const current = this.sequence[currentIndex];
        const nBackAgo = this.sequence[nBackIndex];
        
        const isCorrect = current.position === nBackAgo.position;
        this.positionTotal++;
        
        if (isCorrect) {
            this.score += 10;
            this.positionCorrect++;
            this.showFeedback(true, 'position');
            console.log(`Position CORRECT! Score: ${this.score}`);
        } else {
            this.score -= 5;
            this.showFeedback(false, 'position');
            console.log(`Position WRONG! Score: ${this.score}`);
        }
        this.updateScore();
        this.updateScoreDisplays();
    }

    checkLetterMatch() {
        if (this.currentRound <= this.nBack) return;
        
        const currentIndex = this.currentRound - 1;
        const nBackIndex = currentIndex - this.nBack;
        const current = this.sequence[currentIndex];
        const nBackAgo = this.sequence[nBackIndex];
        
        const isCorrect = current.letter === nBackAgo.letter;
        this.letterTotal++;
        
        if (isCorrect) {
            this.score += 10;
            this.letterCorrect++;
            this.showFeedback(true, 'letter');
            console.log(`Letter CORRECT! Score: ${this.score}`);
        } else {
            this.score -= 5;
            this.showFeedback(false, 'letter');
            console.log(`Letter WRONG! Score: ${this.score}`);
        }
        this.updateScore();
        this.updateScoreDisplays();
    }

    checkMatches() {
        if (this.currentRound <= this.nBack) return;
        
        const currentIndex = this.currentRound - 1;
        const nBackIndex = currentIndex - this.nBack;
        const current = this.sequence[currentIndex];
        const nBackAgo = this.sequence[nBackIndex];
        
        const positionMatch = current.position === nBackAgo.position;
        const letterMatch = current.letter === nBackAgo.letter;
        
        // Don't count missed matches in the total - only count actual player responses
        // This prevents the "12 out of 10" issue
        
        this.updateScore();
        this.canRespond = false;
    }

    showFeedback(correct, type) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'feedback';
        feedbackDiv.style.cssText = `
            position: fixed;
            top: 20%;
            right: 20px;
            padding: 8px 12px;
            background: ${correct ? '#f2c20a' : '#ea6a4b'};
            color: ${correct ? '#2552a3' : 'white'};
            border-radius: 15px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0.8;
            animation: slideIn 0.2s ease-out;
        `;
        
        let message = '';
        if (type === 'position') {
            message = correct ? 'Position ✓' : 'Position ✗';
        } else if (type === 'letter') {
            message = correct ? 'Letter ✓' : 'Letter ✗';
        } else if (type === 'position-missed') {
            message = 'Position ✗';
        } else if (type === 'letter-missed') {
            message = 'Letter ✗';
        }
        
        feedbackDiv.textContent = message;
        document.body.appendChild(feedbackDiv);
        
        setTimeout(() => {
            feedbackDiv.style.opacity = '0';
            feedbackDiv.style.transform = 'translateX(100px)';
            setTimeout(() => feedbackDiv.remove(), 200);
        }, 800);
    }

    showSessionComplete(message, score) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;

        // Create popup
        const popup = document.createElement('div');
        const totalAvailableMatches = Math.floor(this.trialsPerSession * 2 / 3);
        const isPerfect = score === totalAvailableMatches;
        const bgColor = isPerfect ? 'linear-gradient(135deg, #f2c20a 0%, #2552a3 100%)' : 
                       score >= totalAvailableMatches * 0.8 ? 'linear-gradient(135deg, #f2c20a 0%, #ea6a4b 100%)' :
                       score >= totalAvailableMatches * 0.6 ? 'linear-gradient(135deg, #2552a3 0%, #f2c20a 100%)' :
                       'linear-gradient(135deg, #ea6a4b 0%, #2552a3 100%)';
        
        popup.style.cssText = `
            background: ${bgColor};
            color: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            text-align: center;
            font-size: 18px;
            line-height: 1.6;
            animation: popIn 0.3s ease-out;
        `;

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes popIn {
                0% { transform: scale(0.8); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            @keyframes slideIn {
                0% { transform: translateX(100px); opacity: 0; }
                100% { transform: translateX(0); opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);

        // Format message with HTML
        const htmlMessage = message.replace(/\n/g, '<br>').replace(/🎉/g, '<span style="font-size: 30px;">🎉</span>');
        popup.innerHTML = `
            <div style="white-space: pre-wrap;">${htmlMessage}</div>
            <button id="session-ok-btn" style="
                margin-top: 30px;
                padding: 15px 30px;
                font-size: 18px;
                background: white;
                color: ${isPerfect ? '#f2c20a' : '#2552a3'};
                border: none;
                border-radius: 30px;
                cursor: pointer;
                font-weight: bold;
                transition: transform 0.2s;
            ">OK</button>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Add button functionality
        const okBtn = document.getElementById('session-ok-btn');
        okBtn.onmouseover = () => okBtn.style.transform = 'scale(1.05)';
        okBtn.onmouseout = () => okBtn.style.transform = 'scale(1)';
        okBtn.onclick = () => {
            overlay.remove();
            style.remove();
        };
    }

    updateTrialDisplay() {
        if (this.trialValue) {
            this.trialValue.textContent = `${this.currentTrial}/${this.trialsPerSession}`;
        }
    }

    updateTrialButtons() {
        if (this.trialUpBtn && this.trialDownBtn) {
            this.trialUpBtn.disabled = this.trialsPerSession >= 100;
            this.trialDownBtn.disabled = this.trialsPerSession <= 10;
        }
    }

    updateScoreDisplays() {
        if (this.positionScoreValue) {
            this.positionScoreValue.textContent = `${this.positionCorrect}/${this.positionTotal}`;
        }
        if (this.letterScoreValue) {
            this.letterScoreValue.textContent = `${this.letterCorrect}/${this.letterTotal}`;
        }
    }

    endSession() {
        this.pauseGame();
        
        // Use the actual match counts from sequence generation
        const availablePositionMatches = this.actualPositionMatches || Math.ceil(Math.floor(this.trialsPerSession * 2 / 3) / 2);
        const availableLetterMatches = this.actualLetterMatches || Math.floor(Math.floor(this.trialsPerSession * 2 / 3) / 2);
        const totalAvailableMatches = availablePositionMatches + availableLetterMatches;
        
        const totalCorrect = this.positionCorrect + this.letterCorrect;
        
        let message = `Session Complete!\n\n`;
        message += `Position matches found: ${this.positionCorrect} (out of ${availablePositionMatches} available)\n`;
        message += `Letter matches found: ${this.letterCorrect} (out of ${availableLetterMatches} available)\n`;
        message += `Total Score: ${totalCorrect}/${totalAvailableMatches}\n\n`;
        
        const perfectScore = totalCorrect === totalAvailableMatches && 
                           this.positionCorrect === availablePositionMatches && 
                           this.letterCorrect === availableLetterMatches;
        
        if (perfectScore) {
            message += `🎉 PERFECT SCORE! 🎉\n\n`;
            message += `Amazing! You found all ${totalAvailableMatches} matches!\n`;
            message += `You're ready to increase the difficulty.\n\n`;
            message += `Press OK to advance to ${this.nBack + 1}-back level!`;
            
            if (this.nBack < 6) {
                this.nBack++;
                this.updateLevel();
            }
        } else if (totalCorrect >= totalAvailableMatches * 0.8) {
            message += `Great job! You found ${totalCorrect} out of ${totalAvailableMatches} matches.\n`;
            message += `Just a little more practice to perfect this level!`;
        } else if (totalCorrect >= totalAvailableMatches * 0.6) {
            message += `Good effort! You found ${totalCorrect} out of ${totalAvailableMatches} matches.\n`;
            message += `Keep practicing to improve your score.`;
        } else {
            message += `You found ${totalCorrect} out of ${totalAvailableMatches} matches.\n`;
            message += `Remember: Press A for position matches, Z for letter matches.\n`;
            message += `Take your time and focus on the patterns.`;
        }
        
        this.showSessionComplete(message, totalCorrect);
        this.resetSession();
    }

    resetSession() {
        this.currentTrial = 0;
        this.positionCorrect = 0;
        this.letterCorrect = 0;
        this.positionTotal = 0;
        this.letterTotal = 0;
        this.sequence = [];
        this.currentRound = 0;
        this.updateTrialDisplay();
        this.updateScoreDisplays();
    }
}

const game = new DualNBackGame();