'use strict';

/**
 * DataManager
 * - Loads curriculum.json (anchored to this module’s location)
 * - Exposes helpers to read techniques/subskills/messages
 */

// Cached curriculum once loaded
let curriculumData = null;

// Fallback if loading fails (keeps app usable)
const FALLBACK_CURRICULUM = {
  techniques: [],
  encouragingMessages: ["أحسنت! 🌟", "رائع! 🎉", "ممتاز! 👍"]
};

// Load curriculum.json (resolves ../curriculum.json relative to /js/)
async function loadCurriculum() {
  if (curriculumData) return curriculumData; // return cache

  try {
    // Always resolve from this file's URL (handles GitHub Pages paths)
    const url = new URL('../curriculum.json', import.meta.url);
    const res = await fetch(url.href);
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url.href}`);

    curriculumData = await res.json();
    console.log('Curriculum loaded successfully!', curriculumData);
    return curriculumData;
  } catch (error) {
    console.error('Could not load curriculum.json. Using fallback.', error);
    curriculumData = FALLBACK_CURRICULUM;
    return curriculumData;
  }
}

// Public API
export class DataManager {
  constructor() {
    this.isLoaded = false;
  }

  // Call once on startup (await it!)
  async init() {
    await loadCurriculum();
    this.isLoaded = true;
  }

  getTechniques() {
    return Array.isArray(curriculumData?.techniques) ? curriculumData.techniques : [];
  }

  getTechnique(id) {
    return this.getTechniques().find(t => t.id === id);
  }

  getSubSkill(techniqueId, subSkillId) {
    const technique = this.getTechnique(techniqueId);
    if (!technique || !Array.isArray(technique.subSkills)) return null;
    return technique.subSkills.find(s => s.id === subSkillId) || null;
  }

  getRandomEncouragement() {
    const msgs = Array.isArray(curriculumData?.encouragingMessages)
      ? curriculumData.encouragingMessages
      : ["أحسنت! 🌟"];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
}
