'use strict';

// JSON data loading
let curriculumData = null;

async function loadCurriculum() {
    try {
        const response = await fetch('curriculum.json');
        curriculumData = await response.json();
        console.log('Curriculum loaded successfully!', curriculumData);
        return curriculumData;
    } catch (error) {
        console.error('Could not load curriculum:', error);
        // Fallback to minimal hardcoded data if JSON fails
        curriculumData = {
            techniques: [],
            encouragingMessages: ["أحسنت! 🌟", "رائع! 🎉", "ممتاز! 👏"]
        };
        return curriculumData;
    }
}

// Theme Manager
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('phonics-theme') || 'default';
        this.applyTheme(this.currentTheme);
        this.initThemeSelector();
    }

    applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        this.currentTheme = themeName;
        localStorage.setItem('phonics-theme', themeName);
        
        // Update active theme button
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === themeName);
        });
    }

    initThemeSelector() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyTheme(btn.dataset.theme);
                this.createThemeChangeEffect();
            });
        });
    }

    createThemeChangeEffect() {
        // Create a brief flash effect when changing themes
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.3);
            z-index: 9999;
            pointer-events: none;
            animation: theme-flash 0.3s ease-out;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes theme-flash {
                0% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.remove();
            style.remove();
        }, 300);
    }
}

