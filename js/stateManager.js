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
      },
      freeAccess: false // NEW: open-all mode
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

  startSession() { this.sessionStartTime = Date.now(); }

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
      this.userProgress.analytics.dailyActivity[today] = { timeSpent: 0, sessionsCompleted: 0, accuracy: [] };
    }
    const day = this.userProgress.analytics.dailyActivity[today];
    day.timeSpent += sessionTime;
    day.sessionsCompleted++;

    if (total > 0) {
      const accuracy = correct / total;
      day.accuracy.push(accuracy);
      this.updateAccuracyAnalytics(techniqueId, accuracy);
    }

    this.userProgress.analytics.sessionsCompleted++;
    this.sessionStartTime = null;
    this.saveProgress();
  }

  updateAccuracyAnalytics(techniqueId, accuracy) {
    const totalAccs = Object.values(this.userProgress.analytics.dailyActivity).flatMap(d => d.accuracy);
    this.userProgress.analytics.averageAccuracy = totalAccs.length ? (totalAccs.reduce((a,b)=>a+b,0)/totalAccs.length) : 0;

    const techniqueAccs = {};
    Object.values(this.userProgress.analytics.dailyActivity).forEach(day => {
      day.accuracy.forEach(acc => {
        if (!techniqueAccs[techniqueId]) techniqueAccs[techniqueId] = [];
        techniqueAccs[techniqueId].push(acc);
      });
    });

    this.userProgress.analytics.weakAreas = Object.entries(techniqueAccs)
      .filter(([_, accs]) => accs.length && (accs.reduce((a,b)=>a+b,0)/accs.length) < 0.7)
      .map(([id]) => id);

    this.userProgress.analytics.strongAreas = Object.entries(techniqueAccs)
      .filter(([_, accs]) => accs.length && (accs.reduce((a,b)=>a+b,0)/accs.length) > 0.9)
      .map(([id]) => id);
  }

  saveDifficultySettings() {
    try { localStorage.setItem('phonicsDifficultySettings', JSON.stringify(this.difficultySettings)); }
    catch(e){ console.error('Failed to save difficulty settings:', e); }
  }

  loadDifficultySettings() {
    try {
      const saved = localStorage.getItem('phonicsDifficultySettings');
      if (saved) this.difficultySettings = { ...this.difficultySettings, ...JSON.parse(saved) };
    } catch(e){ console.error('Failed to load difficulty settings:', e); }
  }

  updateDifficultySetting(key, value) { this.difficultySettings[key] = value; this.saveDifficultySettings(); }

  saveProgress() {
    try { localStorage.setItem('modernPhonicsProgress', JSON.stringify(this.userProgress)); }
    catch(e){ console.error('Failed to save progress:', e); }
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem('modernPhonicsProgress');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.userProgress = { ...this.userProgress, ...parsed };
        if (typeof this.userProgress.freeAccess === 'undefined') this.userProgress.freeAccess = false;
        if (!this.userProgress.analytics) {
          this.userProgress.analytics = { totalTimeSpent:0, sessionsCompleted:0, averageAccuracy:0, timeByTechnique:{}, dailyActivity:{}, weakAreas:[], strongAreas:[] };
        }
      }
      this.updateStreak();
    } catch(e){ console.error('Failed to load progress:', e); }
  }

  updateStreak() {
    const today = new Date().toDateString();
    const last = this.userProgress.lastVisit;
    if (!last) this.userProgress.streak = 1;
    else if (last !== today) {
      const yest = new Date(Date.now() - 86400000).toDateString();
      this.userProgress.streak = (last === yest) ? this.userProgress.streak + 1 : 1;
    }
    this.userProgress.lastVisit = today;
    this.saveProgress();
  }

  addPoints(points) { this.userProgress.points += points; this.saveProgress(); }

  getTechniqueProgress(techniqueId) {
    if (!this.userProgress.techniques[techniqueId]) {
      this.userProgress.techniques[techniqueId] = { id: techniqueId, mastered: false, subSkills: {} };
    }
    return this.userProgress.techniques[techniqueId];
  }

  markStepComplete(techniqueId, subSkillId, step) {
    const tech = this.getTechniqueProgress(techniqueId);
    if (!tech.subSkills[subSkillId]) tech.subSkills[subSkillId] = [];
    if (!tech.subSkills[subSkillId].includes(step)) {
      tech.subSkills[subSkillId].push(step);
      this.addPoints(10);
      this.saveProgress();
    }
    return tech;
  }

  markTechniqueMastered(techniqueId) {
    const tech = this.getTechniqueProgress(techniqueId);
    tech.mastered = true;
    this.addPoints(50);
    this.saveProgress();
  }

  /** Unlock logic — respects Free Access mode */
  isTechniqueUnlocked(techniqueIndex, techniques) {
    if (this.userProgress.freeAccess) return true;
    if (techniqueIndex === 0) return true;
    const prevTechnique = techniques[techniqueIndex - 1];
    const prevProgress = this.getTechniqueProgress(prevTechnique.id);
    return !!prevProgress.mastered;
  }

  generateProgressReport() {
    const a = this.userProgress.analytics;
    // ✅ FIXED: 3,600,000 ms per hour (not 360,000)
    const totalHours = Math.round((a.totalTimeSpent / (1000 * 60 * 60)) * 10) / 10;
    const avgAccuracy = Math.round((a.averageAccuracy || 0) * 100);
    return {
      totalTimeSpent: totalHours,
      sessionsCompleted: a.sessionsCompleted,
      averageAccuracy: avgAccuracy,
      currentStreak: this.userProgress.streak,
      totalPoints: this.userProgress.points,
      weakAreas: a.weakAreas,
      strongAreas: a.strongAreas,
      techniqueProgress: Object.keys(this.userProgress.techniques).map(id => ({
        id,
        name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        mastered: this.userProgress.techniques[id].mastered,
        timeSpent: Math.round((a.timeByTechnique[id] || 0) / 60000),
        completedSteps: Object.values(this.userProgress.techniques[id].subSkills).flat().length
      }))
    };
  }

  /** 🔓 Enable free access (open all modules without faking mastery) */
  enableFreeAccess() {
    this.userProgress.freeAccess = true;
    this.saveProgress();
  }

  /** 🔒 Disable free access if needed */
  disableFreeAccess() {
    this.userProgress.freeAccess = false;
    this.saveProgress();
  }
}
