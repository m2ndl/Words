import { UIManager } from './uiManager.js';
import { SoundManager } from './soundManager.js';
import { StateManager } from './stateManager.js';
import { DataManager } from './dataManager.js';
import { TeacherDashboard } from './teacherDashboard.js';
import { ThemeManager } from './themeManager.js';
import { EffectsManager } from './effectsManager.js';

class ModernPhonicsApp {
    constructor() {
        this.uiManager = new UIManager();
        this.soundManager = new SoundManager();
        this.stateManager = new StateManager();
        this.dataManager = new DataManager();
        this.teacherDashboard = new TeacherDashboard(this.stateManager, this.dataManager);
        this.themeManager = new ThemeManager();
        this.effectsManager = new EffectsManager();

        this.initEventListeners();
    }

    initEventListeners() {
        // Burger menu toggle
        document.getElementById('burger-btn').addEventListener('click', () => {
            document.getElementById('menu-content').classList.toggle('hidden');
        });

        // Learning dashboard
        document.getElementById('learning-dashboard-btn').addEventListener('click', () => {
            this.teacherDashboard.toggle();
        });

        // Show important note modal
        document.getElementById('note-btn').addEventListener('click', () => {
            document.getElementById('note-modal').classList.remove('hidden');
        });

        // Close note modal
        document.getElementById('close-note').addEventListener('click', () => {
            document.getElementById('note-modal').classList.add('hidden');
        });

        // Copy email
        document.getElementById('copy-email').addEventListener('click', () => {
            navigator.clipboard.writeText("hello@my2ndlang.com").then(() => {
                alert("📋 تم نسخ البريد الإلكتروني");
            });
        });

        // Unlock all modules
        document.getElementById('unlock-all-btn').addEventListener('click', () => {
            this.stateManager.unlockAllModules();
            alert("✅ تم فتح جميع الوحدات، يمكنك الآن البدء من أي مكان.");
        });

        // Start button
        document.getElementById('start-btn').addEventListener('click', () => {
            document.getElementById('splash-screen').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new ModernPhonicsApp();
});
