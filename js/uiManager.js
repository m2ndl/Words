'use strict';

export class UIManager {
    constructor(dataManager, stateManager, audioManager, effectsManager) {
        this.dataManager = dataManager;
        this.stateManager = stateManager;
        this.audioManager = audioManager;
        this.effectsManager = effectsManager;

        // Collect all required DOM elements
        this.elements = {
            // Core
            start_btn: document.getElementById('start-btn'),
            splash_screen: document.getElementById('splash-screen'),
            app: document.getElementById('app'),

            // Burger menu + navbar
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

            // Skills grid container
            skills_tree: document.getElementById('skills-tree'),

            // Success modal (if used in your app)
            success_modal: document.getElementById('success-modal'),
            success_close_btn: document.getElementById('success-close-btn'),

            // Generic modal (if used in your app)
            modal_exit_btn: document.getElementById('modal-exit-btn'),
            modal_action_btn: document.getElementById('modal-action-btn'),

            // Back button (if included in your HTML)
            back_btn: document.getElementById('back-btn'),
        };
    }

    /**
     * Render the skills grid (called from main.js when starting the app)
     */
    renderSkillsGrid() {
        const container = this.elements.skills_tree;
        container.innerHTML = '';

        this.dataManager.techniques.forEach((technique, index) => {
            const unlocked = this.stateManager.isTechniqueUnlocked(index, this.dataManager.techniques);
            const progress = this.stateManager.getTechniqueProgress(technique.id);

            const card = document.createElement('div');
            card.className = `skill-card ${unlocked ? '' : 'locked'}`;
            card.dataset.techniqueId = technique.id;

            card.innerHTML = `
                <h3 class="font-bold">${technique.name}</h3>
                <p>${progress.mastered ? '✅ متقن' : unlocked ? '🔓 متاح' : '🔒 مقفل'}</p>
            `;

            container.appendChild(card);
        });
    }

    /**
     * Render a technique view (list of subskills + steps)
     */
    renderTechniqueView(techniqueId) {
        const container = this.elements.skills_tree;
        container.innerHTML = '';

        const technique = this.dataManager.getTechniqueById(techniqueId);
        if (!technique) return;

        const title = document.createElement('h2');
        title.className = 'text-xl font-bold mb-4';
        title.textContent = technique.name;
        container.appendChild(title);

        technique.subskills.forEach(sub => {
            const subDiv = document.createElement('div');
            subDiv.className = 'subskill mb-4';

            const subTitle = document.createElement('h3');
            subTitle.className = 'font-semibold';
            subTitle.textContent = sub.name;
            subDiv.appendChild(subTitle);

            sub.steps.forEach(step => {
                const btn = document.createElement('button');
                btn.className = 'step-button px-4 py-2 bg-blue-600 text-white rounded-lg mr-2 mt-2 disabled:opacity-50';
                btn.dataset.step = step;
                btn.dataset.subskillId = sub.id;
                btn.textContent = step;
                subDiv.appendChild(btn);
            });

            container.appendChild(subDiv);
        });

        // Add back button
        const backBtn = document.createElement('button');
        backBtn.id = 'back-btn';
        backBtn.className = 'mt-6 px-4 py-2 bg-gray-600 text-white rounded-lg';
        backBtn.textContent = '⬅ العودة';
        backBtn.addEventListener('click', () => this.renderSkillsGrid());
        container.appendChild(backBtn);
    }

    /**
     * Show success modal (if used)
     */
    showSuccessModal() {
        if (this.elements.success_modal) {
            this.elements.success_modal.classList.remove('hidden');
        }
    }

    hideSuccessModal() {
        if (this.elements.success_modal) {
            this.elements.success_modal.classList.add('hidden');
        }
    }

    /**
     * Show/hide generic modal
     */
    hideModal() {
        if (this.elements.note_modal) {
            this.elements.note_modal.classList.add('hidden');
        }
    }
}
