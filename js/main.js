'use strict';
import { ThemeManager } from './themeManager.js';
import { EffectsManager } from './effectsManager.js';
import { DataManager } from './dataManager.js';
import { StateManager } from './stateManager.js';
import { AudioManager } from './audioManager.js';
import { UIManager } from './uiManager.js';
import { TeacherDashboard } from './teacherDashboard.js';
import { GameEngine } from './gameEngine.js';

class ModernPhonicsApp {
  constructor() {
    this.themeManager = new ThemeManager();
    this.effectsManager = new EffectsManager();
    this.dataManager = new DataManager();
    this.stateManager = new StateManager();
    this.audioManager = new AudioManager();
    this.uiManager = null;
    this.gameEngine = null;
    this.teacherDashboard = null;
    this.init();
  }

  async init() {
    await this.dataManager.init();

    this.uiManager = new UIManager(
      this.dataManager,
      this.stateManager,
      this.audioManager,
      this.effectsManager
    );

    this.gameEngine = new GameEngine(
      this.dataManager,
      this.stateManager,
      this.uiManager,
      this.audioManager,
      this.effectsManager
    );

    this.teacherDashboard = new TeacherDashboard(this.dataManager, this.stateManager);
    this.initEventListeners();
  }

  // tiny helper to avoid null crashes
  _on(el, evt, fn) { if (el) el.addEventListener(evt, fn); }

  initEventListeners() {
    const { elements } = this.uiManager;

    // Start / Navigation
    this._on(elements.start_btn, 'click', () => {
      // some browsers require a user gesture to resume AudioContext
      if (this.effectsManager?.soundManager?.resumeAudioContext) {
        try { this.effectsManager.soundManager.resumeAudioContext(); } catch {}
      }
      this.start();
    });

    this._on(elements.back_btn, 'click', () => this.uiManager.renderSkillsGrid());
    this._on(elements.note_back_btn, 'click', () => this.uiManager.renderSkillsGrid());

    this._on(elements.success_close_btn, 'click', () => {
      this.uiManager.hideSuccessModal();
      if (this.stateManager.currentTechniqueId) {
        this.uiManager.renderTechniqueView(this.stateManager.currentTechniqueId);
      } else {
        this.uiManager.renderSkillsGrid();
      }
    });

    // Activity modal (Exit only — Next is handled by GameEngine during Learn/Drill/Quiz)
    this._on(elements.modal_exit_btn, 'click', () => this.uiManager.hideModal());

    // Dashboard
    this._on(document.getElementById('teacher-dashboard-btn'),
      'click', () => this.teacherDashboard.toggle());

    // Burger menu
    const sideMenu = document.getElementById('side-menu');
    const overlay  = document.getElementById('side-menu-overlay');
    const openMenu  = () => { if (sideMenu && overlay) { sideMenu.classList.remove('translate-x-full'); overlay.classList.remove('hidden'); } };
    const closeMenu = () => { if (sideMenu && overlay) { sideMenu.classList.add('translate-x-full'); overlay.classList.add('hidden'); } };

    this._on(document.getElementById('menu-btn'), 'click', openMenu);
    this._on(document.getElementById('menu-close'), 'click', closeMenu);
    this._on(overlay, 'click', closeMenu);

    // Menu items
    this._on(document.getElementById('menu-dashboard'), 'click', () => { closeMenu(); this.teacherDashboard.toggle(); });
    this._on(document.getElementById('menu-website'), 'click', () => closeMenu());

    const unlockBtn = document.getElementById('menu-unlock');
    const refreshUnlockBtnText = () => {
      if (!unlockBtn) return;
      unlockBtn.textContent = this.stateManager.unlockAll
        ? '🔒 إلغاء فتح جميع الوحدات'
        : '🔓 فتح جميع الوحدات';
    };
    refreshUnlockBtnText();

    this._on(unlockBtn, 'click', () => {
      if (typeof this.stateManager.toggleUnlockAll === 'function') {
        this.stateManager.toggleUnlockAll();
        refreshUnlockBtnText();
        if (this.stateManager.currentTechniqueId) {
          this.uiManager.renderTechniqueView(this.stateManager.currentTechniqueId);
        } else {
          this.uiManager.renderSkillsGrid();
        }
      }
      closeMenu();
    });

    this._on(document.getElementById('menu-note'), 'click', () => {
      closeMenu();
      this.uiManager.showView('note');
    });

    // Delegated clicks (speakers, skill cards, step buttons)
    document.addEventListener('click', (e) => {
      const speakerButton = e.target.closest?.('[data-speak]');
      if (speakerButton) { this.audioManager.speak(speakerButton.dataset.speak); return; }

      const skillCard = e.target.closest?.('#skills-tree .skill-card:not(.locked)');
      if (skillCard) {
        const techniqueId = skillCard.dataset.techniqueId;
        if (techniqueId) {
          this.stateManager.currentTechniqueId = techniqueId;
          this.uiManager.renderTechniqueView(techniqueId);
        }
        return;
      }

      const stepButton = e.target.closest?.('.step-button:not(:disabled)');
      if (stepButton && stepButton.dataset.step) {
        const { step, subskillId } = stepButton.dataset;
        if (this.stateManager.currentTechniqueId) {
          this.gameEngine.runActivity(this.stateManager.currentTechniqueId, subskillId, step);
        }
      }
    });
  }

  start() {
    if (this.uiManager?.elements?.splash_screen) {
      this.uiManager.elements.splash_screen.style.display = 'none';
    }
    if (this.uiManager?.elements?.app) {
      this.uiManager.elements.app.classList.remove('hidden');
    }
    this.uiManager.renderSkillsGrid();
  }
}

document.addEventListener('DOMContentLoaded', () => { new ModernPhonicsApp(); });
