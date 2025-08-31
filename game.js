class DualNBackGame {
    constructor() {
        this.gridSize = 3;
        this.nBack = 3;
        this.score = 0;
        this.sequence = [];
        this.currentRound = 0;
        this.interval = null;
        this.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
        this.isPlaying = false;
        this.canRespond = false;
        this.positionMatched = false;
        this.soundMatched = false;
        this.audioContext = null;
        this.isMuted = true; // Default to muted
        
        // Training session tracking
        this.trialsPerSession = 40;
        this.currentTrial = 0;
        this.positionCorrect = 0;
        this.letterCorrect = 0;
        this.colorCorrect = 0;
        this.positionTotal = 0;
        this.letterTotal = 0;
        this.colorTotal = 0;
        this.actualPositionMatches = 0;
        this.actualLetterMatches = 0;
        this.actualColorMatches = 0;
        
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
        this.muteBtn = document.getElementById('mute-btn');
        // Supplement selectors removed from main interface
        this.speedSlider = document.getElementById('speed-slider');
        this.speedValue = document.getElementById('speed-value');
        
        this.gameMode = 'dual'; // 'dual', 'position', or 'letter'
        this.currentSupplements = []; // Array of current selected supplements
        this.gameSpeed = 2; // Default speed level (1=slowest, 5=fastest)
        this.roundInterval = 4000; // Default 4 seconds  
        this.responseTime = 3500; // Default 3.5 seconds
        this.correctTrials = 0; // Number of trials where user got everything right

        this.initGrid();
        this.addEventListeners();
        this.initAudio();
        this.updateLevel();
        this.updateTrialDisplay();
        this.updateTrialButtons();
        this.updateScoreDisplays();
        this.updateMuteButton();
        this.updateButtonsForMode();
        this.updateButtonLabels();
        this.updateInstructions();
        
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
        this.speedSlider.addEventListener('input', () => this.handleSpeedChange());
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Add right-click support for Letter (Z) button
        document.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    }

    startGame() {
        // Initialize audio context on user interaction (required for iOS)
        this.initAudioContext();
        
        // Show bro mode motivational popup before starting
        if (this.gameMode === 'bro') {
            this.showBroStartPopup();
            return;
        }
        
        this.actuallyStartGame();
    }
    
    actuallyStartGame() {
        // Reset session data when starting a new game
        this.resetSession();
        
        this.isPlaying = true;
        this.sessionStartTime = Date.now();
        this.currentRound = 0;
        this.currentTrial = 0;
        this.score = 0;  // Reset score when starting a new game session
        
        this.generateSequenceWithMatches();
        this.interval = setInterval(() => this.nextRound(), this.roundInterval);
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.updateButtonsForMode();
        this.updateButtonLabels();
        this.gameModeSelect.disabled = true;
        this.speedSlider.disabled = true;
    }

    pauseGame() {
        this.isPlaying = false;
        clearInterval(this.interval);
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.positionBtn.disabled = true;
        this.letterBtn.disabled = true;
        this.gameModeSelect.disabled = false;
        this.speedSlider.disabled = false;
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
        
        let positionMatches, letterMatches, colorMatches;
        switch (this.gameMode) {
            case 'dual':
                positionMatches = Math.ceil(targetMatches / 2);
                letterMatches = Math.floor(targetMatches / 2);
                colorMatches = 0;
                break;
            case 'dual-easy':
                positionMatches = Math.ceil(targetMatches / 2);
                letterMatches = Math.floor(targetMatches / 2);
                colorMatches = 0;
                break;
            case 'bro':
                positionMatches = Math.ceil(targetMatches / 2);
                letterMatches = Math.floor(targetMatches / 2);
                colorMatches = 0;
                break;
            case 'position':
                positionMatches = targetMatches;
                letterMatches = 0;
                colorMatches = 0;
                break;
            case 'letter':
                positionMatches = 0;
                letterMatches = targetMatches;
                colorMatches = 0;
                break;
            case 'visual':
                positionMatches = Math.ceil(targetMatches / 2);
                letterMatches = 0;
                colorMatches = Math.floor(targetMatches / 2);
                break;
        }
        
        // Generate sequence based on mode
        if (this.gameMode === 'dual-easy') {
            // For dual-easy mode, generate sequences without lures
            this.generateEasySequence(totalRounds, positionMatches, letterMatches);
        } else if (this.gameMode === 'bro') {
            // Bro mode uses regular dual generation but with motivational feedback
            this.generateRegularSequence(totalRounds, positionMatches, letterMatches, colorMatches);
        } else {
            // For other modes, use standard generation
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
                    letter: this.letters[Math.floor(Math.random() * this.letters.length)],
                    color: this.colors[Math.floor(Math.random() * this.colors.length)]
                });
            }
        }
        
        // Track which rounds have intentional matches
        const positionMatchRounds = new Set();
        const letterMatchRounds = new Set();
        const colorMatchRounds = new Set();
        
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
        
        // Force color matches (for visual mode, on different rounds to avoid overlap)
        let colorCount = 0;
        for (let i = 0; i < matchableRounds.length && colorCount < colorMatches; i++) {
            const round = matchableRounds[i];
            if (!positionMatchRounds.has(round) && !letterMatchRounds.has(round)) { // Skip rounds that already have matches
                this.sequence[round].color = this.sequence[round - this.nBack].color;
                colorMatchRounds.add(round);
                colorCount++;
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
            
            // If this round should NOT have a color match but does
            if (!colorMatchRounds.has(i) && current.color === nBackAgo.color) {
                // Change color to avoid match
                const currentColorIndex = this.colors.indexOf(current.color);
                current.color = this.colors[(currentColorIndex + 1) % this.colors.length];
            }
        }
        
        // Store the actual match counts for validation
        this.actualPositionMatches = positionMatchRounds.size;
        this.actualLetterMatches = letterMatchRounds.size;
        this.actualColorMatches = colorMatchRounds.size;
        
        console.log(`Generated sequence with exactly ${this.actualPositionMatches} position, ${this.actualLetterMatches} letter, and ${this.actualColorMatches} color matches for ${this.trialsPerSession} trials`);
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
        
        // Handle display based on mode
        if (this.gameMode === 'visual') {
            // In visual mode, show color instead of letter
            this.showColor(current.position, current.color);
        } else if (this.gameMode !== 'position') {
            // Only play sound and show letter if not in position-only or visual mode
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
            const colorMatch = current.color === nBackAgo.color;
            
            console.log(`Round ${this.currentRound}: Comparing position ${currentIndex} (${current.position}) with ${nBackIndex} (${nBackAgo.position}) = ${positionMatch}`);
            console.log(`Round ${this.currentRound}: Comparing letter ${currentIndex} (${current.letter}) with ${nBackIndex} (${nBackAgo.letter}) = ${letterMatch}`);
            console.log(`Round ${this.currentRound}: Comparing color ${currentIndex} (${current.color}) with ${nBackIndex} (${nBackAgo.color}) = ${colorMatch}`);
            
            setTimeout(() => this.checkMatches(), this.responseTime);
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
            cell.classList.remove('active', 'visual-mode');
            cell.textContent = '';
            // Only reset custom colors for visual mode, let CSS handle regular mode colors
            if (this.gameMode === 'visual') {
                cell.style.backgroundColor = '#ffb703'; // Reset to default color
                cell.style.border = 'none'; // Reset border
            } else {
                // For non-visual modes, remove any custom styling and let CSS classes handle colors
                cell.style.backgroundColor = '';
                cell.style.border = '';
            }
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

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.updateMuteButton();
    }
    
    updateMuteButton() {
        if (this.isMuted) {
            this.muteBtn.textContent = '🔇';
            this.muteBtn.classList.remove('unmuted');
            this.muteBtn.title = 'Audio is muted (click to unmute)';
        } else {
            this.muteBtn.textContent = '🔊';
            this.muteBtn.classList.add('unmuted');
            this.muteBtn.title = 'Audio is on (click to mute)';
        }
    }

    playSound(letter) {
        // Skip playing sound if muted
        if (this.isMuted) {
            return;
        }
        
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
            
            // Enhanced settings for Samsung devices
            const isSamsung = /Samsung/i.test(navigator.userAgent);
            if (isSamsung) {
                utterance.rate = 0.7;     // Slower for better pronunciation
                utterance.pitch = 1.0;    // Normal pitch for clarity
                utterance.volume = 1.0;   // Maximum volume
            } else {
                utterance.rate = 0.9;
                utterance.pitch = 1.2;
                utterance.volume = 0.8;
            }
            
            // Enhanced audio handling for Samsung devices
            if (isSamsung) {
                // Add small delay to ensure speech synthesis is ready
                setTimeout(() => {
                    // Ensure speech synthesis is not busy
                    if (window.speechSynthesis.speaking) {
                        window.speechSynthesis.cancel();
                    }
                    
                    // Add error handling and retry for Samsung
                    utterance.onerror = (event) => {
                        console.log('Speech synthesis error on Samsung:', event);
                        // Retry once with simpler text
                        setTimeout(() => {
                            const retryUtterance = new SpeechSynthesisUtterance(letter);
                            if (selectedVoice) retryUtterance.voice = selectedVoice;
                            retryUtterance.rate = 0.6;
                            retryUtterance.pitch = 1.0;
                            retryUtterance.volume = 1.0;
                            window.speechSynthesis.speak(retryUtterance);
                        }, 100);
                    };
                    
                    window.speechSynthesis.speak(utterance);
                }, 50);
            } else {
                window.speechSynthesis.speak(utterance);
            }
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
            // Android voice preferences with enhanced Samsung support
            const isSamsung = /Samsung/i.test(navigator.userAgent);
            
            if (isSamsung) {
                // Samsung-specific voice selection for better quality
                preferredVoice = englishVoices.find(voice => 
                    voice.name.toLowerCase().includes('samsung') && 
                    voice.name.toLowerCase().includes('neural') &&
                    voice.lang === 'en-US'
                ) || englishVoices.find(voice => 
                    voice.name.toLowerCase().includes('samsung') && 
                    voice.name.toLowerCase().includes('premium') &&
                    voice.lang === 'en-US'
                ) || englishVoices.find(voice => 
                    voice.name.toLowerCase().includes('samsung') && 
                    voice.name.toLowerCase().includes('high quality') &&
                    voice.lang === 'en-US'
                ) || englishVoices.find(voice => 
                    voice.name.toLowerCase().includes('google') && 
                    voice.lang === 'en-US'
                ) || englishVoices.find(voice => 
                    voice.name.toLowerCase().includes('samsung') && 
                    voice.lang === 'en-US'
                ) || englishVoices.find(voice =>
                    voice.lang === 'en-US' && !voice.localService
                ) || englishVoices.find(voice =>
                    voice.lang === 'en-US'
                );
            } else {
                // General Android voice selection
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
            }
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

        if (e.key === 'a' && !this.positionMatched && (this.gameMode === 'dual' || this.gameMode === 'dual-easy' || this.gameMode === 'bro' || this.gameMode === 'position' || this.gameMode === 'visual')) {
            console.log('A pressed - checking position match');
            this.positionMatched = true;
            this.checkPositionMatch();
        } else if (e.key === 'z' && !this.soundMatched && (this.gameMode === 'dual' || this.gameMode === 'dual-easy' || this.gameMode === 'bro' || this.gameMode === 'letter')) {
            console.log('Z pressed - checking letter match');
            this.soundMatched = true;
            this.checkLetterMatch();
        } else if (e.key === 'z' && !this.soundMatched && this.gameMode === 'visual') {
            console.log('Z pressed - checking color match in visual mode');
            this.soundMatched = true;
            this.checkColorMatch();
        }
    }

    handlePositionClick() {
        if (!this.isPlaying || !this.canRespond || this.positionMatched) {
            console.log(`Position button ignored: playing=${this.isPlaying}, canRespond=${this.canRespond}, already matched=${this.positionMatched}`);
            return;
        }
        console.log('Position button clicked - checking position match');
        this.positionMatched = true;
        
        // Record that user clicked position for current trial
        const currentIndex = this.currentRound - 1;
        this.sequence[currentIndex].userClickedPosition = true;
        
        this.checkPositionMatch();
    }

    handleLetterClick() {
        if (!this.isPlaying || !this.canRespond || this.soundMatched) {
            console.log(`Letter/Color button ignored: playing=${this.isPlaying}, canRespond=${this.canRespond}, already matched=${this.soundMatched}`);
            return;
        }
        
        if (this.gameMode === 'visual') {
            console.log('Color button clicked - checking color match');
            this.soundMatched = true;
            
            // Record that user clicked color for current trial
            const currentIndex = this.currentRound - 1;
            this.sequence[currentIndex].userClickedColor = true;
            
            this.checkColorMatch();
        } else {
            console.log('Letter button clicked - checking letter match');
            this.soundMatched = true;
            
            // Record that user clicked letter for current trial
            const currentIndex = this.currentRound - 1;
            this.sequence[currentIndex].userClickedLetter = true;
            
            this.checkLetterMatch();
        }
    }

    handleModeChange() {
        if (this.isPlaying) return;
        
        this.gameMode = this.gameModeSelect.value;
        this.resetSession();
        this.updateButtonsForMode();
        this.updateScoreDisplays();
        this.updateButtonLabels();
        this.updateInstructions();
        console.log(`Game mode changed to: ${this.gameMode}`);
    }

    // Supplement tracking moved to dashboard - no longer handled in main interface

    handleSpeedChange() {
        if (this.isPlaying) return;
        
        this.gameSpeed = parseInt(this.speedSlider.value);
        
        // Speed mapping: 1=Very Slow (5s), 2=Slow (4s), 3=Normal (3s), 4=Fast (2s), 5=Very Fast (1.5s)
        const speedMap = {
            1: { interval: 5000, response: 4500, label: 'Very Slow (5.0s)' },
            2: { interval: 4000, response: 3500, label: 'Slow (4.0s)' },
            3: { interval: 3000, response: 2500, label: 'Normal (3.0s)' },
            4: { interval: 2000, response: 1500, label: 'Fast (2.0s)' },
            5: { interval: 1500, response: 1000, label: 'Very Fast (1.5s)' }
        };
        
        const speedConfig = speedMap[this.gameSpeed];
        this.roundInterval = speedConfig.interval;
        this.responseTime = speedConfig.response;
        
        this.speedValue.textContent = speedConfig.label;
        
        console.log(`Speed changed to: ${speedConfig.label}`);
    }

    handleRightClick(e) {
        // Prevent context menu from appearing during gameplay
        if (this.isPlaying && this.canRespond) {
            e.preventDefault();
            return false;
        }
    }

    handleMouseDown(e) {
        // Handle right mouse button (button 2) as Letter (Z) input
        if (e.button === 2 && this.isPlaying && this.canRespond && !this.soundMatched && this.gameMode !== 'position') {
            e.preventDefault();
            console.log('Right mouse button clicked - checking letter match');
            
            // Visually activate the Letter (Z) button
            this.triggerButtonVisualFeedback(this.letterBtn);
            
            this.soundMatched = true;
            
            // Record that user clicked letter for current trial
            const currentIndex = this.currentRound - 1;
            this.sequence[currentIndex].userClickedLetter = true;
            
            this.checkLetterMatch();
            return false;
        }
    }

    triggerButtonVisualFeedback(button) {
        // Add visual click effect to button
        if (button && !button.disabled) {
            button.style.transform = 'scale(0.98)';
            button.style.transition = 'transform 0.1s ease';
            
            // Reset the visual effect after a short delay
            setTimeout(() => {
                button.style.transform = '';
                button.style.transition = '';
            }, 150);
        }
    }

    checkTrialCompletion() {
        // Check if the current trial was completed successfully
        // A trial is successful if the user correctly identified or didn't identify matches
        
        if (this.currentRound <= this.nBack) return; // Can't have matches in first N trials
        
        const currentIndex = this.currentRound - 1;
        const nBackIndex = currentIndex - this.nBack;
        const current = this.sequence[currentIndex];
        const nBackAgo = this.sequence[nBackIndex];
        
        const hasPositionMatch = current.position === nBackAgo.position;
        const hasLetterMatch = current.letter === nBackAgo.letter;
        
        let trialCorrect = true;
        
        // Check position accuracy based on game mode
        if (this.gameMode === 'dual' || this.gameMode === 'dual-easy' || this.gameMode === 'bro' || this.gameMode === 'position') {
            const userClickedPosition = this.sequence[currentIndex].userClickedPosition || false;
            if (hasPositionMatch !== userClickedPosition) {
                trialCorrect = false;
            }
        }
        
        // Check letter accuracy based on game mode  
        if (this.gameMode === 'dual' || this.gameMode === 'dual-easy' || this.gameMode === 'bro' || this.gameMode === 'letter') {
            const userClickedLetter = this.sequence[currentIndex].userClickedLetter || false;
            if (hasLetterMatch !== userClickedLetter) {
                trialCorrect = false;
            }
        }
        
        // Check color accuracy for visual mode
        if (this.gameMode === 'visual') {
            const hasColorMatch = current.color === nBackAgo.color;
            const userClickedColor = this.sequence[currentIndex].userClickedColor || false;
            if (hasColorMatch !== userClickedColor) {
                trialCorrect = false;
            }
        }
        
        if (trialCorrect) {
            this.correctTrials++;
            console.log(`Trial ${this.currentRound} CORRECT! Total correct trials: ${this.correctTrials}`);
        } else {
            console.log(`Trial ${this.currentRound} INCORRECT! Total correct trials: ${this.correctTrials}`);
        }
        
        this.updateScore();
    }


    checkMatches() {
        // This method is called after the response time expires for each trial
        // It evaluates the trial completion and moves to the next round
        this.checkTrialCompletion();
    }

    updateButtonsForMode() {
        if (!this.isPlaying) {
            this.positionBtn.disabled = true;
            this.letterBtn.disabled = true;
            return;
        }
        
        switch (this.gameMode) {
            case 'dual':
            case 'dual-easy':
            case 'bro':
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
            case 'visual':
                this.positionBtn.disabled = false;
                this.letterBtn.disabled = false;
                this.positionBtn.style.display = 'block';
                this.letterBtn.style.display = 'block';
                break;
        }
    }
    
    updateButtonLabels() {
        // Update button text based on game mode
        if (this.gameMode === 'visual') {
            this.positionBtn.textContent = 'Position';
            this.letterBtn.textContent = 'Color';
        } else {
            this.positionBtn.textContent = 'Position';
            this.letterBtn.textContent = 'Letter';
        }
    }
    
    updateInstructions() {
        const instructionsText = document.getElementById('instructions-text');
        const positionInstruction = document.getElementById('position-instruction');
        const secondModalityInstruction = document.getElementById('second-modality-instruction');
        
        if (!instructionsText) return; // Instructions may not be present on all pages
        
        switch (this.gameMode) {
            case 'dual':
                instructionsText.textContent = 'Watch the grid for position and letters.';
                positionInstruction.innerHTML = 'Press <kbd>A</kbd> if the current position matches the position from N steps back.';
                secondModalityInstruction.innerHTML = 'Press <kbd>Z</kbd> if the current letter matches the letter from N steps back.';
                break;
            case 'dual-easy':
                instructionsText.textContent = 'Watch the grid for position and letters (easier version).';
                positionInstruction.innerHTML = 'Press <kbd>A</kbd> if the current position matches the position from N steps back.';
                secondModalityInstruction.innerHTML = 'Press <kbd>Z</kbd> if the current letter matches the letter from N steps back.';
                break;
            case 'bro':
                instructionsText.textContent = 'Yo soldier! Train your brain like you train your muscles! 💪';
                positionInstruction.innerHTML = 'Press <kbd>A</kbd> if the current position matches the position from N steps back.';
                secondModalityInstruction.innerHTML = 'Press <kbd>Z</kbd> if the current letter matches the letter from N steps back.';
                break;
            case 'position':
                instructionsText.textContent = 'Watch the grid for position only.';
                positionInstruction.innerHTML = 'Press <kbd>A</kbd> if the current position matches the position from N steps back.';
                secondModalityInstruction.style.display = 'none';
                break;
            case 'letter':
                instructionsText.textContent = 'Listen for letters (position follows clockwise pattern).';
                positionInstruction.style.display = 'none';
                secondModalityInstruction.innerHTML = 'Press <kbd>Z</kbd> if the current letter matches the letter from N steps back.';
                break;
            case 'visual':
                instructionsText.textContent = 'Watch the grid for position and colors.';
                positionInstruction.innerHTML = 'Press <kbd>A</kbd> if the current position matches the position from N steps back.';
                secondModalityInstruction.innerHTML = 'Press <kbd>Z</kbd> if the current color matches the color from N steps back.';
                break;
        }
        
        // Reset display for all instructions
        if (this.gameMode !== 'position') {
            positionInstruction.style.display = 'block';
        }
        if (this.gameMode !== 'letter') {
            secondModalityInstruction.style.display = 'block';
        }
    }

    updateScore() {
        // Score is the total number of matches found based on game mode
        if (this.gameMode === 'visual') {
            this.score = this.positionCorrect + this.colorCorrect;
        } else {
            this.score = this.positionCorrect + this.letterCorrect;
        }
        
        // Calculate total possible matches based on sequence generation
        const availablePositionMatches = this.actualPositionMatches || 0;
        const availableLetterMatches = this.actualLetterMatches || 0;
        const availableColorMatches = this.actualColorMatches || 0;
        
        let totalPossibleMatches;
        if (this.gameMode === 'visual') {
            totalPossibleMatches = availablePositionMatches + availableColorMatches;
        } else {
            totalPossibleMatches = availablePositionMatches + availableLetterMatches;
        }
        
        this.scoreValue.textContent = `${this.score}/${totalPossibleMatches}`;
    }

    showLetter(letter) {
        const activeCell = document.querySelector('.grid-cell.active');
        if (activeCell) {
            activeCell.textContent = letter;
            // In non-visual modes, the active cell should maintain its active styling
            // The CSS .grid-cell.active class will handle the background color
        }
    }
    
    showColor(position, color) {
        const cell = this.gridContainer.children[position];
        if (cell) {
            cell.style.backgroundColor = color;
            cell.style.border = '3px solid white';
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
            this.positionCorrect++;
            this.showFeedback(true, 'position');
            console.log(`Position CORRECT! Total matches: ${this.positionCorrect + this.letterCorrect}`);
        } else {
            this.showFeedback(false, 'position');
            console.log(`Position WRONG! Total matches: ${this.positionCorrect + this.letterCorrect}`);
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
            this.letterCorrect++;
            this.showFeedback(true, 'letter');
            console.log(`Letter CORRECT! Total matches: ${this.positionCorrect + this.letterCorrect}`);
        } else {
            this.showFeedback(false, 'letter');
            console.log(`Letter WRONG! Total matches: ${this.positionCorrect + this.letterCorrect}`);
        }
        this.updateScore();
        this.updateScoreDisplays();
    }
    
    checkColorMatch() {
        if (this.currentRound <= this.nBack) return;
        
        const currentIndex = this.currentRound - 1;
        const nBackIndex = currentIndex - this.nBack;
        const current = this.sequence[currentIndex];
        const nBackAgo = this.sequence[nBackIndex];
        
        const isCorrect = current.color === nBackAgo.color;
        this.colorTotal++;
        
        if (isCorrect) {
            this.colorCorrect++;
            this.showFeedback(true, 'color');
            console.log(`Color CORRECT! Total matches: ${this.positionCorrect + this.colorCorrect}`);
        } else {
            this.showFeedback(false, 'color');
            console.log(`Color WRONG! Total matches: ${this.positionCorrect + this.colorCorrect}`);
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
        
        // Show matches found vs. total possible matches, not attempts made
        const availablePositionMatches = this.actualPositionMatches || 0;
        const availableLetterMatches = this.actualLetterMatches || 0;
        
        if (this.positionScoreValue) {
            this.positionScoreValue.textContent = `${this.positionCorrect}/${availablePositionMatches}`;
        }
        if (this.letterScoreValue) {
            this.letterScoreValue.textContent = `${this.letterCorrect}/${availableLetterMatches}`;
        }
        
        // Show/hide scores based on mode
        switch (this.gameMode) {
            case 'dual':
            case 'dual-easy':
            case 'bro':
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
            case 'visual':
                positionScoreDiv.style.display = 'block';
                letterScoreDiv.style.display = 'block';
                // Update the letter score div to show color score in visual mode
                if (this.letterScoreValue) {
                    this.letterScoreValue.textContent = `${this.colorCorrect}/${this.actualColorMatches || 0}`;
                }
                // Update the label text for the score display
                const letterScoreElement = document.getElementById('letter-score');
                if (letterScoreElement) {
                    letterScoreElement.innerHTML = `Color: <span id="letter-score-value">${this.colorCorrect}/${this.actualColorMatches || 0}</span>`;
                }
                break;
        }
    }

    async endSession() {
        this.pauseGame();
        
        // Update final score displays
        this.updateScore();
        this.updateScoreDisplays();
        
        // Track study data if enrolled
        await this.trackStudyData();
        
        // Use the actual match counts from sequence generation
        const availablePositionMatches = this.actualPositionMatches || Math.ceil(Math.floor(this.trialsPerSession * 2 / 3) / 2);
        const availableLetterMatches = this.actualLetterMatches || Math.floor(Math.floor(this.trialsPerSession * 2 / 3) / 2);
        const availableColorMatches = this.actualColorMatches || Math.floor(Math.floor(this.trialsPerSession * 2 / 3) / 2);
        
        let totalAvailableMatches, totalCorrect;
        if (this.gameMode === 'visual') {
            totalAvailableMatches = availablePositionMatches + availableColorMatches;
            totalCorrect = this.positionCorrect + this.colorCorrect;
        } else {
            totalAvailableMatches = availablePositionMatches + availableLetterMatches;
            totalCorrect = this.positionCorrect + this.letterCorrect;
        }
        
        let message = `Session Complete!\n\n`;
        message += `Position matches found: ${this.positionCorrect} (out of ${availablePositionMatches} available)\n`;
        
        if (this.gameMode === 'visual') {
            message += `Color matches found: ${this.colorCorrect} (out of ${availableColorMatches} available)\n`;
        } else {
            message += `Letter matches found: ${this.letterCorrect} (out of ${availableLetterMatches} available)\n`;
        }
        
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
        
        if (this.gameMode === 'bro') {
            this.showBroEndPopup(message, totalCorrect, totalAvailableMatches, perfectScore);
        } else {
            this.showSessionComplete(message, totalCorrect);
        }
        // Don't reset session immediately - let user see the scores
        // Reset will happen when they start a new game
    }

    resetSession() {
        this.score = 0;  // Reset score for each new session/trial
        this.currentTrial = 0;
        this.positionCorrect = 0;
        this.letterCorrect = 0;
        this.positionTotal = 0;
        this.letterTotal = 0;
        this.correctTrials = 0;
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
            currentSupplements: this.currentSupplements.length > 0 ? this.currentSupplements : null,
            trialsCompleted: this.currentTrial,
            totalTrials: this.trialsPerSession,
            positionCorrect: this.positionCorrect,
            positionTotal: this.positionTotal,
            letterCorrect: this.letterCorrect,
            letterTotal: this.letterTotal,
            actualPositionMatches: this.actualPositionMatches,
            actualLetterMatches: this.actualLetterMatches,
            totalScore: this.gameMode === 'visual' ? this.positionCorrect + this.colorCorrect : this.positionCorrect + this.letterCorrect,
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
    
    generateEasySequence(totalRounds, positionMatches, letterMatches) {
        // For dual-easy mode, create sequences that vary on a continuum with no lures
        // This eliminates interference by ensuring clear separation between match/non-match stimuli
        
        this.sequence = [];
        
        // Step 1: Decide which rounds will have matches
        const matchableRounds = [];
        for (let i = this.nBack; i < totalRounds; i++) {
            matchableRounds.push(i);
        }
        
        // Shuffle and select rounds for matches
        const shuffled = [...matchableRounds].sort(() => Math.random() - 0.5);
        const positionMatchRounds = new Set(shuffled.slice(0, positionMatches));
        const letterMatchRounds = new Set(shuffled.slice(positionMatches, positionMatches + letterMatches));
        
        // Step 2: Generate the complete sequence ensuring no lures
        const usedPositions = new Array(totalRounds);
        const usedLetters = new Array(totalRounds);
        
        for (let i = 0; i < totalRounds; i++) {
            let position, letter;
            
            if (i >= this.nBack && positionMatchRounds.has(i)) {
                // This round should have a position match
                position = usedPositions[i - this.nBack];
            } else {
                // Generate a position that doesn't create lures
                do {
                    position = Math.floor(Math.random() * (this.gridSize * this.gridSize));
                } while (this.wouldCreateLure(usedPositions, i, position));
            }
            
            if (i >= this.nBack && letterMatchRounds.has(i)) {
                // This round should have a letter match
                letter = usedLetters[i - this.nBack];
            } else {
                // Generate a letter that doesn't create lures
                do {
                    letter = this.letters[Math.floor(Math.random() * this.letters.length)];
                } while (this.wouldCreateLure(usedLetters, i, letter));
            }
            
            usedPositions[i] = position;
            usedLetters[i] = letter;
            
            this.sequence.push({
                position: position,
                letter: letter,
                color: this.colors[Math.floor(Math.random() * this.colors.length)]
            });
        }
        
        // Store actual match counts
        this.actualPositionMatches = positionMatchRounds.size;
        this.actualLetterMatches = letterMatchRounds.size;
        this.actualColorMatches = 0;
        
        console.log(`Generated EASY sequence with exactly ${this.actualPositionMatches} position and ${this.actualLetterMatches} letter matches for ${this.trialsPerSession} trials (no lures)`);
    }
    
    wouldCreateLure(array, currentIndex, value) {
        // Check if this value would create a lure (appear within n steps but not exactly n steps back)
        for (let lookback = 1; lookback <= this.nBack; lookback++) {
            const checkIndex = currentIndex - lookback;
            if (checkIndex >= 0 && array[checkIndex] === value) {
                if (lookback !== this.nBack) {
                    // This would be a lure (same value but not n-back)
                    return true;
                }
            }
        }
        return false;
    }
    
    hasRecentValue(array, currentIndex, value, lookbackRange) {
        // Check if value appears in the recent history to avoid lures
        const startIndex = Math.max(0, currentIndex - lookbackRange + 1);
        for (let i = startIndex; i < currentIndex; i++) {
            if (array[i] === value) {
                return true;
            }
        }
        return false;
    }
    
    showBroStartPopup() {
        // Array of short motivational messages
        const messages = [
            {
                title: 'READY FOR WAR! 🫡',
                message: `Time to pump that BRAIN, soldier!\n\nDOMINATE those patterns! OORAH! 🧠💪`
            },
            {
                title: 'BRAIN BOOT CAMP! 💀',
                message: `What do you call a lazy brain cell? UNEMPLOYED!\n\nLet's fix that! MOVE IT! 🔥`
            },
            {
                title: 'OPERATION: FOCUS! 🎖️',
                message: `Your mission: CRUSH these patterns!\n\nLock and load those NEURONS! 💪🎯`
            },
            {
                title: 'MENTAL MAYHEM! ⚡',
                message: `Why don't brain cells get lost?\nThey know their POSITION!\n\nTIME TO DOMINATE! 🧠`
            }
        ];
        
        // Select random message
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        this.showMotivationalPopup(
            randomMessage.title,
            randomMessage.message,
            'LET\'S GO! 🚀',
            () => this.actuallyStartGame()
        );
    }
    
    showBroEndPopup(message, totalCorrect, totalAvailableMatches, perfectScore) {
        let broMessage;
        let title;
        
        // Performance-based feedback
        if (perfectScore) {
            title = 'MISSION ACCOMPLISHED! 🏆';
            broMessage = `PERFECT SCORE! You're a CHAMPION!\n\nYour brain is now SWOLE! 💪🔥`;
        } else if (totalCorrect / totalAvailableMatches >= 0.8) {
            title = 'EXCELLENT WORK! 💪';
            broMessage = `${totalCorrect}/${totalAvailableMatches} - SOLID performance!\n\nYour mental muscles are getting STRONGER! 🧠`;
        } else if (totalCorrect / totalAvailableMatches >= 0.6) {
            title = 'GOOD PROGRESS! 👍';
            broMessage = `${totalCorrect}/${totalAvailableMatches} - You're improving!\n\nKeep grinding, soldier! 💪`;
        } else if (totalCorrect / totalAvailableMatches >= 0.4) {
            title = 'NEEDS IMPROVEMENT! 😠';
            broMessage = `${totalCorrect}/${totalAvailableMatches}?! Come on!\n\nTime for more BRAIN PUSHUPS! 💪⚡`;
        } else {
            title = 'MISSION FAILED! 🚨';
            broMessage = `${totalCorrect}/${totalAvailableMatches}?! OUCH!\n\nEven my GRANDMA could beat that!\nTime for BOOT CAMP! 🔥`;
        }
        
        this.showMotivationalPopup(title, broMessage, 'TRAIN AGAIN!', () => this.resetGame());
    }
    
    showMotivationalPopup(title, message, buttonText, callback) {
        // Create clean, minimal popup
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease-in;
        `;
        
        const popupContent = document.createElement('div');
        popupContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 320px;
            width: 90%;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease-out;
        `;
        
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            margin: 0 0 12px 0;
            color: #2c3e50;
            font-size: 1.3em;
            font-weight: bold;
        `;
        
        const messageEl = document.createElement('p');
        messageEl.style.cssText = `
            margin: 0 0 20px 0;
            color: #555;
            font-size: 0.95em;
            line-height: 1.4;
            white-space: pre-line;
        `;
        messageEl.textContent = message;
        
        const button = document.createElement('button');
        button.textContent = buttonText;
        button.style.cssText = `
            background: #3498db;
            color: white;
            padding: 10px 24px;
            border: none;
            border-radius: 6px;
            font-size: 0.95em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        button.onmouseover = () => {
            button.style.background = '#2980b9';
            button.style.transform = 'translateY(-1px)';
        };
        
        button.onmouseout = () => {
            button.style.background = '#3498db';
            button.style.transform = 'translateY(0)';
        };
        
        button.onclick = () => {
            document.body.removeChild(popup);
            if (callback) callback();
        };
        
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { transform: scale(0.9) translateY(-20px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        popupContent.appendChild(titleEl);
        popupContent.appendChild(messageEl);
        popupContent.appendChild(button);
        popup.appendChild(popupContent);
        document.body.appendChild(popup);
        
        // Auto-remove style element after animation
        setTimeout(() => {
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        }, 500);
    }
    
    generateRegularSequence(totalRounds, positionMatches, letterMatches, colorMatches) {
        // Generate regular dual n-back sequence (used by bro mode)
        this.sequence = [];
        
        // Initialize with random values
        for (let i = 0; i < totalRounds; i++) {
            this.sequence.push({
                position: Math.floor(Math.random() * (this.gridSize * this.gridSize)),
                letter: this.letters[Math.floor(Math.random() * this.letters.length)],
                color: this.colors[Math.floor(Math.random() * this.colors.length)]
            });
        }
        
        // Place matches randomly
        const matchableRounds = [];
        for (let i = this.nBack; i < totalRounds; i++) {
            matchableRounds.push(i);
        }
        
        // Shuffle and place position matches
        const shuffled = [...matchableRounds].sort(() => Math.random() - 0.5);
        for (let i = 0; i < positionMatches && i < shuffled.length; i++) {
            const round = shuffled[i];
            this.sequence[round].position = this.sequence[round - this.nBack].position;
        }
        
        // Place letter matches
        const remainingRounds = shuffled.slice(positionMatches);
        for (let i = 0; i < letterMatches && i < remainingRounds.length; i++) {
            const round = remainingRounds[i];
            this.sequence[round].letter = this.sequence[round - this.nBack].letter;
        }
        
        // Store actual counts
        this.actualPositionMatches = positionMatches;
        this.actualLetterMatches = letterMatches;
        this.actualColorMatches = colorMatches || 0;
    }
}

const game = new DualNBackGame();