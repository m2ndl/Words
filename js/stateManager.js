'use strict';

const PROGRESS_KEY = 'wordsProgressV2';
const RESPONSES_KEY = 'wordsResponsesV2';
const REVIEW_KEY = 'wordsReviewV2';
const SETTINGS_KEY = 'wordsSettingsV2';
const HINTS_KEY = 'wordsHintsV2';
const UNLOCK_KEY = 'phonicsUnlockAll';
const THEME_KEY = 'phonics-theme';
const OLD_PROGRESS_KEY = 'phonicsProgressV1';
const MAX_RESPONSES = 3000;
// Days until an item comes back for review, by box (Leitner-style spacing).
const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
const DAY = 24 * 60 * 60 * 1000;
const STEPS = ['learn', 'drill', 'quiz'];
// Progress files ("save a copy of your progress") carry this tag and format number.
const EXPORT_APP = 'words';
const EXPORT_FORMAT = 1;

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
    // Opens every unit (navigation only), e.g. after moving to a new device.
    this.unlockAll = false;

    this.responses = [];
    this.reviewDeck = {};
    this.hints = {};

    this.loadProgress();
    this.loadDifficultySettings();
    this.loadUnlockAll();
    this.responses = this._loadJson(RESPONSES_KEY, []);
    this.reviewDeck = this._loadJson(REVIEW_KEY, {});
    this.hints = this._loadJson(HINTS_KEY, {});
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

  // Nothing done yet: the start screen offers "start" and "placement".
  isNewLearner() {
    const p = this.userProgress;
    const anyStep = Object.values(p.techniques || {}).some(t => Object.values(t.subSkills || {}).some(s => s.length));
    return !p.started && !p.placementDone && !anyStep && !this.migratedFromV1;
  }

  markStarted() {
    if (this.userProgress.started) return;
    this.userProgress.started = true;
    this.saveProgress();
  }

  // Shown once to learners who used the old version of the course.
  showUpdateNotice() {
    return this.migratedFromV1 && !this.userProgress.placementDone && !this.userProgress.noticeDismissed;
  }

  dismissUpdateNotice() {
    this.userProgress.noticeDismissed = true;
    this.saveProgress();
  }

  setLastLesson(techId, subId) {
    this.userProgress.lastLesson = { tech: techId, sub: subId };
    this.saveProgress();
  }

  loadDifficultySettings() {
    this.difficultySettings = { ...this.difficultySettings, ...this._loadJson(SETTINGS_KEY, {}) };
  }

  saveDifficultySettings() {
    this._saveJson(SETTINGS_KEY, this.difficultySettings);
  }

  loadUnlockAll() {
    try {
      const saved = localStorage.getItem(UNLOCK_KEY);
      this.unlockAll = saved ? JSON.parse(saved) : false;
    } catch {}
  }
  saveUnlockAll() {
    try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(this.unlockAll)); } catch {}
  }
  setUnlockAll(value) { this.unlockAll = !!value; this.saveUnlockAll(); }
  toggleUnlockAll() { this.setUnlockAll(!this.unlockAll); }

  // Small "show this hint the first few times" counters.
  hintCount(name) { return this.hints[name] || 0; }
  bumpHint(name) {
    this.hints[name] = this.hintCount(name) + 1;
    this._saveJson(HINTS_KEY, this.hints);
  }

  // ------------ streak ------------
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
    if (this.unlockAll) return true;
    if (techniqueIndex === 0) return true;
    if (techniqueIndex <= (this.userProgress.placementUnit || 0)) return true;
    const prevTechnique = techniques[techniqueIndex - 1];
    const prevProgress = this.getTechniqueProgress(prevTechnique.id);
    return prevProgress.mastered;
  }

  // Units the learner can test out of: opened by "unlock all", or before the unit placement suggested.
  isUnitFree(techniqueIndex) {
    return this.unlockAll || techniqueIndex < (this.userProgress.placementUnit || 0);
  }

  // Learn is always open; practice after Learn, the test after practice (any step in a free unit).
  isStepAvailable(techniqueIndex, techniques, subSkillId, step) {
    if (!this.isTechniqueUnlocked(techniqueIndex, techniques)) return false;
    if (step === 'learn' || this.isUnitFree(techniqueIndex)) return true;
    const techId = techniques[techniqueIndex].id;
    return this.isStepComplete(techId, subSkillId, step === 'drill' ? 'learn' : 'drill');
  }

  // First step of a lesson that is not done yet (undefined when the lesson is complete).
  firstOpenStep(techId, subSkillId) {
    return STEPS.find(step => !this.isStepComplete(techId, subSkillId, step));
  }

  // The step to suggest next: the rest of the last lesson, then the rest of its unit,
  // then the open units after it, then anything left before it. null when everything is done.
  nextStep(techniques) {
    const found = (index, sub) => {
      const tech = techniques[index];
      const step = this.firstOpenStep(tech.id, sub.id);
      return step ? { tech, sub, step, index } : null;
    };
    const inUnit = index => {
      for (const sub of techniques[index].subSkills) {
        const hit = found(index, sub);
        if (hit) return hit;
      }
      return null;
    };
    let start = Math.min(this.userProgress.placementUnit || 0, techniques.length - 1);
    const last = this.userProgress.lastLesson;
    const lastIndex = last ? techniques.findIndex(t => t.id === last.tech) : -1;
    if (lastIndex !== -1) {
      const sub = techniques[lastIndex].subSkills.find(s => s.id === last.sub);
      const hit = sub && this.isTechniqueUnlocked(lastIndex, techniques) && found(lastIndex, sub);
      if (hit) return hit;
      start = lastIndex;
    }
    for (let i = start; i < techniques.length; i++) {
      if (!this.isTechniqueUnlocked(i, techniques)) break;
      const hit = inUnit(i);
      if (hit) return hit;
    }
    for (let i = 0; i < start; i++) {
      if (!this.isTechniqueUnlocked(i, techniques)) break;
      const hit = inUnit(i);
      if (hit) return hit;
    }
    return null;
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

  // ------------ moving progress to another device ------------
  exportData() {
    let theme = null;
    try { theme = localStorage.getItem(THEME_KEY); } catch {}
    return {
      app: EXPORT_APP,
      format: EXPORT_FORMAT,
      exported: new Date().toISOString(),
      progress: this.userProgress,
      review: this.reviewDeck,
      responses: this.responses,
      settings: this.difficultySettings,
      unlockAll: this.unlockAll,
      theme
    };
  }

  // Replaces the saved progress with a file made by exportData(). Returns false if the file is not one.
  importData(data) {
    if (!data || data.app !== EXPORT_APP || typeof data.progress !== 'object' || typeof data.progress.techniques !== 'object') return false;
    this._saveJson(PROGRESS_KEY, data.progress);
    this._saveJson(REVIEW_KEY, data.review && typeof data.review === 'object' ? data.review : {});
    this._saveJson(RESPONSES_KEY, Array.isArray(data.responses) ? data.responses.slice(-MAX_RESPONSES) : []);
    if (data.settings && typeof data.settings === 'object') this._saveJson(SETTINGS_KEY, data.settings);
    this._saveJson(UNLOCK_KEY, !!data.unlockAll);
    try { if (typeof data.theme === 'string') localStorage.setItem(THEME_KEY, data.theme); } catch {}
    return true;
  }
}
