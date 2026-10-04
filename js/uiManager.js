'use strict';
import { escapeHtml } from './textUtils.js';

// Manages the main UI, including rendering views and modals.
export class UIManager {
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
      'success-modal', 'success-message', 'success-reward', 'success-close-btn', 'success-secondary-btn',
      'success-emoji', 'success-title',
      'points-display', 'streak-count', 'home-banner',
      // NEW:
      'note-page','note-back-btn'
    ];
    ids.forEach(id => {
      this.elements[id.replace(/-/g, '_')] = document.getElementById(id);
    });
    this.updateHeader();
  }

  // Lessons have 3 steps: learn + drill + quiz
  getSubSkillStepCount() {
    return 3;
  }

  updateHeader() {
    this.elements.points_display.textContent = `${this.state.userProgress.points} نقطة ⭐`;
    this.elements.streak_count.textContent = this.state.userProgress.streak;
    this.elements.points_display.classList.add('celebration');
    setTimeout(() => this.elements.points_display.classList.remove('celebration'), 600);
  }

  showView(viewName) {
    // hide main views
    [this.elements.skills_view, this.elements.technique_view, this.elements.note_page].forEach(v => v.classList.add('hidden'));
    if (viewName === 'skills') {
      this.elements.main_title.textContent = "اختر وحدة";
      this.elements.skills_view.classList.remove('hidden');
    } else if (viewName === 'technique') {
      this.elements.technique_view.classList.remove('hidden');
    } else if (viewName === 'note') {
      this.elements.main_title.textContent = "ملاحظة مهمة";
      this.elements.note_page.classList.remove('hidden');
    }
  }

  renderHomeBanner() {
    const el = this.elements.home_banner;
    if (!el) return;
    const due = this.state.getDueReviewKeys(99).length;
    const learned = this.state.countWordsLearned(this.data.getTechniques());
    const notice = this.state.migratedFromV1 && !this.state.userProgress.placementDone
      ? `<div class="home-notice">تمّ تحديث الدورة وتوسيعها. حدّد مستواك لتبدأ من الوحدة المناسبة لك.</div>` : '';
    el.innerHTML = `
      ${notice}
      <div class="home-stat">📚 تستطيع الآن قراءة <b>${learned}</b> كلمة</div>
      <div class="home-actions">
        <button id="review-btn" class="${due ? 'btn-primary' : 'btn-secondary'}" ${due ? '' : 'disabled'}>🔁 ${due ? `مراجعة اليوم (${due})` : 'لا مراجعة اليوم'}</button>
        <button id="placement-btn" class="btn-secondary">🧭 حدّد مستواي</button>
      </div>`;
  }

  renderSkillsGrid() {
    const skillsTree = this.elements.skills_tree;
    skillsTree.innerHTML = '';
    const techniques = this.data.getTechniques();
    // First unit alone, then pairs, last one alone if left over.
    const rows = [techniques.slice(0, 1)];
    for (let i = 1; i < techniques.length; i += 2) rows.push(techniques.slice(i, i + 2));

    rows.forEach((row) => {
      const skillRow = document.createElement('div');
      skillRow.className = 'skill-row';
      row.forEach((tech, techIndex) => {
        if (!tech) return;
        const techniqueIndex = techniques.indexOf(tech);
        const techProgress = this.state.getTechniqueProgress(tech.id);
        const isMastered = techProgress.mastered;
        const isUnlocked = this.state.isTechniqueUnlocked(techniqueIndex, techniques);
        const completedSteps = tech.subSkills.reduce((n, s) => n + (techProgress.subSkills[s.id] || []).length, 0);
        const totalSteps = tech.subSkills.length * this.getSubSkillStepCount();
        const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

        const card = document.createElement('div');
        card.className = `skill-card ${isMastered ? 'mastered' : ''} ${!isUnlocked ? 'locked' : ''}`;
        card.dataset.techniqueId = tech.id;
        card.innerHTML = `
          <div class="flex items-center justify-between mb-4">
            <div class="text-4xl">${tech.icon}</div>
            ${isMastered ? '<span class="achievement-badge">متقن!</span>' : `<span class="unit-number">الوحدة ${techniqueIndex}</span>`}
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2 english-font">${escapeHtml(tech.name)}</h3>
          <p class="text-gray-600 mb-4">${escapeHtml(tech.name_ar)}</p>
          <div class="progress-bar mb-2">
            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
          </div>
          <div class="text-sm text-gray-500">${completedSteps} / ${totalSteps} خطوة</div>`;
        skillRow.appendChild(card);

        if (techIndex < row.length - 1) {
          const connector = document.createElement('div');
          connector.className = 'skill-connector';
          skillRow.appendChild(connector);
        }
      });
      skillsTree.appendChild(skillRow);
    });
    this.renderHomeBanner();
    this.showView('skills');
    this.updateHeader();
  }

  scoreBadge(score) {
    if (score === undefined) return '';
    return `<span class="score-badge">${Math.round(score * 100)}%</span>`;
  }

  renderTechniqueView(techniqueId) {
    const { main_title, subskills_container } = this.elements;
    const tech = this.data.getTechnique(techniqueId);
    const techProgress = this.state.getTechniqueProgress(techniqueId);

    main_title.textContent = tech.name_ar;
    subskills_container.innerHTML = tech.intro ? `<p class="unit-intro">${escapeHtml(tech.intro)}</p>` : '';

    tech.subSkills.forEach(subSkill => {
      const subSkillProgress = techProgress.subSkills[subSkill.id] || [];
      const card = document.createElement('div');
      card.className = 'skill-card p-4';
      const drillScore = this.state.getScore(subSkill.id, 'drill');
      const quizScore = this.state.getScore(subSkill.id, 'quiz');

      const buttonsHTML = `
          <div class="w-full mt-4">
            <div class="flex flex-col sm:flex-row gap-2 w-full">
              <button class="step-button flex-1 ${subSkillProgress.includes('learn') ? 'completed' : ''}"
                      data-step="learn"
                      data-subskill-id="${subSkill.id}">
                📖 تعلّم
              </button>
              <button class="step-button flex-1 ${subSkillProgress.includes('drill') ? 'completed' : ''}"
                      data-step="drill"
                      data-subskill-id="${subSkill.id}"
                      ${!subSkillProgress.includes('learn') ? 'disabled' : ''}>
                🎯 تمرين ${this.scoreBadge(drillScore)}
              </button>
              <button class="step-button flex-1 ${subSkillProgress.includes('quiz') ? 'completed' : ''}"
                      data-step="quiz"
                      data-subskill-id="${subSkill.id}"
                      ${!subSkillProgress.includes('drill') ? 'disabled' : ''}>
                🏆 اختبار ${this.scoreBadge(quizScore)}
              </button>
            </div>
          </div>`;

      card.innerHTML = `
        <div class="flex flex-col">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-3xl">${subSkill.icon}</span>
            <h3 class="text-xl font-bold text-gray-800">${escapeHtml(subSkill.name)}</h3>
          </div>
          ${buttonsHTML}
        </div>`;

      subskills_container.appendChild(card);
    });
    this.showView('technique');
    this.updateHeader();
  }

  showModal() { this.elements.activity_modal.classList.remove('hidden'); }

  hideModal() {
    this.elements.activity_modal.classList.add('hidden');
    this.audio.stop();
    // Make sure no effects remain visible after closing modal
    this.effects.clearEffects();
  }

  // secondary: optional { label, onClick } for a second button (e.g. "review the lesson").
  // look: optional { emoji, title } — e.g. a failed test should not say "رائع جداً!".
  showSuccessModal(message, reward, secondary = null, look = {}) {
    this.elements.success_emoji.textContent = look.emoji || '🎉';
    this.elements.success_title.textContent = look.title || 'رائع جداً!';
    this.elements.success_message.textContent = message;
    this.elements.success_reward.textContent = reward;
    const btn = this.elements.success_secondary_btn;
    if (btn) {
      if (secondary) {
        btn.textContent = secondary.label;
        btn.onclick = () => { this.hideSuccessModal(); secondary.onClick(); };
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
        btn.onclick = null;
      }
    }
    this.elements.success_modal.classList.remove('hidden');
    this.updateHeader();
  }

  hideSuccessModal() { this.elements.success_modal.classList.add('hidden'); }
}
