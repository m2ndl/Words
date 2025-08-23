'use strict';
import { QuestionRenderer } from './questionRenderer.js';

// The core logic for running learning activities and quizzes.
export class GameEngine {
    constructor(dataManager, stateManager, uiManager, audioManager, effectsManager) {
        this.data = dataManager;
        this.state = stateManager;
        this.ui = uiManager;
        this.audio = audioManager;
        this.effects = effectsManager;
    }

    runActivity(techniqueId, subSkillId, step) {
        // Clear any lingering effects when starting an activity
        this.effects.clearEffects();

        const subSkill = this.data.getSubSkill(techniqueId, subSkillId);
        if (!subSkill) return;

        this.state.activitySession = { techniqueId, subSkillId, step };
        this.ui.elements.modal_progress.innerHTML = '';
        this.ui.elements.modal_exit_btn.style.display = 'none';
        this.ui.elements.modal_action_btn.style.display = 'inline-block';
        this.ui.elements.modal_action_btn.onclick = null;

        if (step === 'learn') {
            this.renderLearnActivity(subSkill);
        } else {
            this.startSession(subSkill, step);
        }
        this.ui.showModal();
    }

    renderLearnActivity(subSkill) {
        this.ui.elements.modal_title.innerHTML = `<span class="text-4xl mr-3">${subSkill.icon}</span> ${subSkill.name}`;
        this.ui.elements.modal_action_btn.textContent = "فهمت! 💪";

        // 1) Explanation / narrative (as provided in curriculum)
        const explanationHTML = `<div class="text-lg text-gray-700 mb-6">${subSkill.learn_info || ''}</div>`;

        // 2) "Other examples" displayed as BEFORE → AFTER with correct audio buttons,
        //    Mobile-friendly layout with proper wrapping
        const examplesHTML = (subSkill.examples || []).map(ex => `
            <div class="bg-white p-4 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <div class="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4" dir="ltr">
                <div class="inline-flex items-center gap-2">
                  <button class="speaker-btn flex-shrink-0" data-speak="${ex.before}" aria-label="Listen to ${ex.before}">
                    <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/><path d="M14 10a4 4 0 00-4-4v8a4 4 0 004-4z"/></svg>
                  </button>
                  <span class="text-2xl sm:text-3xl english-font">${ex.before}</span>
                </div>
                ${ex.before !== ex.after ? `
                  <span class="text-2xl sm:text-3xl">➡️</span>
                  <div class="inline-flex items-center gap-2">
                    <button class="speaker-btn flex-shrink-0" data-speak="${ex.after}" aria-label="Listen to ${ex.after}">
                      <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/><path d="M14 10a4 4 0 00-4-4v8a4 4 0 004-4z"/></svg>
                    </button>
                    <span class="text-2xl sm:text-3xl english-font font-bold text-purple-600">${ex.after}</span>
                  </div>` : ''}
              </div>
            </div>
        `).join('');

        this.ui.elements.modal_body.innerHTML = `
            ${explanationHTML}
            <div class="grid grid-cols-1 gap-4">${examplesHTML}</div>
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
        }
        return data.questions || data.pairs?.map(p => ({ pair: p })) || [];
    }

    renderCurrentQuestion() {
        // Ensure previous effects are gone before showing a new question
        this.effects.clearEffects();

        const { questions, currentIndex } = this.state.activitySession;
        this.ui.elements.modal_feedback.innerHTML = '';
        this.ui.elements.modal_action_btn.style.display = 'none';
        this.ui.elements.modal_progress.innerHTML = `<div class="flex gap-2">${questions.map((_, i) => `<span class="progress-dot ${i < currentIndex ? 'completed' : ''} ${i === currentIndex ? 'pulse' : ''}"></span>`).join('')}</div>`;

        const { step, subSkillId, techniqueId } = this.state.activitySession;
        const subSkill = this.data.getSubSkill(techniqueId, subSkillId);
        const data = step === 'drill' ? subSkill.drill : subSkill.quiz;
        const renderer = new QuestionRenderer(this.ui, this.audio, this, this.effects);
        renderer.render(data.type || 'quiz', questions[currentIndex], data, subSkill);
    }

    handleAnswer(isCorrect, element) {
        this.ui.showFeedback(isCorrect);
        if (element) {
            element.classList.add(isCorrect ? 'correct' : 'incorrect');
            if (isCorrect) this.effects.createSuccessRipple(element);
        }
        if (isCorrect) {
            document.querySelectorAll('.option-button, #action-btn, .letter-choice').forEach(b => b.style.pointerEvents = 'none');
            this.state.activitySession.correctAnswers++;
            this.state.activitySession.currentIndex++;
            this.ui.elements.modal_action_btn.style.display = 'inline-block';

            if (this.state.activitySession.currentIndex < this.state.activitySession.questions.length) {
                this.ui.elements.modal_action_btn.textContent = "التالي ➡️";
                this.ui.elements.modal_action_btn.onclick = () => this.renderCurrentQuestion();
                if (this.state.difficultySettings.autoAdvance) {
                    setTimeout(() => this.renderCurrentQuestion(), 1500);
                }
            } else {
                this.ui.elements.modal_action_btn.textContent = "إنهاء 🎉";
                this.ui.elements.modal_action_btn.onclick = () => this.endSession();
            }
        } else if (element) {
            element.style.pointerEvents = 'none';
            setTimeout(() => {
                element.classList.remove('incorrect');
                element.style.pointerEvents = 'auto';
            }, 1000);
        }
    }

    endSession() {
        const { techniqueId, subSkillId, step } = this.state.activitySession;
        if (step === 'learn') {
            this.state.markStepComplete(techniqueId, subSkillId, step);
            this.ui.hideModal();
            this.ui.showSuccessModal('أحسنت! لقد أكملت الدرس', '+10 نقاط ⭐');
            this.effects.soundManager.playSuccessSound();
            this.state.endSession(techniqueId, 1, 1);
            setTimeout(() => {
                this.ui.hideSuccessModal();
                this.ui.renderTechniqueView(techniqueId);
            }, 2000);
            return;
        }

        const { correctAnswers, questions } = this.state.activitySession;
        const pass = (correctAnswers / questions.length) >= this.state.difficultySettings.passingScore;
        this.state.endSession(techniqueId, correctAnswers, questions.length);

        if (pass) {
            const techProgress = this.state.markStepComplete(techniqueId, subSkillId, step);
            const technique = this.data.getTechnique(techniqueId);
            const allSubSkillsMastered = technique.subSkills.every(ss => (this.state.getTechniqueProgress(techniqueId).subSkills[ss.id] || []).length === 3);

            if (allSubSkillsMastered && !techProgress.mastered) {
                this.state.markTechniqueMastered(techniqueId);
                this.ui.hideModal();
                this.ui.showSuccessModal(`لقد أتقنت مهارة ${technique.name_ar}!`, `+50 نقطة 🎊`);
                this.effects.createCelebrationBurst();
            } else {
                this.ui.hideModal();
                this.ui.showSuccessModal(step === 'drill' ? 'أحسنت في التمرين!' : 'نجحت في الاختبار!', `+10 نقاط ⭐`);
                this.effects.soundManager.playSuccessSound();
            }
        } else {
            this.ui.hideModal();
            this.ui.showSuccessModal(`تحتاج ${Math.round(this.state.difficultySettings.passingScore * 100)}% للنجاح. حاول مرة أخرى!`, 'لا تستسلم! 💪');
        }

        this.state.activitySession = {};
        setTimeout(() => {
            this.ui.hideSuccessModal();
            this.ui.renderTechniqueView(techniqueId);
        }, 2000);
    }
}
