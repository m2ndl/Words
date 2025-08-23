'use strict';

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
      'skills-tree', 'back-btn', 'subskills-container',
      'activity-modal', 'modal-title', 'modal-progress', 'modal-body', 'modal-feedback',
      'modal-action-btn', 'modal-exit-btn', 'modal-back-btn',
      'success-modal', 'success-message', 'success-reward', 'success-close-btn',
      'points-display', 'streak-count',
      'note-page','note-back-btn',
      'menu-btn','side-menu','side-menu-overlay','menu-close','menu-dashboard','theme-select'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) this.elements[id.replace(/-/g, '_')] = el;
    });
    this.updateHeader();
  }

  updateHeader() {
    if (this.elements.points_display) {
      this.elements.points_display.textContent = `${this.state.userProgress.points} نقطة ⭐`;
      this.elements.points_display.classList.add('celebration');
      setTimeout(() => this.elements.points_display.classList.remove('celebration'), 600);
    }
    if (this.elements.streak_count) {
      this.elements.streak_count.textContent = this.state.userProgress.streak;
    }
  }

  showView(viewName) {
    [this.elements.skills_view, this.elements.technique_view, this.elements.note_page].forEach(v => v && v.classList.add('hidden'));
    if (viewName === 'skills') {
      this.elements.main_title.textContent = 'اختر مهارة';
      this.elements.skills_view.classList.remove('hidden');
    } else if (viewName === 'technique') {
      this.elements.main_title.textContent = 'اختر درسًا';
      this.elements.technique_view.classList.remove('hidden');
    } else if (viewName === 'note') {
      this.elements.main_title.textContent = 'الملاحظات';
      this.elements.note_page.classList.remove('hidden');
    }
  }

  showModal() { this.elements.activity_modal.classList.remove('hidden'); }
  hideModal() { this.elements.activity_modal.classList.add('hidden'); }

  showSuccessModal(message, reward) {
    this.elements.success_message.textContent = message;
    this.elements.success_reward.textContent = reward || '';
    this.elements.success_modal.classList.remove('hidden');
  }
  hideSuccessModal() { this.elements.success_modal.classList.add('hidden'); }

  showFeedback(isCorrect, container = this.elements.modal_feedback) {
    const message = isCorrect ? (this.data.getRandomEncouragement() || 'أحسنت!') : 'حاول مرة أخرى 💪';
    if (container) {
      container.innerHTML = `<span class="${isCorrect ? 'text-green-600' : 'text-red-500'}">${message}</span>`;
    }
    if (isCorrect) this.effects.createQuickCelebration(); else this.effects.playWrongSound();
  }

  // ---------- Skills grid ----------
  renderSkillsGrid() {
    const skillsTree = this.elements.skills_tree;
    skillsTree.innerHTML = '';
    const techniques = this.data.getTechniques();

    // simple grid
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
    techniques.forEach(tech => {
      const techProgress = this.state.getTechniqueProgress(tech.id);
      const isMastered = !!techProgress.mastered;

      const card = document.createElement('div');
      card.className = `skill-card ${isMastered ? 'mastered' : ''}`;
      card.dataset.techniqueId = tech.id;
      card.innerHTML = `
        <div class="flex items-center justify-between mb-4">
          <div class="text-4xl">${tech.icon || '📘'}</div>
          ${isMastered ? '<span class="achievement-badge">متقن!</span>' : ''}
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2 english-font">${tech.name}</h3>
        <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
      `;
      grid.appendChild(card);
    });

    skillsTree.appendChild(grid);
  }

  // ---------- Technique view ----------
  renderTechniqueView(techniqueId) {
    this.showView('technique');
    const technique = this.data.getTechnique(techniqueId);
    const container = this.elements.subskills_container;
    container.innerHTML = '';

    technique.subSkills.forEach(subSkill => {
      const subSkillProgress = this.state.getTechniqueProgress(techniqueId).subSkills[subSkill.id] || [];
      const learnDone = subSkillProgress.includes('learn');
      const drillDone = subSkillProgress.includes('drill');

      const card = document.createElement('div');
      card.className = 'glass-card p-4';
      card.innerHTML = `
        <div class="flex items-center justify-between flex-wrap gap-y-4">
          <div class="flex items-center gap-3">
            <span class="text-3xl">${subSkill.icon || '📖'}</span>
            <h3 class="text-xl font-bold text-gray-800">${subSkill.name}</h3>
          </div>
          <div class="flex gap-2">
            <button class="step-button" data-step="learn" data-subskill-id="${subSkill.id}" ${learnDone ? 'disabled' : ''}>📖 تعلم</button>
            <button class="step-button" data-step="drill" data-subskill-id="${subSkill.id}" ${!learnDone ? 'disabled' : ''}>🎯 تمرين</button>
            <button class="step-button" data-step="quiz" data-subskill-id="${subSkill.id}" ${!drillDone ? 'disabled' : ''}>🏆 اختبار</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }
}
