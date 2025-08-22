'use strict';

export class UIManager {
  constructor(dataManager, stateManager, audioManager, effectsManager) {
    this.dataManager = dataManager;
    this.stateManager = stateManager;
    this.audioManager = audioManager;
    this.effectsManager = effectsManager;

    this.elements = {
      // Core
      start_btn: document.getElementById('start-btn'),
      splash_screen: document.getElementById('splash-screen'),
      app: document.getElementById('app'),

      // Burger + menu
      burger_btn: document.getElementById('burger-btn'),
      menu_content: document.getElementById('menu-content'),
      learning_dashboard_btn: document.getElementById('learning-dashboard-btn'),
      note_btn: document.getElementById('note-btn'),
      unlock_all_btn: document.getElementById('unlock-all-btn'),

      // Note modal
      note_modal: document.getElementById('note-modal'),
      close_note: document.getElementById('close-note'),
      copy_email: document.getElementById('copy-email'),

      // Theme buttons
      theme_buttons: document.querySelectorAll('.theme-btn'),

      // Views
      skills_tree: document.getElementById('skills-tree'),
      back_btn: document.getElementById('back-btn'),

      // Modals
      success_modal: document.getElementById('success-modal'),
      success_close_btn: document.getElementById('success-close-btn'),
      modal_exit_btn: document.getElementById('modal-exit-btn'),
      modal_action_btn: document.getElementById('modal-action-btn'),

      // Activity modal root (needed for hide)
      activity_modal: document.getElementById('activity-modal')
    };
  }

  renderSkillsGrid() {
    const container = this.elements.skills_tree;
    if (!container) return;
    container.innerHTML = '';

    this.dataManager.techniques.forEach((technique, index) => {
      const unlocked = this.stateManager.isTechniqueUnlocked(index, this.dataManager.techniques);
      const progress = this.stateManager.getTechniqueProgress(technique.id);

      const card = document.createElement('div');
      card.className = `skill-card ${unlocked ? '' : 'locked'}`;
      card.dataset.techniqueId = technique.id;
      card.innerHTML = `
        <div class="skill-card-content">
          <h3 class="skill-title">${technique.name}</h3>
          <p class="skill-status">${progress.mastered ? '✅ متقن' : unlocked ? '🔓 متاح' : '🔒 مقفل'}</p>
        </div>
      `;
      container.appendChild(card);
    });
  }

  renderTechniqueView(techniqueId) {
    const container = this.elements.skills_tree;
    if (!container) return;
    container.innerHTML = '';

    const technique = this.dataManager.getTechniqueById(techniqueId);
    if (!technique) return;

    const title = document.createElement('h2');
    title.className = 'technique-title';
    title.textContent = technique.name;
    container.appendChild(title);

    technique.subskills.forEach(sub => {
      const subDiv = document.createElement('div');
      subDiv.className = 'subskill';

      const subTitle = document.createElement('h3');
      subTitle.className = 'subskill-title';
      subTitle.textContent = sub.name;
      subDiv.appendChild(subTitle);

      sub.steps.forEach(step => {
        const btn = document.createElement('button');
        btn.className = 'step-button';
        btn.dataset.step = step;
        btn.dataset.subskillId = sub.id;
        btn.textContent = step;
        subDiv.appendChild(btn);
      });

      container.appendChild(subDiv);
    });

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-secondary';
    backBtn.textContent = '⬅ العودة';
    backBtn.addEventListener('click', () => this.renderSkillsGrid());
    container.appendChild(backBtn);
  }

  showSuccessModal() { this.elements.success_modal?.classList.remove('hidden'); }
  hideSuccessModal() { this.elements.success_modal?.classList.add('hidden'); }

  // Close activity modal (this was previously empty)
  hideModal() {
    this.elements.activity_modal?.classList.add('hidden');
  }
}
