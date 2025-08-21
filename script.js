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

// Data Management - Now much smaller!
class DataManager {
    constructor() {
        // No hardcoded data - everything comes from JSON
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
}

// UI Management
class UIManager {
    constructor(dataManager, stateManager, audioManager) {
        this.data = dataManager;
        this.state = stateManager;
        this.audio = audioManager;
        this.elements = {};
        this.initElements();
    }

    initElements() {
        const ids = [
            'splash-screen', 'start-btn', 'app', 'main-title', 'skills-view', 'technique-view',
            'skills-grid', 'back-btn', 'subskills-container', 'activity-modal', 'modal-title',
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
        const { skills_grid } = this.elements;
        skills_grid.innerHTML = '';
        
        this.data.getTechniques().forEach(tech => {
            const techProgress = this.state.getTechniqueProgress(tech.id);
            const isMastered = techProgress.mastered;
            const completedSteps = Object.values(techProgress.subSkills).flat().length;
            const totalSteps = tech.subSkills.length * 3;
            const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

            const card = document.createElement('div');
            card.className = `skill-card ${isMastered ? 'mastered' : ''}`;
            card.dataset.techniqueId = tech.id;
            
            card.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <div class="text-4xl">${tech.icon}</div>
                    ${isMastered ? '<span class="achievement-badge">مُتقن!</span>' : ''}
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-2 english-font">${tech.name}</h3>
                <p class="text-gray-600 mb-4">${tech.name_ar}</p>
                <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div class="bg-gradient-to-r ${tech.color} h-2 rounded-full transition-all duration-500" 
                         style="width: ${progressPercentage}%"></div>
                </div>
                <div class="text-sm text-gray-500">${completedSteps} / ${totalSteps} خطوة</div>
            `;
            
            skills_grid.appendChild(card);
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
        this.createCelebrationEmojis();
    }

    hideSuccessModal() {
        this.elements.success_modal.classList.add('hidden');
    }

    showFeedback(isCorrect, container = this.elements.modal_feedback) {
        const message = isCorrect ? this.data.getRandomEncouragement() : "حاول مرة أخرى 💪";
        container.innerHTML = `<span class="${isCorrect ? 'text-green-500' : 'text-red-500'}">${message}</span>`;
        
        if (isCorrect) {
            this.createFloatingEmoji('⭐');
        }
    }

    createFloatingEmoji(emoji) {
        const element = document.createElement('div');
        element.className = 'floating-emoji';
        element.textContent = emoji;
        element.style.left = `${Math.random() * window.innerWidth}px`;
        element.style.bottom = '20px';
        
        document.body.appendChild(element);
        setTimeout(() => element.remove(), 3000);
    }

    createCelebrationEmojis() {
        const emojis = ['🎉', '⭐', '🎊', '✨', '🎈'];
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.createFloatingEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
            }, i * 100);
        }
    }
}

// Game Engine
class GameEngine {
    constructor(dataManager, stateManager, uiManager, audioManager) {
        this.data = dataManager;
        this.state = stateManager;
        this.ui = uiManager;
        this.audio = audioManager;
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

        const renderer = new QuestionRenderer(this.ui, this.audio, this);
        renderer.render(data.type || 'quiz', q, data, subSkill);
    }

    handleAnswer(isCorrect, element) {
        this.ui.showFeedback(isCorrect);
        
        if (element) element.classList.add(isCorrect ? 'correct' : 'incorrect');

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
            } else {
                this.ui.hideModal();
                this.ui.showSuccessModal(
                    step === 'drill' ? 'أحسنت في التمرين!' : 'نجحت في الاختبار!',
                    `+10 نقاط ⭐`
                );
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

// Question Renderer
class QuestionRenderer {
    constructor(uiManager, audioManager, gameEngine) {
        this.ui = uiManager;
        this.audio = audioManager;
        this.game = gameEngine;
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
            <div class="text-5xl english-font font-bold mb-8">${word}</div>
            <div class="flex justify-center gap-4">
                <button class="option-button" data-correct="${isCorrect}">
                    ✅ نعم
                </button>
                <button class="option-button" data-correct="${!isCorrect}">
                    ❌ لا
                </button>
            </div>
        `;

        document.querySelectorAll('.option-button').forEach(btn => {
            btn.onclick = () => {
                this.audio.speak(word);
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
        this.uiManager = new UIManager(this.dataManager, this.stateManager, this.audioManager);
        this.gameEngine = new GameEngine(this.dataManager, this.stateManager, this.uiManager, this.audioManager);
        
        this.initEventListeners();
    }

    initEventListeners() {
        const { elements } = this.uiManager;

        elements.start_btn.addEventListener('click', () => this.start());
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

            const skillCard = e.target.closest('#skills-grid .skill-card');
            if (skillCard) {
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