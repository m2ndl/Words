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
    
    // FIXED: Wait for everything to load before setting up buttons
    this.init().catch(console.error);
  }

  async init() {
    try {
      // Wait for data to load first
      await this.dataManager.init();
      
      // Then create all the managers
      this.uiManager = new UIManager(this.dataManager, this.stateManager, this.audioManager, this.effectsManager);
      this.gameEngine = new GameEngine(this.dataManager, this.stateManager, this.uiManager, this.audioManager, this.effectsManager);
      this.teacherDashboard = new TeacherDashboard(this.dataManager, this.stateManager);
      
      // Finally set up all the button listeners
      this.initEventListeners();
      
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }

  initEventListeners() {
    const { elements } = this.uiManager;

    // Start button and navigation buttons
    elements.start_btn.addEventListener('click', () => { 
      this.effectsManager.soundManager.resumeAudioContext(); 
      this.start(); 
    });
    
    elements.back_btn.addEventListener('click', () => this.uiManager.renderSkillsGrid());
    elements.note_back_btn.addEventListener('click', () => this.uiManager.renderSkillsGrid());
    
    elements.success_close_btn.addEventListener('click', () => {
      this.uiManager.hideSuccessModal();
      if (this.stateManager.currentTechniqueId) {
        this.uiManager.renderTechniqueView(this.stateManager.currentTechniqueId);
      } else {
        this.uiManager.renderSkillsGrid();
      }
    });

    // Activity modal buttons
    elements.modal_exit_btn.addEventListener('click', () => this.uiManager.hideModal());
    elements.modal_action_btn.addEventListener('click', () => {
      if (this.stateManager.activitySession.step === 'learn') {
        this.gameEngine.endSession();
      }
    });

    // Burger menu setup
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    
    const openMenu = () => { 
      sideMenu.classList.remove('translate-x-full'); 
      overlay.classList.remove('hidden'); 
    };
    
    const closeMenu = () => { 
      sideMenu.classList.add('translate-x-full'); 
      overlay.classList.add('hidden'); 
    };

    document.getElementById('menu-btn').addEventListener('click', openMenu);
    document.getElementById('menu-close').addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Menu items
    document.getElementById('menu-dashboard').addEventListener('click', () => { 
      closeMenu(); 
      this.teacherDashboard.toggle(); 
    });
    
    document.getElementById('menu-website').addEventListener('click', () => closeMenu());

    // Unlock all button
    const unlockBtn = document.getElementById('menu-unlock');
    const refreshUnlockBtnText = () => {
      unlockBtn.textContent = this.stateManager.unlockAll ? 
        '🔒 إلغاء فتح جميع الوحدات' : 
        '🔓 فتح جميع الوحدات';
    };
    
    refreshUnlockBtnText();
    
    document.getElementById('menu-unlock').addEventListener('click', () => {
      this.stateManager.toggleUnlockAll();
      refreshUnlockBtnText();
      
      // Refresh the current view to show the unlocked state
      if (this.stateManager.currentTechniqueId) {
        this.uiManager.renderTechniqueView(this.stateManager.currentTechniqueId);
      } else {
        this.uiManager.renderSkillsGrid();
      }
      closeMenu();
    });

    // Important note button
    document.getElementById('menu-note').addEventListener('click', () => {
      closeMenu();
      this.uiManager.showView('note');
    });

    // Copy email button
    document.getElementById('copy-email-btn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('hello@my2ndlang.com');
        const toast = document.getElementById('copy-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 1500);
      } catch (error) {
        console.log('Could not copy email');
      }
    });

    // Handle clicks on the entire page (for skill cards and activity buttons)
    document.addEventListener('click', (e) => {
      // Handle speaker buttons (audio)
      const speakerButton = e.target.closest('[data-speak]');
      if (speakerButton) { 
        this.audioManager.speak(speakerButton.dataset.speak); 
        return; 
      }

      // Handle skill card clicks (to open technique view)
      const skillCard = e.target.closest('#skills-tree .skill-card:not(.locked)');
      if (skillCard) {
        const techniqueId = skillCard.dataset.techniqueId;
        if (techniqueId) {
          this.stateManager.currentTechniqueId = techniqueId;
          this.uiManager.renderTechniqueView(techniqueId);
        }
        return;
      }

      // Handle step button clicks (learn, drill, quiz)
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
    // Hide the landing page and show the main app
    this.uiManager.elements.splash_screen.style.display = 'none';
    this.uiManager.elements.app.classList.remove('hidden');
    this.uiManager.renderSkillsGrid();
  }
}

// Start the app when the page loads
document.addEventListener('DOMContentLoaded', () => { 
  new ModernPhonicsApp(); 
});
