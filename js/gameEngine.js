'use strict';
import { QuestionRenderer } from './questionRenderer.js';

export class GameEngine {
  constructor(dataManager, stateManager, uiManager, audioManager, effectsManager) {
    this.data = dataManager;
    this.state = stateManager;
    this.ui = uiManager;
    this.audio = audioManager;
    this.effects = effectsManager;

    this.questionRenderer = new QuestionRenderer(this.ui, this.audio, this, this.effects);
  }

  // Entry point
  runActivity(techniqueId, subSkillId, step) {
    this.effects.clearEffects();

    const subSkill = this.data.getSubSkill(techniqueId, subSkillId);
    if (!subSkill) return;

    this.state.activitySession = { techniqueId, subSkillId, step };
    this.ui.elements.modal_progress.innerHTML = '';

    if (step === 'learn') {
      this.startLearnFlow(subSkill);
      return;
    }

    // DRILL / QUIZ (leave behavior same as before)
    this.startQAFlow(subSkill, step);
  }

  // ------------------------
  // LEARN: paced micro-lesson
  // ------------------------
  startLearnFlow(subSkill) {
    const ex = Array.isArray(subSkill.examples) ? subSkill.examples : [];
    const comments = Array.isArray(subSkill.learn_comments) ? subSkill.learn_comments : [];

    const steps = [];

    // 1) Info
    steps.push({ type: 'info', text: subSkill.learn_info || '' });

    // 2-5) Example A + comment, Example B + comment
    if (ex[0]) steps.push({ type: 'example', label: 'أ', pair: ex[0] });
    if (ex[0]) steps.push({ type: 'comment', text: comments[0] || this.autoComment(ex[0]) });
    if (ex[1]) steps.push({ type: 'example', label: 'ب', pair: ex[1] });
    if (ex[1]) steps.push({ type: 'comment', text: comments[1] || this.autoComment(ex[1]) });

    // 6) Gallery
    if (ex.length > 2) steps.push({ type: 'gallery', items: ex.slice(2) });

    // 7) Micro-check (optional)
    if (subSkill.learn_check) {
      steps.push({ type: 'microcheck', q: subSkill.learn_check });
    }

    // 8) Finish
    steps.push({ type: 'finish' });

    // Bind session
    this.state.activitySession.learnSteps = steps;
    this.state.activitySession.currentIndex = 0;

    // UI
    this.ui.elements.modal_title.textContent = `📖 تعلم — ${subSkill.name}`;
    this.ui.elements.modal_exit_btn.style.display = 'inline-block';
    this.ui.elements.modal_back_btn.classList.add('hidden');
    this.ui.elements.modal_action_btn.textContent = 'التالي';
    this.ui.showModal();

    // Handlers
    this.ui.elements.modal_action_btn.onclick = () => this.nextLearnStep(subSkill);
    this.ui.elements.modal_back_btn.onclick = () => this.prevLearnStep();

    // First render
    this.renderLearnStep();
  }

