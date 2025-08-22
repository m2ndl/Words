'use strict';
import { ThemeManager } from './themeManager.js';
import { EffectsManager } from './effectsManager.js';
import { DataManager } from './dataManager.js';
import { StateManager } from './stateManager.js';
import { AudioManager } from './audioManager.js';
import { UIManager } from './uiManager.js';
import { GameEngine } from './gameEngine.js';
import { TeacherDashboard } from './teacherDashboard.js';

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

        elements.start_btn.addEventListener('click', () => {
            this.effectsManager.soundManager.resumeAudioContext();
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
            if (this.stateManager.activitySession.step === 'learn') {
               this.gameEngine.endSession();
            }
        });

        // Burger menu toggle
        document.getElementById('burger-btn').addEventListener('click', () => {
            document.getElementById('menu-content').classList.toggle('hidden');
        });

        // Learning dashboard
        document.getElementById('learning-dashboard-btn').addEventListener('click', () => {
            this.teacherDashboard.toggle();
            document.getElementById('menu-content').classList.add('hidden');
        });

        // Important note
        document.getElementById('note-btn').addEventListener('click', () => {
            document.getElementById('note-modal').classList.remove('hidden');
            document.getElementById('menu-content').classList.add('hidden');
        });
        document.getElementById('close-note').addEventListener('click', () => {
            document.getElementById('note-modal').classList.add('hidden');
        });
        document.getElementById('copy-email').addEventListener('click', () => {
            navigator.clipboard.writeText("hello@my2ndlang.com").then(() => {
                alert("📋 تم نسخ البريد الإلكتروني");
            });
        });

        // 🔓 Unlock all modules
        document.getElementById('unlock-all-btn').addEventListener('click', () => {
            this.stateManager.unlockAllModules();
            alert("✅ تم فتح جميع الوحدات، يمكنك الآن البدء من أي مكان.");
            document.getElementById('menu-content').classList.add('hidden');
            this.uiManager.renderSkillsGrid(); // refresh view
        });

        document.addEventListener('click', (e) => {
            const speakerButton = e.target.closest('[data-speak]');
            if (speakerButton) {
                this.audioManager.speak(speakerButton.dataset.speak);
                return;
            }

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new ModernPhonicsApp();
});
