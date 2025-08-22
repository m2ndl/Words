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

        this.teacherDashboard = new TeacherDashboard(
            this.dataManager,
            this.stateManager
        );

        this.initEventListeners();
    }

    initEventListeners() {
        const { elements } = this.uiManager;

        /** 🌟 Splash screen start button */
        if (elements.start_btn) {
            elements.start_btn.addEventListener('click', () => {
                this.effectsManager.soundManager.resumeAudioContext();
                this.start();
            });
        }

        /** ⬅ Back button */
        if (elements.back_btn) {
            elements.back_btn.addEventListener('click', () =>
                this.uiManager.renderSkillsGrid()
            );
        }

        /** ✅ Success modal */
        if (elements.success_close_btn) {
            elements.success_close_btn.addEventListener('click', () => {
                this.uiManager.hideSuccessModal();
                if (this.stateManager.currentTechniqueId) {
                    this.uiManager.renderTechniqueView(
                        this.stateManager.currentTechniqueId
                    );
                } else {
                    this.uiManager.renderSkillsGrid();
                }
            });
        }

        /** ❌ Generic modal exit */
        if (elements.modal_exit_btn) {
            elements.modal_exit_btn.addEventListener('click', () =>
                this.uiManager.hideModal()
            );
        }

        /** ▶ Modal action */
        if (elements.modal_action_btn) {
            elements.modal_action_btn.addEventListener('click', () => {
                if (this.stateManager.activitySession.step === 'learn') {
                    this.gameEngine.endSession();
                }
            });
        }

        /** 🍔 Burger menu toggle */
        if (elements.burger_btn && elements.menu_content) {
            elements.burger_btn.addEventListener('click', () => {
                elements.menu_content.classList.toggle('hidden');
            });
        }

        /** 📊 Learning dashboard */
        if (elements.learning_dashboard_btn) {
            elements.learning_dashboard_btn.addEventListener('click', () => {
                this.teacherDashboard.toggle();
                elements.menu_content.classList.add('hidden');
            });
        }

        /** 📝 Important note modal */
        if (elements.note_btn && elements.note_modal) {
            elements.note_btn.addEventListener('click', () => {
                elements.note_modal.classList.remove('hidden');
                elements.menu_content.classList.add('hidden');
            });
        }
        if (elements.close_note) {
            elements.close_note.addEventListener('click', () =>
                elements.note_modal.classList.add('hidden')
            );
        }
        if (elements.copy_email) {
            elements.copy_email.addEventListener('click', () => {
                navigator.clipboard
                    .writeText('hello@my2ndlang.com')
                    .then(() => alert('📋 تم نسخ البريد الإلكتروني'));
            });
        }

        /** 📂 Unlock all units */
        if (elements.unlock_all_btn) {
            elements.unlock_all_btn.addEventListener('click', () => {
                if (confirm('هل تريد فتح جميع الوحدات؟')) {
                    this.stateManager.unlockAllModules(this.dataManager.techniques);
                    this.uiManager.renderSkillsGrid();
                    alert('✅ تم فتح جميع الوحدات');
                }
                elements.menu_content.classList.add('hidden');
            });
        }

        /** 🎨 Theme change */
        if (elements.theme_buttons) {
            elements.theme_buttons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.themeManager.setTheme(btn.dataset.theme);
                    elements.menu_content.classList.add('hidden');
                });
            });
        }

        /** 🎧 Audio + skills handling */
        document.addEventListener('click', (e) => {
            const speakerButton = e.target.closest('[data-speak]');
            if (speakerButton) {
                this.audioManager.speak(speakerButton.dataset.speak);
                return;
            }

            const skillCard = e.target.closest(
                '#skills-tree .skill-card:not(.locked)'
            );
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
                    this.gameEngine.runActivity(
                        this.stateManager.currentTechniqueId,
                        subskillId,
                        step
                    );
                }
            }
        });
    }

    /** 🚀 Start app */
    start() {
        this.uiManager.elements.splash_screen.style.display = 'none';
        this.uiManager.elements.app.classList.remove('hidden');
        this.uiManager.renderSkillsGrid();
    }
}

/** Initialize */
document.addEventListener('DOMContentLoaded', () => {
    new ModernPhonicsApp();
});