  renderLearnStep() {
    const { learnSteps, currentIndex } = this.state.activitySession;
    const step = learnSteps[currentIndex];
    const total = learnSteps.length;

    // progress
    this.ui.elements.modal_progress.textContent = `الخطوة ${currentIndex + 1} من ${total}`;
    this.ui.elements.modal_back_btn.classList.toggle('hidden', currentIndex === 0);
    this.ui.elements.modal_action_btn.textContent = currentIndex === total - 1 ? 'إنهاء' : 'التالي';
    this.ui.elements.modal_feedback.textContent = '';

    // render by type
    switch (step.type) {
      case 'info':
        this.ui.elements.modal_body.innerHTML = `
          <div class="text-lg text-gray-700 leading-relaxed">${step.text}</div>
        `;
        break;
      case 'example': {
        const { before, after } = step.pair;
        const arrow = before !== after ? `<span class="text-3xl">➡️</span>` : '';
        this.ui.elements.modal_body.innerHTML = `
          <p class="text-xl text-gray-600 mb-6">مثال ${step.label}</p>
          <div class="flex items-center justify-center gap-6">
            <div class="text-center">
              <div class="text-5xl english-font mb-2">${before}</div>
              <button class="speaker-btn" data-speak="${before}" aria-label="تشغيل الصوت"></button>
            </div>
            ${arrow}
            <div class="text-center">
              <div class="text-5xl english-font font-bold text-purple-600 mb-2">${after}</div>
              <button class="speaker-btn" data-speak="${after}" aria-label="تشغيل الصوت"></button>
            </div>
          </div>
        `;
        // auto play both quickly
        setTimeout(() => { this.audio.speak(before); setTimeout(()=> this.audio.speak(after), 700); }, 100);
        break;
      }
      case 'comment':
        this.ui.elements.modal_body.innerHTML = `
          <div class="p-6 rounded-xl bg-white/80 shadow-sm text-lg text-gray-700">${step.text}</div>
        `;
        break;
      case 'gallery':
        this.ui.elements.modal_body.innerHTML = `
          <p class="text-xl text-gray-600 mb-6">أمثلة أخرى</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${step.items.map(ex => `
              <div class="bg-white p-4 rounded-xl shadow-sm">
                <div class="flex items-center justify-center gap-4">
                  <div class="text-center">
                    <div class="text-3xl english-font mb-2">${ex.before}</div>
                    <button class="speaker-btn" data-speak="${ex.before}" aria-label="تشغيل الصوت"></button>
                  </div>
                  ${ex.before !== ex.after ? `<span class="text-2xl">➡️</span>` : ''}
                  <div class="text-center">
                    <div class="text-3xl english-font font-bold text-purple-600 mb-2">${ex.after}</div>
                    <button class="speaker-btn" data-speak="${ex.after}" aria-label="تشغيل الصوت"></button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
        break;
      case 'microcheck': {
        const { audio, options, answer } = step.q;
        this.ui.elements.modal_body.innerHTML = `
          <p class="text-xl text-gray-600 mb-6">فحص سريع: أي كلمة سمعت؟</p>
          <div class="mb-6">
            <button class="btn-primary" id="play-audio">🔈 استمع</button>
          </div>
          <div class="flex justify-center gap-3">
            ${options.map(op => `<button class="option-button" data-option="${op}">${op}</button>`).join('')}
          </div>
        `;
        document.getElementById('play-audio').onclick = () => this.audio.speak(audio);
        this.audio.speak(audio);
        this.ui.elements.modal_action_btn.disabled = true;
        this.ui.elements.modal_action_btn.classList.add('opacity-50', 'pointer-events-none');
        this.ui.elements.modal_feedback.textContent = '';

        this.ui.elements.modal_body.querySelectorAll('.option-button').forEach(btn => {
          btn.onclick = () => {
            const isCorrect = btn.dataset.option === answer;
            this.ui.showFeedback(isCorrect, this.ui.elements.modal_feedback);
            if (isCorrect) {
              this.ui.elements.modal_action_btn.disabled = false;
              this.ui.elements.modal_action_btn.classList.remove('opacity-50', 'pointer-events-none');
            }
          };
        });
        break;
      }
      case 'finish':
        this.ui.elements.modal_body.innerHTML = `
          <div class="space-y-4">
            <div class="text-2xl font-bold">🎉 أحسنت!</div>
            <p class="text-gray-700">جاهز للانتقال إلى التمرين؟</p>
          </div>
        `;
        break;
    }
  }

  nextLearnStep(subSkill) {
    const session = this.state.activitySession;
    if (!session.learnSteps) return;
    if (session.currentIndex < session.learnSteps.length - 1) {
      session.currentIndex++;
      this.renderLearnStep();
    } else {
      // Complete
      this.ui.hideModal();
      this.state.markStepComplete(session.techniqueId, session.subSkillId, 'learn');
      this.ui.showSuccessModal('تمت خطوة التعلم ✅', '+5 ⭐');
      this.effects.createQuickCelebration();
      setTimeout(() => {
        this.ui.hideSuccessModal();
        this.ui.renderTechniqueView(session.techniqueId);
      }, 1400);
    }
  }

