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

// Enhanced State Management with Teacher Analytics
class StateManager {
    constructor() {
        this.userProgress = {
            points: 0,
            streak: 0,
            lastVisit: null,
            techniques: {},
            analytics: {
                totalTimeSpent: 0,
                sessionsCompleted: 0,
                averageAccuracy: 0,
                timeByTechnique: {},
                dailyActivity: {},
                weakAreas: [],
                strongAreas: []
            }
        };
        this.currentTechniqueId = null;
        this.activitySession = {};
        this.sessionStartTime = null;
        this.difficultySettings = {
            questionsPerSession: 5,
            passingScore: 0.8,
            enableHints: true,
            autoAdvance: true
        };
        this.loadProgress();
        this.loadDifficultySettings();
    }

    startSession() {
        this.sessionStartTime = Date.now();
    }

    endSession(techniqueId, correct, total) {
        if (!this.sessionStartTime) return;
        
        const sessionTime = Date.now() - this.sessionStartTime;
        const today = new Date().toDateString();
        
        // Update total time
        this.userProgress.analytics.totalTimeSpent += sessionTime;
        
        // Update technique-specific time
        if (!this.userProgress.analytics.timeByTechnique[techniqueId]) {
            this.userProgress.analytics.timeByTechnique[techniqueId] = 0;
        }
        this.userProgress.analytics.timeByTechnique[techniqueId] += sessionTime;
        
        // Update daily activity
        if (!this.userProgress.analytics.dailyActivity[today]) {
            this.userProgress.analytics.dailyActivity[today] = {
                timeSpent: 0,
                sessionsCompleted: 0,
                accuracy: []
            };
        }
        this.userProgress.analytics.dailyActivity[today].timeSpent += sessionTime;
        this.userProgress.analytics.dailyActivity[today].sessionsCompleted++;
        
        if (total > 0) {
            const accuracy = correct / total;
            this.userProgress.analytics.dailyActivity[today].accuracy.push(accuracy);
            this.updateAccuracyAnalytics(techniqueId, accuracy);
        }
        
        this.userProgress.analytics.sessionsCompleted++;
        this.sessionStartTime = null;
        this.saveProgress();
    }

    updateAccuracyAnalytics(techniqueId, accuracy) {
        // Update average accuracy
        const totalAccuracies = Object.values(this.userProgress.analytics.dailyActivity)
            .flatMap(day => day.accuracy);
        this.userProgress.analytics.averageAccuracy = 
            totalAccuracies.reduce((sum, acc) => sum + acc, 0) / totalAccuracies.length;
        
        // Identify weak and strong areas
        const techniqueAccuracies = {};
        Object.values(this.userProgress.analytics.dailyActivity).forEach(day => {
            day.accuracy.forEach(acc => {
                if (!techniqueAccuracies[techniqueId]) techniqueAccuracies[techniqueId] = [];
                techniqueAccuracies[techniqueId].push(acc);
            });
        });
        
        this.userProgress.analytics.weakAreas = Object.entries(techniqueAccuracies)
            .filter(([_, accs]) => accs.reduce((sum, acc) => sum + acc, 0) / accs.length < 0.7)
            .map(([id, _]) => id);
            
        this.userProgress.analytics.strongAreas = Object.entries(techniqueAccuracies)
            .filter(([_, accs]) => accs.reduce((sum, acc) => sum + acc, 0) / accs.length > 0.9)
            .map(([id, _]) => id);
    }

    saveDifficultySettings() {
        try {
            localStorage.setItem('phonicsDifficultySettings', JSON.stringify(this.difficultySettings));
        } catch (error) {
            console.error('Failed to save difficulty settings:', error);
        }
    }

