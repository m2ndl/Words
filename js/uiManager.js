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
            'skills-tree', 'back-btn', 'subskills-container', 'activity-modal', 'modal-title',
            'modal-progress', 'modal-body', 'modal-feedback', 'modal-action-btn', 'modal-exit-btn',
            'success-modal', 'success-message', 'success-reward', 'success-close-btn',
            'points-display', 'streak-count'
        ];
        ids.forEach(id => {
            this.elements[id.replace(/-/g, '_')] = document.getElementById(id);
        });
        this.updateHeader();
    }

    updateHeader() {
        this.elements.points_display.textContent = `${this.state.userProgress.points} نقطة ⭐`;
        this.elements.streak_count.textContent = this.state.userProgress.streak;
        this.elements.points_display.classList.add('celebration');
        setTimeout(() => this.elements.points_display.classList.remove('celebration'), 600);
    }

    showView(viewName) {
        [this.elements.skills_view, this.elements.technique_view].forEach(v => v.classList.add('hidden'));
        if (viewName === 'skills') {
            this.elements.main_title.textContent = "اختر مهارة";
            this.elements.skills_view.classList.remove('hidden');
        } else if (viewName === 'technique') {
            this.elements.technique_view.classList.remove('hidden');
        }
    }

    renderSkillsGrid() {
        const skillsTree = this.elements.skills_tree;
        skillsTree.innerHTML = '';
        const techniques = this.data.getTechniques();
        const rows = [
            [techniques[0]], [techniques[1], techniques[2]], [techniques[3]],
            [techniques[4], techniques[5]], [techniques[6]]
        ];

        rows.forEach((row) => {
            const skillRow = document.createElement('div');
            skillRow.className = 'skill-row';
            row.forEach((tech, techIndex) => {
                if (!tech) return;
                const techniqueIndex = techniques.indexOf(tech);
                const techProgress = this.state.getTechniqueProgress(tech.id);
                const isMastered = techProgress.mastered;
                const isUnlocked = this.state.isTechniqueUnlocked(techniqueIndex, techniques);
                const completedSteps = Object.values(techProgress.subSkills).flat().length;
                const totalSteps = tech.subSkills.length * 3;
                const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

                const card = document.createElement('div');
                card.className = `skill-card ${isMastered ? 'mastered' : ''} ${!isUnlocked ? 'locked' : ''}`;
                card.dataset.techniqueId = tech.id;
                card.innerHTML = `
                    <div class="flex items-center justify-between mb-4">
                        <div class="text-4xl">${tech.icon}</div>
                        ${isMastered ? '<span class="achievement-badge">متقن!</span>' : ''}
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2 english-font">${tech.name}</h3>
                    <p class="text-gray-600 mb-4">${tech.name_ar}</p>
                    <div class="progress-bar mb-2">
                        <div class="progress-fill bg-gradient-to-r ${tech.color}" style="width: ${progressPercentage}%"></div>
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
        this.showView('skills');
        this.updateHeader();
    }

    renderTechniqueView(techniqueId) {
        const { main_title, subskills_container } = this.elements;
        const tech = this.data.getTechnique(techniqueId);
        const techProgress = this.state.getTechniqueProgress(techniqueId);

        main_title.textContent = tech.name_ar;
        subskills_container.innerHTML = '';

        tech.subSkills.forEach(subSkill => {
            const subSkillProgress = techProgress.subSkills[subSkill.id] || [];
            const card = document.createElement('div');
            card.className = 'skill-card p-4';
            let buttonsHTML = '';
            if (subSkill.isDirectDrill) {
                const drillCompleted = subSkillProgress.includes('drill');
                buttonsHTML = `<div class="flex-grow flex items-center justify-end gap-2">
                        <button class="btn-primary step-button flex-grow ${drillCompleted ? 'opacity-50' : ''}" data-step="drill" data-subskill-id="${subSkill.id}" ${drillCompleted ? 'disabled' : ''}>🎯 ابدأ التمرين</button>
                        <button class="step-button ${subSkillProgress.includes('quiz') ? 'completed' : ''}" data-step="quiz" data-subskill-id="${subSkill.id}" ${!drillCompleted ? 'disabled' : ''}>🏆 اختبار</button>
                    </div>`;
            } else {
                buttonsHTML = `<div class="flex gap-2">
                        <button class="step-button ${subSkillProgress.includes('learn') ? 'completed' : ''}" data-step="learn" data-subskill-id="${subSkill.id}">📖 تعلم</button>
                        <button class="step-button ${subSkillProgress.includes('drill') ? 'completed' : ''}" data-step="drill" data-subskill-id="${subSkill.id}" ${!subSkillProgress.includes('learn') ? 'disabled' : ''}>🎯 تمرين</button>
                        <button class="step-button ${subSkillProgress.includes('quiz') ? 'completed' : ''}" data-step="quiz" data-subskill-id="${subSkill.id}" ${!subSkillProgress.includes('drill') ? 'disabled' : ''}>🏆 اختبار</button>
                    </div>`;
            }
            card.innerHTML = `
                <div class="flex items-center justify-between flex-wrap gap-y-4">
                    <div class="flex items-center gap-3"><span class="text-3xl">${subSkill.icon}</span><h3 class="text-xl font-bold text-gray-800">${subSkill.name}</h3></div>
                    ${buttonsHTML}
                </div>`;
            subskills_container.appendChild(card);
        });
        this.showView('technique');
    }

    showModal() { this.elements.activity_modal.classList.remove('hidden'); }
    hideModal() { this.elements.activity_modal.classList.add('hidden'); }

    showSuccessModal(message, reward) {
        this.elements.success_message.textContent = message;
        this.elements.success_reward.textContent = reward;
        this.elements.success_modal.classList.remove('hidden');
    }

    hideSuccessModal() { this.elements.success_modal.classList.add('hidden'); }

    showFeedback(isCorrect, container = this.elements.modal_feedback) {
        const message = isCorrect ? this.data.getRandomEncouragement() : "حاول مرة أخرى 💪";
        container.innerHTML = `<span class="${isCorrect ? 'text-green-500' : 'text-red-500'}">${message}</span>`;
        if (isCorrect) {
            this.effects.createQuickCelebration();
        } else {
            this.effects.playWrongSound();
        }
    }
}