  prevLearnStep() {
    const session = this.state.activitySession;
    if (!session.learnSteps) return;
    if (session.currentIndex > 0) {
      session.currentIndex--;
      this.renderLearnStep();
    }
  }

  autoComment(pair) {
    const { before, after } = pair;
    if (before && after && after.endsWith('e')) {
      // naive vowel detection
      return 'أضفنا الحرف e في آخر الكلمة؛ فأصبح الصوت طويلًا.';
    }
    return 'لاحظ التغيّر في النطق بسبب الحرف الأخير.';
  }

  // ---------------
  // DRILL / QUIZ
  // ---------------
  startQAFlow(subSkill, step) {
    const data = step === 'drill' ? subSkill.drill : subSkill.quiz;
    if (!data) return;

    this.ui.elements.modal_title.textContent = step === 'drill' ? '🎯 التمرين' : '🏆 الاختبار';
    this.ui.elements.modal_action_btn.style.display = 'none';
    this.ui.elements.modal_back_btn.classList.add('hidden');
    this.ui.elements.modal_exit_btn.style.display = 'inline-block';

    // Prepare questions
    const questions = this.prepareQuestions(subSkill, data);
    const count = Math.max(1, this.state.difficultySettings.questionsPerSession || 5);
    this.state.activitySession.questions = this.shuffleArray(questions).slice(0, count);
    this.state.activitySession.currentIndex = 0;
    this.state.activitySession.correctAnswers = 0;

    this.ui.showModal();
    this.renderCurrentQuestion(subSkill, data);
  }

  prepareQuestions(subSkill, data) {
    // If data.questions exist (quiz), use as-is
    if (Array.isArray(data.questions)) {
      return data.questions.map(q => ({ ...q, _type: 'quiz' }));
    }
    // For sort drill: build yes/no
    if (data.type === 'sort') {
      const correct = (data.correct || []).map(w => ({ word: w, isCorrect: true, _type: 'sort' }));
      const incorrect = (data.incorrect || []).map(w => ({ word: w, isCorrect: false, _type: 'sort' }));
      return [...correct, ...incorrect];
    }
    return [];
  }

  renderCurrentQuestion(subSkill, data) {
    const { questions, currentIndex } = this.state.activitySession;
    const q = questions[currentIndex];
    const type = q._type || 'quiz';
    this.questionRenderer.render(type, q, data, subSkill);
  }

  handleAnswer(isCorrect, targetEl) {
    const session = this.state.activitySession;
    if (isCorrect) session.correctAnswers++;

    // feedback
    this.ui.showFeedback(isCorrect, this.ui.elements.modal_feedback);
    if (isCorrect) this.effects.createQuickCelebration();

    // next
    setTimeout(() => {
      if (session.currentIndex < session.questions.length - 1) {
        session.currentIndex++;
        this.renderCurrentQuestion(this.data.getSubSkill(session.techniqueId, session.subSkillId), session.step === 'drill' ? 'drill' : 'quiz');
      } else {
        this.finishQAFlow();
      }
    }, 500);
  }

  finishQAFlow() {
    const { techniqueId, subSkillId, step, correctAnswers, questions } = this.state.activitySession;
    const total = questions.length;
    const pass = (correctAnswers / total) >= (this.state.difficultySettings.passingScore || 0.8);

    this.ui.hideModal();
    const gained = pass ? (step === 'quiz' ? 10 : 5) : 0;
    if (pass) this.state.markStepComplete(techniqueId, subSkillId, step);

    const title = pass ? 'أحسنت! ✅' : 'حاول مرة أخرى 💪';
    const reward = pass ? `+${gained} ⭐` : '—';
    this.ui.showSuccessModal(`${title} (${correctAnswers}/${total})`, reward);

    setTimeout(() => {
      this.ui.hideSuccessModal();
      this.ui.renderTechniqueView(techniqueId);
    }, 1800);
  }

  // utils
  shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