    loadDifficultySettings() {
        try {
            const saved = localStorage.getItem('phonicsDifficultySettings');
            if (saved) {
                this.difficultySettings = { ...this.difficultySettings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load difficulty settings:', error);
        }
    }

    updateDifficultySetting(key, value) {
        this.difficultySettings[key] = value;
        this.saveDifficultySettings();
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
                this.userProgress = { ...this.userProgress, ...JSON.parse(saved) };
                // Ensure analytics object exists for older saves
                if (!this.userProgress.analytics) {
                    this.userProgress.analytics = {
                        totalTimeSpent: 0,
                        sessionsCompleted: 0,
                        averageAccuracy: 0,
                        timeByTechnique: {},
                        dailyActivity: {},
                        weakAreas: [],
                        strongAreas: []
                    };
                }
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

    generateProgressReport() {
        const analytics = this.userProgress.analytics;
        const totalHours = Math.round(analytics.totalTimeSpent / (1000 * 60 * 60) * 10) / 10;
        const avgAccuracy = Math.round(analytics.averageAccuracy * 100);
        
        return {
            totalTimeSpent: totalHours,
            sessionsCompleted: analytics.sessionsCompleted,
            averageAccuracy: avgAccuracy,
            currentStreak: this.userProgress.streak,
            totalPoints: this.userProgress.points,
            weakAreas: analytics.weakAreas,
            strongAreas: analytics.strongAreas,
            techniqueProgress: Object.keys(this.userProgress.techniques).map(id => ({
                id,
                name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                mastered: this.userProgress.techniques[id].mastered,
                timeSpent: Math.round((analytics.timeByTechnique[id] || 0) / (1000 * 60)),
                completedSteps: Object.values(this.userProgress.techniques[id].subSkills).flat().length
            }))
        };
    }
}

// Teacher Dashboard Manager
class TeacherDashboard {
    constructor(dataManager, stateManager) {
        this.data = dataManager;
        this.state = stateManager;
        this.isOpen = false;
        this.currentView = 'overview';
    }

    toggle() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.render();
            document.getElementById('teacher-dashboard').classList.remove('hidden');
        } else {
            document.getElementById('teacher-dashboard').classList.add('hidden');
        }
    }

    render() {
        const dashboard = document.getElementById('teacher-dashboard');
        const report = this.state.generateProgressReport();
        
        dashboard.innerHTML = `
            <div class="glass-card p-8 max-w-6xl mx-auto">
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-3xl font-bold text-gray-800">📊 Teacher Dashboard</h2>
                    <button id="close-dashboard" class="btn-secondary">✕ إغلاق</button>
                </div>
                
                <!-- Navigation Tabs -->
                <div class="flex gap-4 mb-8 border-b border-gray-200">
                    <button class="tab-btn ${this.currentView === 'overview' ? 'active' : ''}" data-view="overview">📈 نظرة عامة</button>
                    <button class="tab-btn ${this.currentView === 'analytics' ? 'active' : ''}" data-view="analytics">📊 التحليلات</button>
                    <button class="tab-btn ${this.currentView === 'settings' ? 'active' : ''}" data-view="settings">⚙️ إعدادات الصعوبة</button>
                    <button class="tab-btn ${this.currentView === 'reports' ? 'active' : ''}" data-view="reports">📋 التقارير</button>
                </div>

                <!-- Content Area -->
                <div id="dashboard-content">
                    ${this.renderCurrentView(report)}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    renderCurrentView(report) {
        switch (this.currentView) {
            case 'overview':
                return this.renderOverview(report);
            case 'analytics':
                return this.renderAnalytics(report);
            case 'settings':
                return this.renderSettings();
            case 'reports':
                return this.renderReports(report);
            default:
                return this.renderOverview(report);
        }
    }

    renderOverview(report) {
        const mastered = report.techniqueProgress.filter(t => t.mastered).length;
        const total = report.techniqueProgress.length;
        const completionRate = Math.round((mastered / total) * 100);

        return `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <!-- Stats Cards -->
                <div class="stat-card">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-value">${report.totalTimeSpent}h</div>
                    <div class="stat-label">إجمالي وقت التعلم</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🎯</div>
                    <div class="stat-value">${report.averageAccuracy}%</div>
                    <div class="stat-label">متوسط الدقة</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🏆</div>
                    <div class="stat-value">${completionRate}%</div>
                    <div class="stat-label">معدل الإتمام</div>
                </div>
            </div>

            <!-- Progress Overview -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4">📚 تقدم المهارات</h3>
                    <div class="space-y-4">
                        ${report.techniqueProgress.map(tech => `
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div class="flex items-center gap-3">
                                    <span class="text-2xl">${tech.mastered ? '✅' : '⏳'}</span>
                                    <div>
                                        <div class="font-semibold">${tech.name}</div>
                                        <div class="text-sm text-gray-600">${tech.timeSpent} دقيقة</div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="font-bold text-lg">${tech.completedSteps}/12</div>
                                    <div class="text-sm text-gray-500">خطوة</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4">📋 ملخص الأداء</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span class="font-semibold">الجلسات المكتملة</span>
                            <span class="text-xl font-bold text-blue-600">${report.sessionsCompleted}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <span class="font-semibold">النقاط المكتسبة</span>
                            <span class="text-xl font-bold text-orange-600">${report.totalPoints}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span class="font-semibold">سلسلة الأيام</span>
                            <span class="text-xl font-bold text-green-600">${report.currentStreak} أيام</span>
                        </div>
                    </div>
                    
                    ${report.weakAreas.length > 0 ? `
                        <div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <h4 class="font-bold text-red-800 mb-2">🔍 مناطق تحتاج تحسين:</h4>
                            <div class="text-sm text-red-600">
                                ${report.weakAreas.map(area => area.replace(/_/g, ' ')).join('، ')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${report.strongAreas.length > 0 ? `
                        <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h4 class="font-bold text-green-800 mb-2">⭐ نقاط القوة:</h4>
                            <div class="text-sm text-green-600">
                                ${report.strongAreas.map(area => area.replace(/_/g, ' ')).join('، ')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderAnalytics(report) {
        const dailyData = this.state.userProgress.analytics.dailyActivity;
        const last7Days = this.getLast7DaysData(dailyData);

        return `
            <div class="space-y-8">
                <!-- Time Analytics -->
                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4">📊 تحليل الوقت</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-semibold mb-3">آخر 7 أيام</h4>
                            <div class="space-y-2">
                                ${last7Days.map(day => `
                                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span class="text-sm">${day.date}</span>
                                        <span class="font-bold">${day.minutes}د</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div>
                            <h4 class="font-semibold mb-3">الوقت حسب المهارة</h4>
                            <div class="space-y-2">
                                ${Object.entries(this.state.userProgress.analytics.timeByTechnique || {}).map(([tech, time]) => `
                                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span class="text-sm">${tech.replace(/_/g, ' ')}</span>
                                        <span class="font-bold">${Math.round(time / (1000 * 60))}د</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Accuracy Trends -->
                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4">🎯 اتجاهات الدقة</h3>
                    <div class="text-center p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <div class="text-4xl font-bold text-purple-600 mb-2">${report.averageAccuracy}%</div>
                        <div class="text-lg text-gray-600">متوسط الدقة الإجمالي</div>
                        <div class="mt-4 text-sm text-gray-500">
                            ${report.averageAccuracy >= 90 ? '🏆 أداء ممتاز!' : 
                              report.averageAccuracy >= 75 ? '👍 أداء جيد' : 
                              '📈 يحتاج المزيد من التدريب'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSettings() {
        const settings = this.state.difficultySettings;
        
        return `
            <div class="glass-card p-6 max-w-2xl">
                <h3 class="text-xl font-bold mb-6">⚙️ إعدادات الصعوبة والتحكم</h3>
                
                <div class="space-y-6">
                    <!-- Questions per session -->
                    <div class="setting-item">
                        <label class="block text-sm font-semibold mb-2">عدد الأسئلة في كل جلسة</label>
                        <div class="flex items-center gap-4">
                            <input type="range" id="questions-slider" min="3" max="10" value="${settings.questionsPerSession}" 
                                   class="flex-grow">
                            <span id="questions-value" class="font-bold text-lg w-8">${settings.questionsPerSession}</span>
                        </div>
                        <p class="text-sm text-gray-600 mt-1">المزيد من الأسئلة = تدريب أطول</p>
                    </div>

                    <!-- Passing score -->
                    <div class="setting-item">
                        <label class="block text-sm font-semibold mb-2">نسبة النجاح المطلوبة</label>
                        <div class="flex items-center gap-4">
                            <input type="range" id="passing-slider" min="0.5" max="1" step="0.1" value="${settings.passingScore}" 
                                   class="flex-grow">
                            <span id="passing-value" class="font-bold text-lg w-12">${Math.round(settings.passingScore * 100)}%</span>
                        </div>
                        <p class="text-sm text-gray-600 mt-1">النسبة المطلوبة للانتقال للمرحلة التالية</p>
                    </div>

                    <!-- Enable hints -->
                    <div class="setting-item">
                        <label class="flex items-center gap-3">
                            <input type="checkbox" id="hints-toggle" ${settings.enableHints ? 'checked' : ''} 
                                   class="w-5 h-5">
                            <span class="font-semibold">تفعيل التلميحات</span>
                        </label>
                        <p class="text-sm text-gray-600 mt-1">إظهار تلميحات مساعدة أثناء الأنشطة</p>
                    </div>

                    <!-- Auto advance -->
                    <div class="setting-item">
                        <label class="flex items-center gap-3">
                            <input type="checkbox" id="auto-advance-toggle" ${settings.autoAdvance ? 'checked' : ''} 
                                   class="w-5 h-5">
                            <span class="font-semibold">الانتقال التلقائي</span>
                        </label>
                        <p class="text-sm text-gray-600 mt-1">الانتقال التلقائي للسؤال التالي بعد الإجابة الصحيحة</p>
                    </div>

                    <!-- Reset progress -->
                    <div class="setting-item border-t pt-6">
                        <h4 class="font-semibold text-red-600 mb-3">⚠️ إعادة تعيين</h4>
                        <div class="flex gap-3">
                            <button id="reset-progress-btn" class="btn-secondary bg-red-50 text-red-600 border-red-200">
                                🔄 إعادة تعيين التقدم
                            </button>
                            <button id="export-data-btn" class="btn-secondary">
                                📤 تصدير البيانات
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderReports(report) {
        return `
            <div class="space-y-6">
                <!-- Report Summary -->
                <div class="glass-card p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">📋 تقرير شامل</h3>
                        <button id="download-report-btn" class="btn-primary">📥 تحميل التقرير</button>
                    </div>
                    
                    <div class="prose max-w-none">
                        <div class="bg-gray-50 p-6 rounded-lg mb-6">
                            <h4 class="text-lg font-bold mb-4">ملخص الأداء</h4>
                            <ul class="space-y-2">
                                <li>📅 <strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-SA')}</li>
                                <li>⏱️ <strong>إجمالي وقت التعلم:</strong> ${report.totalTimeSpent} ساعة</li>
                                <li>🎯 <strong>متوسط الدقة:</strong> ${report.averageAccuracy}%</li>
                                <li>🏆 <strong>المهارات المتقنة:</strong> ${report.techniqueProgress.filter(t => t.mastered).length}/${report.techniqueProgress.length}</li>
                                <li>🔥 <strong>أطول سلسلة أيام:</strong> ${report.currentStreak} يوم</li>
                            </ul>
                        </div>

                        <!-- Detailed breakdown -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 class="text-lg font-bold mb-3">تفصيل المهارات</h4>
                                <div class="space-y-3">
                                    ${report.techniqueProgress.map(tech => `
                                        <div class="p-3 border rounded-lg ${tech.mastered ? 'bg-green-50 border-green-200' : 'bg-gray-50'}">
                                            <div class="flex justify-between items-center">
                                                <span class="font-semibold">${tech.name}</span>
                                                <span class="text-sm ${tech.mastered ? 'text-green-600' : 'text-gray-500'}">
                                                    ${tech.mastered ? 'مكتمل ✅' : `${tech.completedSteps}/12 خطوة`}
                                                </span>
                                            </div>
                                            <div class="text-sm text-gray-600 mt-1">وقت التدريب: ${tech.timeSpent} دقيقة</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <div>
                                <h4 class="text-lg font-bold mb-3">التوصيات</h4>
                                <div class="space-y-3">
                                    ${this.generateRecommendations(report).map(rec => `
                                        <div class="p-3 border rounded-lg ${rec.type === 'strength' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}">
                                            <div class="font-semibold">${rec.title}</div>
                                            <div class="text-sm text-gray-600 mt-1">${rec.description}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateRecommendations(report) {
        const recommendations = [];
        
        if (report.averageAccuracy < 70) {
            recommendations.push({
                type: 'improvement',
                title: '🎯 تحسين الدقة',
                description: 'ينصح بتكرار التمارين والتركيز على المهارات الأساسية'
            });
        }
        
        if (report.totalTimeSpent < 5) {
            recommendations.push({
                type: 'improvement',
                title: '⏰ زيادة وقت التدريب',
                description: 'المزيد من الممارسة اليومية سيحسن النتائج'
            });
        }
        
        if (report.strongAreas.length > 0) {
            recommendations.push({
                type: 'strength',
                title: '⭐ نقاط القوة',
                description: `أداء ممتاز في: ${report.strongAreas.join('، ')}`
            });
        }
        
        if (report.currentStreak > 7) {
            recommendations.push({
                type: 'strength',
                title: '🔥 التزام ممتاز',
                description: 'الاستمرارية في التعلم تؤتي ثمارها!'
            });
        }
        
        return recommendations;
    }

    getLast7DaysData(dailyData) {
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            const dayData = dailyData[dateStr];
            
            last7Days.push({
                date: date.toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' }),
                minutes: dayData ? Math.round(dayData.timeSpent / (1000 * 60)) : 0
            });
        }
        
        return last7Days;
    }

    attachEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentView = btn.dataset.view;
                this.render();
            });
        });

        // Close button
        document.getElementById('close-dashboard')?.addEventListener('click', () => {
            this.toggle();
        });

        // Settings controls
        this.attachSettingsListeners();
        this.attachReportListeners();
    }

    attachSettingsListeners() {
        const questionsSlider = document.getElementById('questions-slider');
        const questionsValue = document.getElementById('questions-value');
        const passingSlider = document.getElementById('passing-slider');
        const passingValue = document.getElementById('passing-value');
        const hintsToggle = document.getElementById('hints-toggle');
        const autoAdvanceToggle = document.getElementById('auto-advance-toggle');
        const resetBtn = document.getElementById('reset-progress-btn');
        const exportBtn = document.getElementById('export-data-btn');

        questionsSlider?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            questionsValue.textContent = value;
            this.state.updateDifficultySetting('questionsPerSession', value);
        });

        passingSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            passingValue.textContent = Math.round(value * 100) + '%';
            this.state.updateDifficultySetting('passingScore', value);
        });

        hintsToggle?.addEventListener('change', (e) => {
            this.state.updateDifficultySetting('enableHints', e.target.checked);
        });

        autoAdvanceToggle?.addEventListener('change', (e) => {
            this.state.updateDifficultySetting('autoAdvance', e.target.checked);
        });

        resetBtn?.addEventListener('click', () => {
            if (confirm('هل أنت متأكد من إعادة تعيين جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) {
                localStorage.removeItem('modernPhonicsProgress');
                location.reload();
            }
        });

        exportBtn?.addEventListener('click', () => {
            this.exportData();
        });
    }

    attachReportListeners() {
        const downloadBtn = document.getElementById('download-report-btn');
        downloadBtn?.addEventListener('click', () => {
            this.downloadReport();
        });
    }

    exportData() {
        const data = {
            progress: this.state.userProgress,
            settings: this.state.difficultySettings,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phonics-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    downloadReport() {
        const report = this.state.generateProgressReport();
        const reportContent = this.generateReportContent(report);
        
        const blob = new Blob([reportContent], { type: 'text/plain; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `تقرير-التقدم-${new Date().toLocaleDateString('ar-SA')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    generateReportContent(report) {
        return `
تقرير تقدم تعلم الأصوات الإنجليزية
=====================================

تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}

ملخص الأداء:
- إجمالي وقت التعلم: ${report.totalTimeSpent} ساعة
- عدد الجلسات المكتملة: ${report.sessionsCompleted}
- متوسط الدقة: ${report.averageAccuracy}%
- النقاط المكتسبة: ${report.totalPoints}
- أطول سلسلة أيام: ${report.currentStreak}

تفصيل المهارات:
${report.techniqueProgress.map(tech => 
    `- ${tech.name}: ${tech.mastered ? 'مكتمل ✓' : `${tech.completedSteps}/12 خطوة`} (${tech.timeSpent} دقيقة)`
).join('\n')}

${report.strongAreas.length > 0 ? `
نقاط القوة:
${report.strongAreas.map(area => `- ${area.replace(/_/g, ' ')}`).join('\n')}
` : ''}

${report.weakAreas.length > 0 ? `
مناطق تحتاج تحسين:
${report.weakAreas.map(area => `- ${area.replace(/_/g, ' ')}`).join('\n')}
` : ''}

التوصيات:
${this.generateRecommendations(report).map(rec => `- ${rec.title}: ${rec.description}`).join('\n')}
        `.trim();
    }
}
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
        const questionsCount = this.state.difficultySettings.questionsPerSession;
        this.state.activitySession.questions = this.shuffleArray(questions).slice(0, questionsCount);
        this.state.activitySession.currentIndex = 0;
        this.state.activitySession.correctAnswers = 0;

        // Start time tracking
        this.state.startSession();

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
                
                // Auto-advance if enabled
                if (this.state.difficultySettings.autoAdvance) {
                    setTimeout(() => {
                        this.renderCurrentQuestion();
                    }, 1500);
                }
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
            
            // End time tracking
            this.state.endSession(techniqueId, 1, 1);
            
            setTimeout(() => {
                this.ui.hideSuccessModal();
                this.ui.renderTechniqueView(techniqueId);
            }, 2000);
            return;
        }

        const { correctAnswers, questions } = this.state.activitySession;
        const passingScore = this.state.difficultySettings.passingScore;
        const pass = (correctAnswers / questions.length) >= passingScore;

        // End time tracking with results
        this.state.endSession(techniqueId, correctAnswers, questions.length);

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
            this.ui.showSuccessModal(
                `تحتاج ${Math.round(passingScore * 100)}% للنجاح. حاول مرة أخرى!`,
                'لا تستسلم! 💪'
            );
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
