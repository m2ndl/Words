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
    this.uiManager = new UIManager(this.dataManager, this.stateManager, this.audioManager, this.effectsManager);
    this.gameEngine = new GameEngine(this.dataManager, this.stateManager, this.uiManager, this.audioManager, this.effectsManager);
    this.teacherDashboard = new TeacherDashboard(this.dataManager, this.stateManager);
    this.initEventListeners();
  }

  initEventListeners() {
    const { elements } = this.uiManager;

    // Start / Navigation
    elements.start_btn.addEventListener('click', () => { this.effectsManager.soundManager.resumeAudioContext(); this.start(); });
    elements.back_btn.addEventListener('click', () => this.uiManager.renderSkillsGrid());
    elements.note_back_btn.addEventListener('click', () => this.uiManager.renderSkillsGrid());
    elements.success_close_btn.addEventListener('click', () => {
      this.uiManager.hideSuccessModal();
      if (this.stateManager.currentTechniqueId) this.uiManager.renderTechniqueView(this.stateManager.currentTechniqueId);
      else this.uiManager.renderSkillsGrid();
    });

    // Activity modal
    elements.modal_exit_btn.addEventListener('click', () => this.uiManager.hideModal());
    elements.modal_action_btn.addEventListener('click', () => {
      if (this.stateManager.activitySession.step === 'learn') this.gameEngine.endSession();
    });

    // Dashboard
    document.getElementById('teacher-dashboard-btn').addEventListener('click', () => this.teacherDashboard.toggle());

    // Burger menu
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    const openMenu = () => { sideMenu.classList.remove('translate-x-full'); overlay.classList.remove('hidden'); };
    const closeMenu = () => { sideMenu.classList.add('translate-x-full'); overlay.classList.add('hidden'); };

    document.getElementById('menu-btn').addEventListener('click', openMenu);
    document.getElementById('menu-close').addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Menu items
    document.getElementById('menu-dashboard').addEventListener('click', () => { closeMenu(); this.teacherDashboard.toggle(); });
    document.getElementById('menu-website').addEventListener('click', () => closeMenu());

    const unlockBtn = document.getElementById('menu-unlock');
    const refreshUnlockBtnText = () => {
      unlockBtn.textContent = this.stateManager.unlockAll ? '🔒 إلغاء فتح جميع الوحدات' : '🔓 فتح جميع الوحدات';
    };
    refreshUnlockBtnText();
    document.getElementById('menu-unlock').addEventListener('click', () => {
      this.stateManager.toggleUnlockAll();
      refreshUnlockBtnText();
      // Refresh current view to reflect unlocked state
      if (this.stateManager.currentTechniqueId) this.uiManager.renderTechniqueView(this.stateManager.currentTechniqueId);
      else this.uiManager.renderSkillsGrid();
      closeMenu();
    });

    document.getElementById('menu-note').addEventListener('click', () => {
      closeMenu();
      this.uiManager.showView('note');
    });

    // Copy email
    document.getElementById('copy-email-btn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('hello@my2ndlang.com');
        const toast = document.getElementById('copy-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 1500);
      } catch {}
    });

    // Delegated clicks
    document.addEventListener('click', (e) => {
      const speakerButton = e.target.closest('[data-speak]');
      if (speakerButton) { this.audioManager.speak(speakerButton.dataset.speak); return; }

      const skillCard = e.target.closest('#skills-tree .skill-card:not(.locked)');
      if (skillCard) {
        const techniqueId = skillCard.dataset.techniqueId;
        if (techniqueId) {
          this.stateManager.currentTechniqueId = techniqueId;
          this.uiManager.renderTechniqueView(techniqueId);
        }
        return;
      }

      const stepButton = e.target.closest('.step-button:not(:disabled)');
      if (stepButton && stepButton.dataset.step) {
        const { step, subskillId } = stepButton.dataset;
        if (this.stateManager.currentTechniqueId) {
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

document.addEventListener('DOMContentLoaded', () => { new ModernPhonicsApp(); });
