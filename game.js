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
        
        // Clockwise pattern for letter mode (3x3 grid)
        // 0 → 1 → 2
        // ↓       ↓
        // 3   4   5
        // ↓       ↓
        // 6 ← 7 ← 8
        this.clockwisePattern = [0, 1, 2, 5, 8, 7, 6, 3, 4];

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
        this.gameModeSelect = document.getElementById('game-mode');
        
        this.gameMode = 'dual'; // 'dual', 'position', or 'letter'

        this.initGrid();
        this.addEventListeners();
        this.initAudio();
        this.updateLevel();
        this.updateTrialDisplay();
        this.updateTrialButtons();
        this.updateScoreDisplays();
        this.updateButtonsForMode();
        
        // Session tracking
        this.sessionStartTime = null;
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
        this.gameModeSelect.addEventListener('change', () => this.handleModeChange());
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    startGame() {
        // Initialize audio context on user interaction (required for iOS)
        this.initAudioContext();
        
        this.isPlaying = true;
        this.sessionStartTime = Date.now();
        this.currentRound = 0;
        this.currentTrial = 0;
        
        this.generateSequenceWithMatches();
        this.interval = setInterval(() => this.nextRound(), 3000);
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.updateButtonsForMode();
        this.gameModeSelect.disabled = true;
    }

    pauseGame() {
        this.isPlaying = false;
        clearInterval(this.interval);
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.positionBtn.disabled = true;
        this.letterBtn.disabled = true;
        this.gameModeSelect.disabled = false;
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
        if (newLevel >= 1 && newLevel <= 9) {
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
        this.levelUpBtn.disabled = this.nBack >= 9;
        this.levelDownBtn.disabled = this.nBack <= 1;
    }

    generateSequenceWithMatches() {
        // Generate a sequence that guarantees matches based on trial count
        this.sequence = [];
        const totalRounds = this.trialsPerSession + this.nBack; // Need extra rounds for n-back
        const targetMatches = Math.floor(this.trialsPerSession * 2 / 3); // Scale matches with trials (2/3)
        
        let positionMatches, letterMatches;
        switch (this.gameMode) {
            case 'dual':
                positionMatches = Math.ceil(targetMatches / 2);
                letterMatches = Math.floor(targetMatches / 2);
                break;
            case 'position':
                positionMatches = targetMatches;
                letterMatches = 0;
                break;
            case 'letter':
                positionMatches = 0;
                letterMatches = targetMatches;
                break;
        }
        
        // First, generate sequence
        for (let i = 0; i < totalRounds; i++) {
            let position;
            
            if (this.gameMode === 'letter') {
                // In letter mode, use clockwise pattern
                position = this.clockwisePattern[i % this.clockwisePattern.length];
            } else {
                // In other modes, use random positions
                position = Math.floor(Math.random() * (this.gridSize * this.gridSize));
            }
            
            this.sequence.push({
                position: position,
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
            
            if (this.gameMode === 'letter') {
                // In letter mode, positions follow clockwise pattern
                // Check if current position naturally matches n-back position
                const currentPatternIndex = round % this.clockwisePattern.length;
                const nBackPatternIndex = (round - this.nBack) % this.clockwisePattern.length;
                
                if (this.clockwisePattern[currentPatternIndex] === this.clockwisePattern[nBackPatternIndex]) {
                    // Natural match due to pattern repetition
                    positionMatchRounds.add(round);
                    positionCount++;
                }
                // If no natural match, we can't force one without breaking the clockwise pattern
            } else {
                // In other modes, directly set position match
                this.sequence[round].position = this.sequence[round - this.nBack].position;
                positionMatchRounds.add(round);
                positionCount++;
            }
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
                if (this.gameMode !== 'letter') {
                    // Change position to avoid match (only in non-letter modes)
                    current.position = (current.position + 1) % (this.gridSize * this.gridSize);
                }
                // In letter mode, we can't change position due to clockwise pattern
                // So accidental matches may occur naturally due to pattern repetition
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
        
        // Only play sound and show letter if not in position-only mode
        if (this.gameMode !== 'position') {
            this.playSound(current.letter);
            this.showLetter(current.letter);
        }

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
        // Initialize AudioContext only after user interaction on iOS
        this.audioContextInitialized = false;
        this.voicesLoaded = false;
        
        // Initialize speech synthesis voices
        if ('speechSynthesis' in window) {
            this.loadVoices();
            // Load voices if not already loaded
            if (window.speechSynthesis.getVoices().length === 0) {
                window.speechSynthesis.addEventListener('voiceschanged', () => {
                    this.loadVoices();
                });
            }
        }
    }

    initAudioContext() {
        if (this.audioContextInitialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume AudioContext if suspended (required for iOS)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            this.audioContextInitialized = true;
        } catch (error) {
            console.warn('AudioContext initialization failed:', error);
        }
    }

    loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            this.availableVoices = voices;
            this.voicesLoaded = true;
            console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        }
    }

    playSound(letter) {
        // Use Web Speech API to read the letter name aloud
        if ('speechSynthesis' in window) {
            // Initialize audio context on user interaction (iOS requirement)
            this.initAudioContext();
            
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
            
            // Get the best available voice for this platform
            const selectedVoice = this.selectBestVoice();
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
            
            utterance.rate = 0.9;
            utterance.pitch = 1.2;
            utterance.volume = 0.8;
            
            window.speechSynthesis.speak(utterance);
        }
    }

    selectBestVoice() {
        if (!this.voicesLoaded || !this.availableVoices) {
            // Fallback: get voices synchronously
            this.availableVoices = window.speechSynthesis.getVoices();
        }
        
        if (!this.availableVoices || this.availableVoices.length === 0) {
            return null;
        }
        
        // Platform detection
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMac = /Mac/.test(navigator.platform);
        const isWindows = /Win/.test(navigator.platform);
        
        // Log all available voices for debugging
        console.log('All available voices:', this.availableVoices.map(v => `${v.name} (${v.lang})`));
        
        // English voices only - be more aggressive on Samsung devices
        let englishVoices = this.availableVoices.filter(voice => 
            voice.lang.startsWith('en-') || 
            voice.lang === 'en' ||
            (voice.name.toLowerCase().includes('english') && !voice.name.toLowerCase().includes('norwegian'))
        );
        
        console.log('Filtered English voices:', englishVoices.map(v => `${v.name} (${v.lang})`));
        
        if (englishVoices.length === 0) {
            console.warn('No English voices found, using fallback');
            return this.availableVoices[0]; // Fallback to any voice
        }
        
        let preferredVoice = null;
        
        if (isIOS) {
            // iOS voice preferences
            preferredVoice = englishVoices.find(voice => 
                voice.name.includes('Samantha') || 
                voice.name.includes('Karen') || 
                voice.name.includes('Susan')
            ) || englishVoices.find(voice => 
                voice.name.toLowerCase().includes('female')
            );
        } else if (isAndroid) {
            // Android voice preferences - prioritize high-quality voices
            // Priority order: Google > Samsung > others
            preferredVoice = englishVoices.find(voice => 
                voice.name.toLowerCase().includes('google') && 
                voice.name.toLowerCase().includes('us') &&
                voice.name.toLowerCase().includes('female')
            ) || englishVoices.find(voice => 
                voice.name.toLowerCase().includes('google') && 
                voice.name.toLowerCase().includes('uk') &&
                voice.name.toLowerCase().includes('female')
            ) || englishVoices.find(voice => 
                voice.name.toLowerCase().includes('google') && 
                voice.lang === 'en-US'
            ) || englishVoices.find(voice => 
                voice.name.toLowerCase().includes('google') && 
                voice.lang === 'en-GB'
            ) || englishVoices.find(voice => 
                voice.name.toLowerCase().includes('samsung') && 
                voice.name.toLowerCase().includes('female') &&
                voice.lang.startsWith('en-')
            ) || englishVoices.find(voice => 
                voice.name.toLowerCase().includes('samsung') && 
                voice.lang === 'en-US'
            ) || englishVoices.find(voice => 
                voice.name.toLowerCase().includes('google')
            ) || englishVoices.find(voice =>
                voice.lang === 'en-US'
            ) || englishVoices.find(voice =>
                voice.lang === 'en-GB'
            );
        } else if (isMac) {
            // macOS voice preferences
            preferredVoice = englishVoices.find(voice => 
                voice.name.includes('Samantha') || 
                voice.name.includes('Alex') || 
                voice.name.includes('Karen') || 
                voice.name.includes('Susan')
            );
        } else if (isWindows) {
            // Windows voice preferences
            preferredVoice = englishVoices.find(voice => 
                voice.name.includes('Zira') || 
                voice.name.includes('Hazel') || 
                voice.name.toLowerCase().includes('female')
            );
        }
        
        // Fallback: prefer any female voice
        if (!preferredVoice) {
            preferredVoice = englishVoices.find(voice => 
                voice.name.toLowerCase().includes('female') || 
                voice.name.toLowerCase().includes('woman')
            );
        }
        
        // Final fallback: first English voice or any voice
        const finalVoice = preferredVoice || englishVoices[0] || this.availableVoices[0];
        
        if (finalVoice) {
            const platform = isIOS ? 'iOS' : isAndroid ? 'Android' : isMac ? 'macOS' : isWindows ? 'Windows' : 'Unknown';
            console.log(`[${platform}] Selected voice: ${finalVoice.name} (${finalVoice.lang})`);
            console.log(`Voice details:`, finalVoice);
        } else {
            console.warn('No voice could be selected!');
        }
        
        return finalVoice;
    }

    handleKeyPress(e) {
        if (!this.isPlaying || !this.canRespond) {
            console.log(`Key press ignored: playing=${this.isPlaying}, canRespond=${this.canRespond}`);
            return;
        }

        if (e.key === 'a' && !this.positionMatched && this.gameMode !== 'letter') {
            console.log('A pressed - checking position match');
            this.positionMatched = true;
            this.checkPositionMatch();
        } else if (e.key === 'z' && !this.soundMatched && this.gameMode !== 'position') {
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

    handleModeChange() {
        if (this.isPlaying) return;
        
        this.gameMode = this.gameModeSelect.value;
        this.resetSession();
        this.updateButtonsForMode();
        this.updateScoreDisplays();
        console.log(`Game mode changed to: ${this.gameMode}`);
    }

    updateButtonsForMode() {
        if (!this.isPlaying) {
            this.positionBtn.disabled = true;
            this.letterBtn.disabled = true;
            return;
        }
        
        switch (this.gameMode) {
            case 'dual':
                this.positionBtn.disabled = false;
                this.letterBtn.disabled = false;
                this.positionBtn.style.display = 'block';
                this.letterBtn.style.display = 'block';
                break;
            case 'position':
                this.positionBtn.disabled = false;
                this.letterBtn.disabled = true;
                this.positionBtn.style.display = 'block';
                this.letterBtn.style.display = 'none';
                break;
            case 'letter':
                this.positionBtn.disabled = true;
                this.letterBtn.disabled = false;
                this.positionBtn.style.display = 'none';
                this.letterBtn.style.display = 'block';
                break;
        }
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
        // Feedback popups have been removed
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
        const bgColor = isPerfect ? '#f2c20a' : 
                       score >= totalAvailableMatches * 0.8 ? '#2552a3' :
                       score >= totalAvailableMatches * 0.6 ? '#ea6a4b' :
                       '#f9f9f9';
        
        const textColor = bgColor === '#f9f9f9' ? '#333' : 'white';
        
        popup.style.cssText = `
            background: ${bgColor};
            color: ${textColor};
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
                color: #2552a3;
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
        const positionScoreDiv = document.getElementById('position-score');
        const letterScoreDiv = document.getElementById('letter-score');
        
        if (this.positionScoreValue) {
            this.positionScoreValue.textContent = `${this.positionCorrect}/${this.positionTotal}`;
        }
        if (this.letterScoreValue) {
            this.letterScoreValue.textContent = `${this.letterCorrect}/${this.letterTotal}`;
        }
        
        // Show/hide scores based on mode
        switch (this.gameMode) {
            case 'dual':
                positionScoreDiv.style.display = 'block';
                letterScoreDiv.style.display = 'block';
                break;
            case 'position':
                positionScoreDiv.style.display = 'block';
                letterScoreDiv.style.display = 'none';
                break;
            case 'letter':
                positionScoreDiv.style.display = 'none';
                letterScoreDiv.style.display = 'block';
                break;
        }
    }

    async endSession() {
        this.pauseGame();
        
        // Track study data if enrolled
        await this.trackStudyData();
        
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
            
            if (this.nBack < 9) {
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

    async trackStudyData() {
        // Check if user is enrolled in study
        const enrolled = localStorage.getItem('studyEnrolled');
        if (!enrolled) return;
        
        // Get userData from localStorage (fallback)
        const userData = localStorage.getItem('studyUserData');
        if (!userData) return;
        
        const userDataObj = JSON.parse(userData);
        if (!userDataObj.studyData) return;
        
        // Calculate session duration
        const sessionDuration = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
        
        // Create session data with game performance metrics
        const sessionData = {
            timestamp: new Date().toISOString(),
            sessionDuration: sessionDuration,
            nBackLevel: this.nBack,
            gameMode: this.gameMode,
            trialsCompleted: this.currentTrial,
            totalTrials: this.trialsPerSession,
            positionCorrect: this.positionCorrect,
            positionTotal: this.positionTotal,
            letterCorrect: this.letterCorrect,
            letterTotal: this.letterTotal,
            totalScore: this.score,
            positionAccuracy: this.positionTotal > 0 ? (this.positionCorrect / this.positionTotal * 100).toFixed(1) : 0,
            letterAccuracy: this.letterTotal > 0 ? (this.letterCorrect / this.letterTotal * 100).toFixed(1) : 0,
            overallAccuracy: (this.positionTotal + this.letterTotal) > 0 ? 
                ((this.positionCorrect + this.letterCorrect) / (this.positionTotal + this.letterTotal) * 100).toFixed(1) : 0
        };
        
        // Add session to userData.studyData.sessions array
        if (!userDataObj.studyData.sessions) {
            userDataObj.studyData.sessions = [];
        }
        userDataObj.studyData.sessions.push(sessionData);
        
        // Save session to server (with localStorage fallback)
        if (window.dataManager) {
            const success = await window.dataManager.saveSession(userDataObj.participantId, sessionData);
            if (success) {
                console.log('Study data tracked:', sessionData);
            }
        } else {
            // Fallback: keep only last 100 sessions
            if (userDataObj.studyData.sessions.length > 100) {
                userDataObj.studyData.sessions = userDataObj.studyData.sessions.slice(-100);
            }
            
            // Save back to localStorage
            localStorage.setItem('studyUserData', JSON.stringify(userDataObj));
            console.log('Study data tracked (localStorage fallback):', sessionData);
        }
        
        // Update leaderboard
        this.updateLeaderboard(userDataObj.participantId);
    }
    
    updateLeaderboard(username) {
        if (!username) return;
        
        // Get current leaderboard
        let leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
        
        // Calculate total correct answers for this session
        const sessionScore = this.positionCorrect + this.letterCorrect;
        
        // Find user entry or create new one
        const existingIndex = leaderboard.findIndex(entry => entry.username === username);
        const currentDate = new Date().toISOString();
        
        if (existingIndex >= 0) {
            // Update existing entry with new highest level
            leaderboard[existingIndex].highestLevel = Math.max(leaderboard[existingIndex].highestLevel, this.nBack);
            leaderboard[existingIndex].lastPlayed = currentDate;
            
            // Track best scores per level
            if (!leaderboard[existingIndex].bestScores) {
                leaderboard[existingIndex].bestScores = {};
            }
            
            // Update best score for current level
            const currentBest = leaderboard[existingIndex].bestScores[this.nBack] || 0;
            leaderboard[existingIndex].bestScores[this.nBack] = Math.max(currentBest, sessionScore);
        } else {
            // Add new entry
            const newEntry = {
                username: username,
                highestLevel: this.nBack,
                lastPlayed: currentDate,
                joinedDate: currentDate,
                bestScores: {}
            };
            
            // Set best score for current level
            newEntry.bestScores[this.nBack] = sessionScore;
            
            leaderboard.push(newEntry);
        }
        
        // Sort by highest level (descending), then by best score at highest level (descending), then by last played
        leaderboard.sort((a, b) => {
            if (b.highestLevel !== a.highestLevel) {
                return b.highestLevel - a.highestLevel;
            }
            
            // If same highest level, compare best scores at that level
            const aBestScore = a.bestScores && a.bestScores[a.highestLevel] ? a.bestScores[a.highestLevel] : 0;
            const bBestScore = b.bestScores && b.bestScores[b.highestLevel] ? b.bestScores[b.highestLevel] : 0;
            
            if (bBestScore !== aBestScore) {
                return bBestScore - aBestScore;
            }
            
            return new Date(b.lastPlayed) - new Date(a.lastPlayed);
        });
        
        // Save updated leaderboard
        localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    }
}

const game = new DualNBackGame();