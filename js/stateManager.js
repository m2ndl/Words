export class StateManager {
    constructor() {
        this.progress = this.loadProgress() || {
            skills: {},
            points: 0,
            streak: 0
        };
    }

    saveProgress() {
        localStorage.setItem('phonicsProgress', JSON.stringify(this.progress));
    }

    loadProgress() {
        const saved = localStorage.getItem('phonicsProgress');
        return saved ? JSON.parse(saved) : null;
    }

    updateSkill(skillId, data) {
        this.progress.skills[skillId] = {
            ...this.progress.skills[skillId],
            ...data
        };
        this.saveProgress();
    }

    getSkill(skillId) {
        return this.progress.skills[skillId] || {};
    }

    addPoints(amount) {
        this.progress.points += amount;
        this.saveProgress();
    }

    updateStreak(count) {
        this.progress.streak = count;
        this.saveProgress();
    }

    // 🔓 Unlock all modules
    unlockAllModules() {
        if (this.progress.skills) {
            for (const skill of Object.values(this.progress.skills)) {
                skill.unlocked = true;
            }
            this.saveProgress();
        }
    }
}
