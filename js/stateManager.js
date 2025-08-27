'use strict';

export class StateManager {
  constructor() {
    this.userProgress = {
      points: 0,
      streak: 0,
      lastActiveDate: null,
      techniques: {}
    };
    this.currentTechniqueId = null;
    this.activitySession = {};
    this.sessionStartTime = null;

    this.difficultySettings = { questionsPerSession: 5, passingScore: 0.8, enableHints: true, autoAdvance: false };
    // NEW: global unlock flag (navigation only)
    this.unlockAll = false;

    this.loadProgress();
    this.loadDifficultySettings();
    this.loadUnlockAll(); // NEW
  }

  // ------------ persistence ------------
  loadProgress() {
    try {
      const raw = localStorage.getItem('phonicsProgressV1');
      if (raw) this.userProgress = JSON.parse(raw);
      this._updateStreak();
    } catch {}
  }

  saveProgress() {
    try { localStorage.setItem('phonicsProgressV1', JSON.stringify(this.userProgress)); } catch {}
  }

  loadDifficultySettings() {
    try {
      const raw = localStorage.getItem('phonicsDifficultyV1');
      if (raw) this.difficultySettings = { ...this.difficultySettings, ...JSON.parse(raw) };
    } catch {}
  }

  saveDifficultySettings() {
    try { localStorage.setItem('phonicsDifficultyV1', JSON.stringify(this.difficultySettings)); } catch {}
  }

  // --- NEW: unlock-all persistence ---
  loadUnlockAll() {
    try {
      const saved = localStorage.getItem('phonicsUnlockAll');
      this.unlockAll = saved ? JSON.parse(saved) : false;
    } catch {}
  }
  saveUnlockAll() {
    try { localStorage.setItem('phonicsUnlockAll', JSON.stringify(this.unlockAll)); } catch {}
  }
  setUnlockAll(value) { this.unlockAll = !!value; this.saveUnlockAll(); }
  toggleUnlockAll() { this.setUnlockAll(!this.unlockAll); }

  // ------------ streak / points ------------
  _todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  _updateStreak() {
    const today = this._todayKey();
    if (this.userProgress.lastActiveDate !== today) {
      // if yesterday, continue streak; else reset to 1
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
      if (this.userProgress.lastActiveDate === yKey) {
        this.userProgress.streak = (this.userProgress.streak || 0) + 1;
      } else {
        this.userProgress.streak = 1;
      }
      this.userProgress.lastActiveDate = today;
      this.saveProgress();
    }
  }

  addPoints(pts) {
    this.userProgress.points += pts;
    this.saveProgress();
  }

  // ------------ techniques & steps ------------
  getTechniqueProgress(techId) {
    if (!this.userProgress.techniques[techId]) {
      this.userProgress.techniques[techId] = { mastered: false, subSkills: {} };
    }
    return this.userProgress.techniques[techId];
  }

  markStepComplete(techId, subSkillId, step) {
    const tech = this.getTechniqueProgress(techId);
    if (!tech.subSkills[subSkillId]) tech.subSkills[subSkillId] = [];
    if (!tech.subSkills[subSkillId].includes(step)) {
      tech.subSkills[subSkillId].push(step);
      this.addPoints(step === 'quiz' ? 10 : 5);
      this.saveProgress();
    }
    return tech;
  }

  markTechniqueMastered(techId) {
    const tech = this.getTechniqueProgress(techId);
    tech.mastered = true;
    this.addPoints(50);
    this.saveProgress();
  }

  isTechniqueUnlocked(techniqueIndex, techniques) {
    if (this.unlockAll) return true; // NEW: bypass gating
    if (techniqueIndex === 0) return true;
    const prevTechnique = techniques[techniqueIndex - 1];
    const prevProgress = this.getTechniqueProgress(prevTechnique.id);
    return prevProgress.mastered;
  }

  // ------------ session ------------
  startSession() {
    this.sessionStartTime = Date.now();
    this._updateStreak();
  }

  endSession(techniqueId, correctAnswers, total) {
    const gained = Math.max(0, correctAnswers * 2);
    this.addPoints(gained);
    this.saveProgress();
  }
}
