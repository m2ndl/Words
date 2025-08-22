'use strict';

// Manages user progress, analytics, and settings.
export class StateManager {
    constructor() {
        this.userProgress = {
            points: 0,
            streak: 0,
            lastVisit: null,
            techniques: {},
            analytics: {
                totalTimeSpent: 0,
                sessionsCompleted: 0,
                averageAccuracy: 0,
                timeByTechnique: {},
                dailyActivity: {},
                weakAreas: [],
                strongAreas: []
            }
        };
        this.currentTechniqueId = null;
        this.activitySession = {};
        this.sessionStartTime = null;
        this.difficultySettings = {
            questionsPerSession: 5,
            passingScore: 0.8,
            enableHints: true,
            autoAdvance: true
        };
        this.loadProgress();
        this.loadDifficultySettings();
    }

    startSession() {
        this.sessionStartTime = Date.now();
    }

    endSession(techniqueId, correct, total) {
        if (!this.sessionStartTime) return;
        
        const sessionTime = Date.now() - this.sessionStartTime;
        const today = new Date().toDateString();
        
        this.userProgress.analytics.totalTimeSpent += sessionTime;
        
        if (!this.userProgress.analytics.timeByTechnique[techniqueId]) {
            this.userProgress.analytics.timeByTechnique[techniqueId] = 0;
        }
        this.userProgress.analytics.timeByTechnique[techniqueId] += sessionTime;
        
        if (!this.userProgress.analytics.dailyActivity[today]) {
            this.userProgress.analytics.dailyActivity[today] = {
                timeSpent: 0,
                sessionsCompleted: 0,
                accuracy: []
            };
        }
        this.userProgress.analytics.dailyActivity[today].timeSpent += sessionTime;
        this.userProgress.analytics.dailyActivity[today].sessionsCompleted++;
        
        if (total > 0) {
            const accuracy = correct / total;
            this.userProgress.analytics.dailyActivity[today].accuracy.push(accuracy);
            this.updateAccuracyAnalytics(techniqueId, accuracy);
        }
        
        this.userProgress.analytics.sessionsCompleted++;
        this.sessionStartTime = null;
        this.saveProgress();
    }

    updateAccuracyAnalytics(techniqueId, accuracy) {
        const totalAccuracies = Object.values(this.userProgress.analytics.dailyActivity)
            .flatMap(day => day.accuracy);
        this.userProgress.analytics.averageAccuracy = 
            totalAccuracies.reduce((sum, acc) => sum + acc, 0) / totalAccuracies.length;
        
        const techniqueAccuracies = {};
        Object.values(this.userProgress.analytics.dailyActivity).forEach(day => {
            day.accuracy.forEach(acc => {
                if (!techniqueAccuracies[techniqueId]) techniqueAccuracies[techniqueId] = [];
                techniqueAccuracies[techniqueId].push(acc);
            });
        });
        
        this.userProgress.analytics.weakAreas = Object.entries(techniqueAccuracies)
            .filter(([_, accs]) => accs.reduce((sum, acc) => sum + acc, 0) / accs.length < 0.7)
            .map(([id, _]) => id);
            
        this.userProgress.analytics.strongAreas = Object.entries(techniqueAccuracies)
            .filter(([_, accs]) => accs.reduce((sum, acc) => sum + acc, 0) / accs.length > 0.9)
            .map(([id, _]) => id);
    }

    saveDifficultySettings() {
        try {
            localStorage.setItem('phonicsDifficultySettings', JSON.stringify(this.difficultySettings));
        } catch (error) {
            console.error('Failed to save difficulty settings:', error);
        }
    }

    loadDifficultySettings() {
        try {
            const saved = localStorage.getItem('phonicsDifficultySettings');
            if (saved) {
                this.difficultySettings = { ...this.difficultySettings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load difficulty settings:', error);
        }
    }

    updateDifficultySetting(key, value) {
        this.difficultySettings[key] = value;
        this.saveDifficultySettings();
    }

    saveProgress() {
        try {
            localStorage.setItem('modernPhonicsProgress', JSON.stringify(this.userProgress));
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('modernPhonicsProgress');
            if (saved) {
                this.userProgress = { ...this.userProgress, ...JSON.parse(saved) };
                if (!this.userProgress.analytics) {
                    this.userProgress.analytics = {
                        totalTimeSpent: 0, sessionsCompleted: 0, averageAccuracy: 0,
                        timeByTechnique: {}, dailyActivity: {}, weakAreas: [], strongAreas: []
                    };
                }
            }
            this.updateStreak();
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastVisit = this.userProgress.lastVisit;
        if (!lastVisit) {
            this.userProgress.streak = 1;
        } else if (lastVisit !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            this.userProgress.streak = (lastVisit === yesterday) ? this.userProgress.streak + 1 : 1;
        }
        this.userProgress.lastVisit = today;
        this.saveProgress();
    }

    addPoints(points) {
        this.userProgress.points += points;
        this.saveProgress();
    }

    getTechniqueProgress(techniqueId) {
        if (!this.userProgress.techniques[techniqueId]) {
            this.userProgress.techniques[techniqueId] = {
                id: techniqueId,
                mastered: false,
                subSkills: {}
            };
        }
        return this.userProgress.techniques[techniqueId];
    }

    markStepComplete(techniqueId, subSkillId, step) {
        const techProgress = this.getTechniqueProgress(techniqueId);
        if (!techProgress.subSkills[subSkillId]) {
            techProgress.subSkills[subSkillId] = [];
        }
        if (!techProgress.subSkills[subSkillId].includes(step)) {
            techProgress.subSkills[subSkillId].push(step);
            this.addPoints(10);
            this.saveProgress();
        }
        return techProgress;
    }

    markTechniqueMastered(techniqueId) {
        const techProgress = this.getTechniqueProgress(techniqueId);
        techProgress.mastered = true;
        this.addPoints(50);
        this.saveProgress();
    }

    isTechniqueUnlocked(techniqueIndex, techniques) {
        if (techniqueIndex === 0) return true;
        const prevTechnique = techniques[techniqueIndex - 1];
        const prevProgress = this.getTechniqueProgress(prevTechnique.id);
        return prevProgress.mastered;
    }

    generateProgressReport() {
        const analytics = this.userProgress.analytics;
        const totalHours = Math.round(analytics.totalTimeSpent / (1000 * 60 * 60) * 10) / 10;
        const avgAccuracy = Math.round(analytics.averageAccuracy * 100);
        return {
            totalTimeSpent: totalHours,
            sessionsCompleted: analytics.sessionsCompleted,
            averageAccuracy: avgAccuracy,
            currentStreak: this.userProgress.streak,
            totalPoints: this.userProgress.points,
            weakAreas: analytics.weakAreas,
            strongAreas: analytics.strongAreas,
            techniqueProgress: Object.keys(this.userProgress.techniques).map(id => ({
                id,
                name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                mastered: this.userProgress.techniques[id].mastered,
                timeSpent: Math.round((analytics.timeByTechnique[id] || 0) / (1000 * 60)),
                completedSteps: Object.values(this.userProgress.techniques[id].subSkills).flat().length
            }))
        };
    }
}