// Enhanced Audio Manager with Dopamine Sounds
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
            this.enabled = false;
        }
    }

    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    playSuccessSound() {
        if (!this.enabled) return;
        this.resumeAudioContext();
        
        // Happy ascending notes
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        frequencies.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.1, 'sine'), i * 100);
        });
    }

    playCorrectAnswer() {
        if (!this.enabled) return;
        this.resumeAudioContext();
        
        // Quick positive chirp
        this.playTone(880, 0.15, 'sine'); // A5
        setTimeout(() => this.playTone(1108.73, 0.1, 'sine'), 100); // C#6
    }

    playWrongAnswer() {
        if (!this.enabled) return;
        this.resumeAudioContext();
        
        // Gentle descending tone
        this.playTone(440, 0.2, 'triangle', 0.3);
        setTimeout(() => this.playTone(369.99, 0.15, 'triangle', 0.2), 150);
    }

    playButtonClick() {
        if (!this.enabled) return;
        this.resumeAudioContext();
        
        // Subtle click
        this.playTone(1000, 0.05, 'square', 0.1);
    }

    playAchievement() {
        if (!this.enabled) return;
        this.resumeAudioContext();
        
        // Triumphant fanfare
        const melody = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        melody.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine'), i * 150);
        });
        
        // Add sparkle effect
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => this.playTone(2093 + Math.random() * 200, 0.05, 'sine', 0.3), i * 50);
            }
        }, 600);
    }

    playTone(frequency, duration, waveType = 'sine', volume = 0.1) {
        if (!this.audioContext || !this.enabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = waveType;

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
}

// Toned Down Effects Manager
class EffectsManager {
    constructor() {
        this.particleContainer = document.getElementById('particles-container');
        this.soundManager = new SoundManager();
    }

    createParticleExplosion(x, y, count = 8) { // Reduced from 15 to 8
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const dx = (Math.random() - 0.5) * 200; // Reduced from 300 to 200
            const dy = (Math.random() - 0.5) * 200;
            
            particle.style.cssText = `
                left: ${x}px;
                top: ${y}px;
                --dx: ${dx}px;
                --dy: ${dy}px;
                background: hsl(${Math.random() * 360}, 70%, 60%);
            `;
            
            this.particleContainer.appendChild(particle);
            
            setTimeout(() => particle.remove(), 2000);
        }
    }

    createFloatingEmoji(emoji, x, y) {
        const element = document.createElement('div');
        element.className = 'floating-emoji';
        element.textContent = emoji;
        element.style.left = `${x || Math.random() * window.innerWidth}px`;
        element.style.top = `${y || window.innerHeight - 100}px`;
        
        document.body.appendChild(element);
        setTimeout(() => element.remove(), 3000); // Reduced from 4000 to 3000
    }

    createCelebrationBurst() {
        const emojis = ['🎉', '⭐', '✨', '🌟']; // Reduced emoji variety
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Smaller particle explosion
        this.createParticleExplosion(centerX, centerY, 12); // Reduced from 25 to 12
        
        // Fewer floating emojis
        for (let i = 0; i < 8; i++) { // Reduced from 15 to 8
            setTimeout(() => {
                const x = centerX + (Math.random() - 0.5) * 300; // Reduced spread
                const y = centerY + (Math.random() - 0.5) * 150;
                this.createFloatingEmoji(
                    emojis[Math.floor(Math.random() * emojis.length)], 
                    x, y
                );
            }, i * 120); // Slightly faster timing
        }
        
        // Play achievement sound
        this.soundManager.playAchievement();
    }

    createQuickCelebration() {
        // Mini celebration for correct answers
        const emojis = ['⭐', '✨'];
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createFloatingEmoji(
                    emojis[Math.floor(Math.random() * emojis.length)],
                    window.innerWidth / 2 + (Math.random() - 0.5) * 200,
                    window.innerHeight / 2
                );
            }, i * 100);
        }
        
        this.soundManager.playCorrectAnswer();
    }

    createSuccessRipple(element) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(72, 187, 120, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = rect.left + rect.width/2 - size/2 + 'px';
        ripple.style.top = rect.top + rect.height/2 - size/2 + 'px';
        
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
        
        // Add ripple animation style if not exists
        if (!document.getElementById('ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        this.soundManager.playSuccessSound();
    }

    playWrongSound() {
        this.soundManager.playWrongAnswer();
    }

    playClickSound() {
        this.soundManager.playButtonClick();
    }
}

// Data Management
class DataManager {
    constructor() {
        this.isLoaded = false;
    }

    async init() {
        if (!curriculumData) {
            await loadCurriculum();
        }
        this.isLoaded = true;
    }

    getTechniques() {
        return curriculumData?.techniques || [];
    }

    getTechnique(id) {
        return this.getTechniques().find(t => t.id === id);
    }

    getSubSkill(techniqueId, subSkillId) {
        const technique = this.getTechnique(techniqueId);
        return technique ? technique.subSkills.find(s => s.id === subSkillId) : null;
    }

    getRandomEncouragement() {
        const messages = curriculumData?.encouragingMessages || ["أحسنت! 🌟"];
        return messages[Math.floor(Math.random() * messages.length)];
    }
}

// Audio Management
class AudioManager {
    constructor() {
        this.voice = null;
        this.init();
    }

    init() {
        if (!('speechSynthesis' in window)) return;
        
        this.loadVoices();
        
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        this.voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                     voices.find(v => v.lang.startsWith('en-US')) ||
                     voices.find(v => v.lang.startsWith('en'));
    }

    speak(text) {
        try {
            if (!('speechSynthesis' in window) || !text) return;
            
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            
            if (this.voice) utterance.voice = this.voice;
            
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Speech synthesis error:', error);
        }
    }
}

// State Management
class StateManager {
    constructor() {
        this.userProgress = {
            points: 0,
            streak: 0,
            lastVisit: null,
            techniques: {}
        };
        this.currentTechniqueId = null;
        this.activitySession = {};
        this.loadProgress();
    }

    saveProgress() {
        try {
            localStorage.setItem('modernPhonicsProgress', JSON.stringify(this.userProgress));
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('modernPhonicsProgress');
            if (saved) {
                this.userProgress = JSON.parse(saved);
            }
            this.updateStreak();
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastVisit = this.userProgress.lastVisit;
        
        if (!lastVisit) {
            this.userProgress.streak = 1;
        } else if (lastVisit !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            if (lastVisit === yesterday) {
                this.userProgress.streak++;
            } else {
                this.userProgress.streak = 1;
            }
        }
        
        this.userProgress.lastVisit = today;
        this.saveProgress();
    }

    addPoints(points) {
        this.userProgress.points += points;
        this.saveProgress();
    }

    getTechniqueProgress(techniqueId) {
        if (!this.userProgress.techniques[techniqueId]) {
            this.userProgress.techniques[techniqueId] = {
                id: techniqueId,
                mastered: false,
                subSkills: {}
            };
        }
        return this.userProgress.techniques[techniqueId];
    }

    markStepComplete(techniqueId, subSkillId, step) {
        const techProgress = this.getTechniqueProgress(techniqueId);
        
        if (!techProgress.subSkills[subSkillId]) {
            techProgress.subSkills[subSkillId] = [];
        }
        
        if (!techProgress.subSkills[subSkillId].includes(step)) {
            techProgress.subSkills[subSkillId].push(step);
            this.addPoints(10);
            this.saveProgress();
        }
        
        return techProgress;
    }

    markTechniqueMastered(techniqueId) {
        const techProgress = this.getTechniqueProgress(techniqueId);
        techProgress.mastered = true;
        this.addPoints(50);
        this.saveProgress();
    }

    isTechniqueUnlocked(techniqueIndex, techniques) {
        // First technique is always unlocked
        if (techniqueIndex === 0) return true;
        
        // Check if previous technique is mastered
        const prevTechnique = techniques[techniqueIndex - 1];
        const prevProgress = this.getTechniqueProgress(prevTechnique.id);
        return prevProgress.mastered;
    }
}

// Enhanced UI Management
class UIManager {
    constructor(dataManager, stateManager, audioManager, effectsManager) {
        this.data = dataManager;
        this.state = stateManager;
        this.audio = audioManager;
        this.effects = effectsManager;
        this.elements = {};
        this.initElements();
    }

    initElements() {
        const ids = [
            'splash-screen', 'start-btn', 'app', 'main-title', 'skills-view', 'technique-view',
            'skills-tree', 'back-btn', 'subskills-container', 'activity-modal', 'modal-title',
            'modal-progress', 'modal-body', 'modal-feedback', 'modal-action-btn', 'modal-exit-btn',
            'success-modal', 'success-message', 'success-reward', 'success-close-btn',
            'points-display', 'streak-count'
        ];
        
        ids.forEach(id => {
            this.elements[id.replace(/-/g, '_')] = document.getElementById(id);
        });
        
        this.updateHeader();
    }

    updateHeader() {
        this.elements.points_display.textContent = `${this.state.userProgress.points} نقطة ⭐`;
        this.elements.streak_count.textContent = this.state.userProgress.streak;
        
        // Add points animation
        this.elements.points_display.classList.add('celebration');
        setTimeout(() => this.elements.points_display.classList.remove('celebration'), 600);
    }

    showView(viewName) {
        [this.elements.skills_view, this.elements.technique_view].forEach(v => v.classList.add('hidden'));
        
        if (viewName === 'skills') {
            this.elements.main_title.textContent = "اختر مهارة";
            this.elements.skills_view.classList.remove('hidden');
        } else if (viewName === 'technique') {
            this.elements.technique_view.classList.remove('hidden');
        }
    }

    renderSkillsGrid() {
        const skillsTree = this.elements.skills_tree;
        skillsTree.innerHTML = '';
        
        const techniques = this.data.getTechniques();
        
        // Organize techniques into rows for tree layout
        const rows = [
            [techniques[0]], // Magic E
            [techniques[1], techniques[2]], // Team Sounds, Soft Sounds
            [techniques[3]], // R-Controlled
            [techniques[4], techniques[5]], // Digraphs, Advanced Vowel Teams
            [techniques[6]] // Production Drills
        ];

        rows.forEach((row, rowIndex) => {
            const skillRow = document.createElement('div');
            skillRow.className = 'skill-row';
            
            row.forEach((tech, techIndex) => {
                if (!tech) return;
                
                const techniqueIndex = techniques.indexOf(tech);
                const techProgress = this.state.getTechniqueProgress(tech.id);
                const isMastered = techProgress.mastered;
                const isUnlocked = this.state.isTechniqueUnlocked(techniqueIndex, techniques);
                const completedSteps = Object.values(techProgress.subSkills).flat().length;
                const totalSteps = tech.subSkills.length * 3;
                const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

                const card = document.createElement('div');
                card.className = `skill-card ${isMastered ? 'mastered' : ''} ${!isUnlocked ? 'locked' : ''}`;
                card.dataset.techniqueId = tech.id;
                
                card.innerHTML = `
                    <div class="flex items-center justify-between mb-4">
                        <div class="text-4xl">${tech.icon}</div>
                        ${isMastered ? '<span class="achievement-badge">متقن!</span>' : ''}
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2 english-font">${tech.name}</h3>
                    <p class="text-gray-600 mb-4">${tech.name_ar}</p>
                    <div class="progress-bar mb-2">
                        <div class="progress-fill bg-gradient-to-r ${tech.color}" 
                             style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="text-sm text-gray-500">${completedSteps} / ${totalSteps} خطوة</div>
                `;
                
                skillRow.appendChild(card);
                
                // Add connector between cards in the same row
                if (techIndex < row.length - 1) {
                    const connector = document.createElement('div');
                    connector.className = 'skill-connector';
                    skillRow.appendChild(connector);
                }
            });
            
            skillsTree.appendChild(skillRow);
        });
        
        this.showView('skills');
        this.updateHeader();
    }

    renderTechniqueView(techniqueId) {
        const { main_title, subskills_container } = this.elements;
        const tech = this.data.getTechnique(techniqueId);
        const techProgress = this.state.getTechniqueProgress(techniqueId);

        main_title.textContent = tech.name_ar;
        subskills_container.innerHTML = '';

        tech.subSkills.forEach(subSkill => {
            const subSkillProgress = techProgress.subSkills[subSkill.id] || [];
            const card = document.createElement('div');
            card.className = 'skill-card p-4';

            let buttonsHTML = '';
            if (subSkill.isDirectDrill) {
                const drillCompleted = subSkillProgress.includes('drill');
                buttonsHTML = `
                    <div class="flex-grow flex items-center justify-end gap-2">
                        <button class="btn-primary step-button flex-grow ${drillCompleted ? 'opacity-50' : ''}" 
                                data-step="drill" data-subskill-id="${subSkill.id}" 
                                ${drillCompleted ? 'disabled' : ''}>🎯 ابدأ التمرين</button>
                        <button class="step-button ${subSkillProgress.includes('quiz') ? 'completed' : ''}" 
                                data-step="quiz" data-subskill-id="${subSkill.id}" 
                                ${!drillCompleted ? 'disabled' : ''}>🏆 اختبار</button>
                    </div>
                `;
            } else {
                buttonsHTML = `
                    <div class="flex gap-2">
                        <button class="step-button ${subSkillProgress.includes('learn') ? 'completed' : ''}" 
                                data-step="learn" data-subskill-id="${subSkill.id}">📖 تعلم</button>
                        <button class="step-button ${subSkillProgress.includes('drill') ? 'completed' : ''}" 
                                data-step="drill" data-subskill-id="${subSkill.id}" 
                                ${!subSkillProgress.includes('learn') ? 'disabled' : ''}>🎯 تمرين</button>
                        <button class="step-button ${subSkillProgress.includes('quiz') ? 'completed' : ''}" 
                                data-step="quiz" data-subskill-id="${subSkill.id}" 
                                ${!subSkillProgress.includes('drill') ? 'disabled' : ''}>🏆 اختبار</button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="flex items-center justify-between flex-wrap gap-y-4">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">${subSkill.icon}</span>
                        <h3 class="text-xl font-bold text-gray-800">${subSkill.name}</h3>
                    </div>
                    ${buttonsHTML}
                </div>
            `;

            subskills_container.appendChild(card);
        });

        this.showView('technique');
    }

    showModal() {
        this.elements.activity_modal.classList.remove('hidden');
    }

    hideModal() {
        this.elements.activity_modal.classList.add('hidden');
    }

    showSuccessModal(message, reward) {
        this.elements.success_message.textContent = message;
        this.elements.success_reward.textContent = reward;
        this.elements.success_modal.classList.remove('hidden');
        // Celebration effects are now called manually where needed
    }

    hideSuccessModal() {
        this.elements.success_modal.classList.add('hidden');
    }

    showFeedback(isCorrect, container = this.elements.modal_feedback) {
        const message = isCorrect ? this.data.getRandomEncouragement() : "حاول مرة أخرى 💪";
        container.innerHTML = `<span class="${isCorrect ? 'text-green-500' : 'text-red-500'}">${message}</span>`;
        
        if (isCorrect) {
            this.effects.createQuickCelebration(); // Use smaller celebration
        } else {
            this.effects.playWrongSound();
        }
    }
}

// Game Engine
class GameEngine {
    constructor(dataManager, stateManager, uiManager, audioManager, effectsManager) {
        this.data = dataManager;
        this.state = stateManager;
        this.ui = uiManager;
        this.audio = audioManager;
        this.effects = effectsManager;
    }

    runActivity(techniqueId, subSkillId, step) {
        const subSkill = this.data.getSubSkill(techniqueId, subSkillId);
        if (!subSkill) return;

        this.state.activitySession = { techniqueId, subSkillId, step };
        
        this.ui.elements.modal_progress.innerHTML = '';
        this.ui.elements.modal_exit_btn.style.display = 'none';
        this.ui.elements.modal_action_btn.style.display = 'inline-block';
        this.ui.elements.modal_action_btn.onclick = null;

        if (subSkill.isDirectDrill && step === 'drill') {
            this.startSession(subSkill, step);
        } else {
            switch(step) {
                case 'learn':
                    this.renderLearnActivity(subSkill);
                    break;
                case 'drill':
                case 'quiz':
                    this.startSession(subSkill, step);
                    break;
            }
        }

        this.ui.showModal();
    }

    renderLearnActivity(subSkill) {
        this.ui.elements.modal_title.innerHTML = `<span class="text-4xl mr-3">${subSkill.icon}</span> ${subSkill.name}`;
        this.ui.elements.modal_action_btn.textContent = "فهمت! 💪";

        if (!subSkill.examples || subSkill.examples.length === 0) {
            this.ui.elements.modal_body.innerHTML = `<div class="text-lg text-gray-700 mb-8">${subSkill.learn_info}</div>`;
            return;
        }

        const examplesHTML = subSkill.examples.map(ex => `
            <div class="bg-white p-4 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
                <div class="flex items-center justify-center gap-4">
                    <div class="text-center">
                        <div class="text-3xl english-font mb-2">${ex.before}</div>
                        <button class="speaker-btn" data-speak="${ex.before}" aria-label="Listen to ${ex.before}">
                            <svg class="w-8 h-8 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/>
                                <path d="M14 10a4 4 0 00-4-4v8a4 4 0 004-4z"/>
                            </svg>
                        </button>
                    </div>
                    ${ex.before !== ex.after ? `<span class="text-3xl">➡️</span>
                    <div class="text-center">
                        <div class="text-3xl english-font font-bold text-purple-600 mb-2">${ex.after}</div>
                        <button class="speaker-btn" data-speak="${ex.after}" aria-label="Listen to ${ex.after}">
                            <svg class="w-8 h-8 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/>
                                <path d="M14 10a4 4 0 00-4-4v8a4 4 0 004-4z"/>
                            </svg>
                        </button>
                    </div>` : ''}
                </div>
            </div>
        `).join('');

        this.ui.elements.modal_body.innerHTML = `
            <div class="text-lg text-gray-700 mb-8">${subSkill.learn_info}</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${examplesHTML}</div>
        `;
    }

    startSession(subSkill, step) {
        const data = step === 'drill' ? subSkill.drill : subSkill.quiz;
        
        this.ui.elements.modal_title.textContent = step === 'drill' ? '🎯 التمرين' : '🏆 الاختبار';
        this.ui.elements.modal_action_btn.style.display = 'none';
        this.ui.elements.modal_exit_btn.style.display = 'inline-block';

        let questions = this.prepareQuestions(subSkill, data);
        this.state.activitySession.questions = this.shuffleArray(questions).slice(0, 5);
        this.state.activitySession.currentIndex = 0;
        this.state.activitySession.correctAnswers = 0;

        this.renderCurrentQuestion();
    }

    shuffleArray(array) {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }

    prepareQuestions(subSkill, data) {
        if (data.type === 'sort') {
            return [
                ...data.correct.map(w => ({ word: w, isCorrect: true })),
                ...data.incorrect.map(w => ({ word: w, isCorrect: false }))
            ];
        } else {
            return data.questions || data.pairs?.map(p => ({ pair: p })) || [];
        }
    }

    renderCurrentQuestion() {
        const { questions, currentIndex } = this.state.activitySession;
        const q = questions[currentIndex];

        this.ui.elements.modal_feedback.innerHTML = '';
        this.ui.elements.modal_action_btn.style.display = 'none';

        this.ui.elements.modal_progress.innerHTML = `
            <div class="flex gap-2">
                ${questions.map((_, i) => `
                    <span class="progress-dot ${i < currentIndex ? 'completed' : ''} ${i === currentIndex ? 'pulse' : ''}"></span>
                `).join('')}
            </div>
        `;

        const { step, subSkillId, techniqueId } = this.state.activitySession;
        const subSkill = this.data.getSubSkill(techniqueId, subSkillId);
        const data = step === 'drill' ? subSkill.drill : subSkill.quiz;

        const renderer = new QuestionRenderer(this.ui, this.audio, this, this.effects);
        renderer.render(data.type || 'quiz', q, data, subSkill);
    }

    handleAnswer(isCorrect, element) {
        this.ui.showFeedback(isCorrect);
        
        if (element) {
            element.classList.add(isCorrect ? 'correct' : 'incorrect');
            if (isCorrect) {
                this.effects.createSuccessRipple(element);
            }
        }

        if (isCorrect) {
            document.querySelectorAll('.option-button, #action-btn, .letter-choice').forEach(b => b.style.pointerEvents = 'none');
            
            this.state.activitySession.correctAnswers++;
            this.state.activitySession.currentIndex++;
            
            this.ui.elements.modal_action_btn.style.display = 'inline-block';
            
            if (this.state.activitySession.currentIndex < this.state.activitySession.questions.length) {
                this.ui.elements.modal_action_btn.textContent = "التالي ➡️";
                this.ui.elements.modal_action_btn.onclick = () => this.renderCurrentQuestion();
            } else {
                this.ui.elements.modal_action_btn.textContent = "إنهاء 🎉";
                this.ui.elements.modal_action_btn.onclick = () => this.endSession();
            }
        } else {
            if (element) {
                element.style.pointerEvents = 'none';
                setTimeout(() => {
                    element.classList.remove('incorrect');
                    element.style.pointerEvents = 'auto';
                }, 1000);
            }
        }
    }

    endSession() {
        const { techniqueId, subSkillId, step } = this.state.activitySession;
        const subSkill = this.data.getSubSkill(techniqueId, subSkillId);

        if (step === 'learn') {
            this.state.markStepComplete(techniqueId, subSkillId, step);
            this.ui.hideModal();
            this.ui.showSuccessModal('أحسنت! لقد أكملت الدرس', '+10 نقاط ⭐');
            this.effects.soundManager.playSuccessSound();
            setTimeout(() => {
                this.ui.hideSuccessModal();
                this.ui.renderTechniqueView(techniqueId);
            }, 2000);
            return;
        }

        const { correctAnswers, questions } = this.state.activitySession;
        const pass = (correctAnswers / questions.length) >= 0.8;

        if (pass) {
            if (subSkill.isDirectDrill) {
                this.state.markStepComplete(techniqueId, subSkillId, 'learn');
            }
            
            const techProgress = this.state.markStepComplete(techniqueId, subSkillId, step);
            const technique = this.data.getTechnique(techniqueId);
            
            const allSubSkillsMastered = technique.subSkills.every(ss => 
                (this.state.getTechniqueProgress(techniqueId).subSkills[ss.id] || []).length === 3
            );

            if (allSubSkillsMastered && !techProgress.mastered) {
                this.state.markTechniqueMastered(techniqueId);
                this.ui.hideModal();
                this.ui.showSuccessModal(`لقد أتقنت مهارة ${technique.name_ar}!`, `+50 نقطة 🎊`);
                // Only big celebration for mastering entire technique
                this.effects.createCelebrationBurst();
            } else {
                this.ui.hideModal();
                this.ui.showSuccessModal(
                    step === 'drill' ? 'أحسنت في التمرين!' : 'نجحت في الاختبار!',
                    `+10 نقاط ⭐`
                );
                // Smaller celebration for regular completion
                this.effects.soundManager.playSuccessSound();
            }
        } else {
            this.ui.hideModal();
        }

        this.state.activitySession = {};
        setTimeout(() => {
            this.ui.hideSuccessModal();
            this.ui.renderTechniqueView(techniqueId);
        }, 2000);
    }
}

// Enhanced Question Renderer
class QuestionRenderer {
    constructor(uiManager, audioManager, gameEngine, effectsManager) {
        this.ui = uiManager;
        this.audio = audioManager;
        this.game = gameEngine;
        this.effects = effectsManager;
    }

    render(type, question, data, subSkill) {
        const renderers = {
            'morph': () => this.renderMorph(question, data),
            'sort': () => this.renderSort(question, data),
            'fill_in_blank': () => this.renderFillInBlank(question, data),
            'odd_one_out': () => this.renderOddOneOut(question, data),
            'build_the_word': () => this.renderBuildTheWord(question, data),
            'quiz': () => this.renderQuiz(question, data)
        };

        (renderers[type] || renderers['quiz'])();
    }

    renderMorph(q, data) {
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <div dir="ltr" class="text-6xl english-font font-bold mb-8">
                <span class="text-gray-800">${q.pair[0]}</span>
                <span class="mx-4">➡️</span>
                <span id="target-word" class="text-gray-400">${q.pair[0]}_</span>
            </div>
            <button id="action-btn" class="btn-primary text-3xl">
                ✨ أضف E السحري
            </button>
        `;

        document.getElementById('action-btn').onclick = e => {
            const target = document.getElementById('target-word');
            target.textContent = q.pair[1];
            target.classList.add('text-purple-600', 'celebration');
            this.audio.speak(q.pair[1]);
            this.game.handleAnswer(true, e.target);
        };
    }

    renderSort(q, data) {
        const { word, isCorrect } = q;
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <div class="flex flex-col items-center mb-8">
                <div class="text-5xl english-font font-bold mb-4">${word}</div>
                <button class="speaker-btn" data-speak="${word}" aria-label="Listen to ${word}">
                    <svg class="w-8 h-8 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/>
                        <path d="M14 10a4 4 0 00-4-4v8a4 4 0 004-4z"/>
                    </svg>
                </button>
            </div>
            <div class="flex justify-center gap-4">
                <button class="option-button" data-correct="${isCorrect}">
                    ✅ نعم
                </button>
                <button class="option-button" data-correct="${!isCorrect}">
                    ❌ لا
                </button>
            </div>
        `;

        // Auto-play the word when the question loads
        this.audio.speak(word);

        document.querySelectorAll('.option-button').forEach(btn => {
            btn.onclick = () => {
                const isRight = btn.dataset.correct === 'true';
                this.game.handleAnswer(isRight, btn);
            };
        });
    }

    renderFillInBlank(q, data) {
        const { partial, options, answer, correct } = q;
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <div dir="ltr" class="text-6xl english-font font-bold mb-8">
                ${partial.replace('__', '<span id="blank" class="text-purple-400">__</span>')}
            </div>
            <div class="flex justify-center gap-4">
                ${options.map(opt => `<button class="option-button english-font" data-option="${opt}">${opt}</button>`).join('')}
            </div>
        `;

        document.querySelectorAll('.option-button').forEach(btn => {
            btn.onclick = () => {
                const isCorrect = btn.dataset.option === correct;
                if (isCorrect) {
                    document.getElementById('blank').textContent = correct;
                    this.audio.speak(answer);
                }
                this.game.handleAnswer(isCorrect, btn);
            };
        });
    }

    renderOddOneOut(q, data) {
        const { options, answer } = q;
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <div class="grid grid-cols-2 gap-4">
                ${options.map(opt => `<button class="option-button english-font" data-word="${opt}">${opt}</button>`).join('')}
            </div>
        `;

        document.querySelectorAll('.option-button').forEach(btn => {
            btn.onclick = () => {
                this.audio.speak(btn.dataset.word);
                this.game.handleAnswer(btn.dataset.word === answer, btn);
            };
        });
    }

    renderQuiz(q, data) {
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <button data-speak="${q.audio}" class="speaker-btn mb-8" aria-label="Listen to the word for this question">
                <svg class="w-12 h-12 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/>
                    <path d="M14 10a4 4 0 00-4-4v8a4 4 0 004-4z"/>
                </svg>
            </button>
            <div class="flex flex-col items-center gap-4">
                ${q.options.map(opt => `<button class="option-button english-font w-48" data-word="${opt}">${opt}</button>`).join('')}
            </div>
        `;

        document.querySelectorAll('.option-button').forEach(btn => {
            btn.onclick = () => {
                this.game.handleAnswer(btn.dataset.word === q.answer, btn);
            };
        });
    }

    renderBuildTheWord(q, data) {
        const shuffledLetters = this.game.shuffleArray(q.word.split('')).join('');
        
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <div class="text-6xl mb-6">${q.image}</div>
            <button data-speak="${q.word}" class="speaker-btn mb-8" aria-label="Listen to the word">
                <svg class="w-10 h-10 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/>
                    <path d="M14 10a4 4 0 00-4-4v8a4 4 0 004-4z"/>
                </svg>
            </button>
            <div id="letter-boxes" class="mb-8" dir="ltr">
                ${q.word.split('').map(() => `<div class="letter-box"></div>`).join('')}
            </div>
            <div id="letter-choices" dir="ltr">
                ${shuffledLetters.split('').map(letter => `<div class="letter-choice">${letter}</div>`).join('')}
            </div>
        `;

        this.audio.speak(q.word);

        const choices = document.querySelectorAll('.letter-choice');
        const boxes = document.querySelectorAll('.letter-box');

        choices.forEach(choice => {
            choice.addEventListener('click', () => {
                const firstEmptyBox = Array.from(boxes).find(box => !box.textContent);
                if (firstEmptyBox) {
                    firstEmptyBox.textContent = choice.textContent;
                    choice.style.visibility = 'hidden';
                    this.checkWord(q.word);
                }
            });
        });

        boxes.forEach((box, index) => {
            box.addEventListener('click', () => {
                if (box.textContent) {
                    const letterToReturn = box.textContent;
                    box.textContent = '';
                    const choiceToRestore = Array.from(choices).find(c => 
                        c.textContent === letterToReturn && c.style.visibility === 'hidden'
                    );
                    if (choiceToRestore) {
                        choiceToRestore.style.visibility = 'visible';
                    }
                }
            });
        });
    }

    checkWord(correctWord) {
        const boxes = document.querySelectorAll('.letter-box');
        let currentWord = Array.from(boxes).map(box => box.textContent).join('');
        
        if (currentWord.length === correctWord.length) {
            const isCorrect = currentWord === correctWord;
            this.game.handleAnswer(isCorrect, document.getElementById('letter-boxes'));
        }
    }
}

// Main Application
class ModernPhonicsApp {
    constructor() {
        this.themeManager = new ThemeManager();
        this.effectsManager = new EffectsManager();
        this.dataManager = new DataManager();
        this.stateManager = new StateManager();
        this.audioManager = new AudioManager();
        this.uiManager = null;
        this.gameEngine = null;
        this.init();
    }

    async init() {
        // Initialize data manager first
        await this.dataManager.init();
        
        // Then initialize UI and game engine
        this.uiManager = new UIManager(this.dataManager, this.stateManager, this.audioManager, this.effectsManager);
        this.gameEngine = new GameEngine(this.dataManager, this.stateManager, this.uiManager, this.audioManager, this.effectsManager);
        
        this.initEventListeners();
    }

    initEventListeners() {
        const { elements } = this.uiManager;

        elements.start_btn.addEventListener('click', () => {
            this.effectsManager.soundManager.resumeAudioContext(); // Enable audio
            this.effectsManager.soundManager.playSuccessSound();
            this.start();
        });
        elements.back_btn.addEventListener('click', () => this.uiManager.renderSkillsGrid());
        elements.success_close_btn.addEventListener('click', () => {
            this.uiManager.hideSuccessModal();
            if (this.stateManager.currentTechniqueId) {
                this.uiManager.renderTechniqueView(this.stateManager.currentTechniqueId);
            } else {
                this.uiManager.renderSkillsGrid();
            }
        });
        elements.modal_exit_btn.addEventListener('click', () => this.uiManager.hideModal());
        elements.modal_action_btn.addEventListener('click', () => {
            const { step } = this.stateManager.activitySession;
            if (step === 'learn') {
               this.gameEngine.endSession();
            }
        });

        document.addEventListener('click', (e) => {
            // Add click sound to all buttons
            if (e.target.closest('button')) {
                this.effectsManager.playClickSound();
            }

            const speakerButton = e.target.closest('[data-speak]');
            if (speakerButton) {
                this.audioManager.speak(speakerButton.dataset.speak);
                return;
            }

            const skillCard = e.target.closest('#skills-tree .skill-card');
            if (skillCard && !skillCard.classList.contains('locked')) {
                const techniqueId = skillCard.dataset.techniqueId;
                if (techniqueId) {
                    this.stateManager.currentTechniqueId = techniqueId;
                    this.uiManager.renderTechniqueView(techniqueId);
                }
                return;
            }

            const stepButton = e.target.closest('.step-button');
            if (stepButton && stepButton.dataset.step) {
                const { step, subskillId } = stepButton.dataset;
                if (!stepButton.disabled && this.stateManager.currentTechniqueId) {
                    this.gameEngine.runActivity(this.stateManager.currentTechniqueId, subskillId, step);
                }
            }
        });
    }

    start() {
        this.uiManager.elements.splash_screen.style.display = 'none';
        this.uiManager.elements.app.classList.remove('hidden');
        this.uiManager.renderSkillsGrid();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new ModernPhonicsApp();
});
