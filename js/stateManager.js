'use strict';

const PROGRESS_KEY = 'wordsProgressV2';
const RESPONSES_KEY = 'wordsResponsesV2';
const REVIEW_KEY = 'wordsReviewV2';
const SETTINGS_KEY = 'wordsSettingsV2';
const OLD_PROGRESS_KEY = 'phonicsProgressV1';
const MAX_RESPONSES = 3000;
// Days until an item comes back for review, by box (Leitner-style spacing).
const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
const DAY = 24 * 60 * 60 * 1000;

export class StateManager {
  constructor() {
    this.userProgress = {
      points: 0,
      streak: 0,
      lastActiveDate: null,
      techniques: {},
      scores: {},
      placementUnit: 0
    };
    this.currentTechniqueId = null;
    this.activitySession = {};
    this.sessionStartTime = null;
    this.migratedFromV1 = false;

    this.difficultySettings = { questionsPerSession: 10, passingScore: 0.8, autoAdvance: false };
    // NEW: global unlock flag (navigation only)
    this.unlockAll = false;

    this.responses = [];
    this.reviewDeck = {};

    this.loadProgress();
    this.loadDifficultySettings();
    this.loadUnlockAll(); // NEW
    this.responses = this._loadJson(RESPONSES_KEY, []);
    this.reviewDeck = this._loadJson(REVIEW_KEY, {});
  }

  // ------------ persistence ------------
  _loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  _saveJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        this.userProgress = { ...this.userProgress, ...JSON.parse(raw) };
      } else {
        // The course was restructured: keep points and streak from the old version, not unit progress.
        const old = localStorage.getItem(OLD_PROGRESS_KEY);
        if (old) {
          const o = JSON.parse(old);
          this.userProgress.points = o.points || 0;
          this.userProgress.streak = o.streak || 0;
          this.userProgress.lastActiveDate = o.lastActiveDate || null;
          this.migratedFromV1 = true;
        }
      }
      this._updateStreak();
    } catch {}
  }

  saveProgress() {
    this._saveJson(PROGRESS_KEY, this.userProgress);
  }

  isNewLearner() {
    return Object.keys(this.userProgress.techniques).length === 0 && !this.userProgress.placementDone;
  }

  loadDifficultySettings() {
    this.difficultySettings = { ...this.difficultySettings, ...this._loadJson(SETTINGS_KEY, {}) };
  }

  saveDifficultySettings() {
    this._saveJson(SETTINGS_KEY, this.difficultySettings);
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

  isStepComplete(techId, subSkillId, step) {
    return (this.getTechniqueProgress(techId).subSkills[subSkillId] || []).includes(step);
  }

  markStepComplete(techId, subSkillId, step) {
    const tech = this.getTechniqueProgress(techId);
    if (!tech.subSkills[subSkillId]) tech.subSkills[subSkillId] = [];
    if (!tech.subSkills[subSkillId].includes(step)) {
      tech.subSkills[subSkillId].push(step);
      this.saveProgress();
    }
    return tech;
  }

  // Keeps the latest drill score and the best quiz score (0–1, first attempts only).
  recordScore(subSkillId, step, score) {
    const s = this.userProgress.scores[subSkillId] || {};
    s[step] = step === 'quiz' ? Math.max(s.quiz || 0, score) : score;
    this.userProgress.scores[subSkillId] = s;
    this.saveProgress();
  }

  getScore(subSkillId, step) {
    return this.userProgress.scores[subSkillId]?.[step];
  }

  markTechniqueMastered(techId) {
    const tech = this.getTechniqueProgress(techId);
    tech.mastered = true;
    this.saveProgress();
  }

  isTechniqueUnlocked(techniqueIndex, techniques) {
    if (this.unlockAll) return true; // NEW: bypass gating
    if (techniqueIndex === 0) return true;
    if (techniqueIndex <= (this.userProgress.placementUnit || 0)) return true;
    const prevTechnique = techniques[techniqueIndex - 1];
    const prevProgress = this.getTechniqueProgress(prevTechnique.id);
    return prevProgress.mastered;
  }

  setPlacement(unitIndex) {
    this.userProgress.placementUnit = Math.max(this.userProgress.placementUnit || 0, unitIndex);
    this.userProgress.placementDone = true;
    this.saveProgress();
  }

  // Words from every lesson whose test has been passed (targets, built words and heart words).
  countWordsLearned(techniques) {
    const words = new Set();
    techniques.forEach(tech => tech.subSkills.forEach(sub => {
      if (!this.isStepComplete(tech.id, sub.id, 'quiz')) return;
      (sub.heartWords || []).forEach(w => words.add(w.toLowerCase()));
      [...sub.drill.questions, ...sub.quiz.questions].forEach(q => {
        const w = ['say', 'sort', 'build'].includes(q.type) ? q.word : (q.type === 'sentence' || q.type === 'odd' ? null : q.answer);
        if (w) words.add(String(w).toLowerCase());
      });
    }));
    return words.size;
  }

  // ------------ responses (first attempts) ------------
  logResponse(entry) {
    this.responses.push({ t: Date.now(), ...entry });
    if (this.responses.length > MAX_RESPONSES) this.responses.splice(0, this.responses.length - MAX_RESPONSES);
    this._saveJson(RESPONSES_KEY, this.responses);
  }

  // ------------ spaced review ------------
  addToReview(keys) {
    const now = Date.now();
    keys.forEach(key => {
      if (!this.reviewDeck[key]) this.reviewDeck[key] = { box: 0, due: now + REVIEW_INTERVALS[0] * DAY };
    });
    this._saveJson(REVIEW_KEY, this.reviewDeck);
  }

  updateReview(key, correct) {
    const item = this.reviewDeck[key];
    if (!item) return;
    item.box = correct ? Math.min(item.box + 1, REVIEW_INTERVALS.length - 1) : 0;
    item.due = Date.now() + REVIEW_INTERVALS[item.box] * DAY;
    this._saveJson(REVIEW_KEY, this.reviewDeck);
  }

  getDueReviewKeys(limit = 12) {
    const now = Date.now();
    return Object.entries(this.reviewDeck)
      .filter(([, v]) => v.due <= now)
      .sort((a, b) => a[1].due - b[1].due)
      .slice(0, limit)
      .map(([k]) => k);
  }

  // ------------ session ------------
  startSession() {
    this.sessionStartTime = Date.now();
    this._updateStreak();
  }
}
