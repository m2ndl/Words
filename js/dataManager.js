'use strict';

// Holds the curriculum data once loaded.
let curriculumData = null;

// VERSION: Update this whenever you change curriculum.json
const CURRICULUM_VERSION = '2.0.0'; // Change this to force refresh

// Loads curriculum data from the JSON file. Throws when it cannot be loaded, so the start screen can offer a retry.
async function loadCurriculum() {
    if (curriculumData) return curriculumData; // Return cached data if available
    // Add cache-busting parameter to URL
    const response = await fetch(`curriculum.json?v=${CURRICULUM_VERSION}`);
    if (!response.ok) throw new Error(`curriculum.json: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.techniques) || !data.techniques.length) throw new Error('curriculum.json: no units');
    curriculumData = data;
    console.log('Curriculum loaded successfully!', curriculumData.version);
    return curriculumData;
}

// Provides methods to access curriculum data.
export class DataManager {
    constructor() {
        this.isLoaded = false;
    }

    // Resolves true once the course is loaded, false if it could not be (call again to retry).
    async init() {
        try {
            await loadCurriculum();
            this.isLoaded = true;
        } catch (error) {
            console.error('Could not load curriculum:', error);
            this.isLoaded = false;
        }
        return this.isLoaded;
    }

    getTechniques() {
        return curriculumData?.techniques || [];
    }

    getTechnique(id) {
        return this.getTechniques().find(t => t.id === id);
    }

    getTechniqueIndex(id) {
        return this.getTechniques().findIndex(t => t.id === id);
    }

    getSubSkill(techniqueId, subSkillId) {
        const technique = this.getTechnique(techniqueId);
        return technique ? technique.subSkills.find(s => s.id === subSkillId) : null;
    }

    // Finds a quiz/drill question by its id ("<subSkillId>-q3").
    findQuestion(techniqueId, subSkillId, questionId) {
        const sub = this.getSubSkill(techniqueId, subSkillId);
        if (!sub) return null;
        return [...sub.quiz.questions, ...sub.drill.questions].find(q => q.id === questionId) || null;
    }

    // Arabic meaning of an English word ('' when unknown).
    getGloss(word) {
        if (!word) return '';
        return curriculumData?.glossary?.[String(word).toLowerCase()] || '';
    }

    getRandomEncouragement() {
        const messages = curriculumData?.encouragingMessages || ["أحسنت! 🌟"];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    // The unit's keyword picture (shipped with the app; see img/units/README.md).
    unitPicture(tech) {
        return `img/units/${tech.id}.svg`;
    }

    // Every English text a unit can play: Learn words, examples, heart words, and the words and sentences in its items.
    wordsForUnit(tech) {
        const texts = new Set();
        const add = t => { if (typeof t === 'string' && t) texts.add(t.toLowerCase()); };
        add(tech.keyword);
        tech.subSkills.forEach(sub => {
            for (const m of (sub.learn_info || '').matchAll(/\{([^{}]+)\}/g)) m[1].split(/[>≠]/).forEach(w => add(w.trim()));
            (sub.examples || []).forEach(ex => { add(ex.before); add(ex.after); });
            (sub.heartWords || []).forEach(add);
            [...sub.drill.questions, ...sub.quiz.questions].forEach(q => {
                if (q.type === 'sentence') { add(q.text); return; }
                [q.word, q.answer, q.audio, ...(q.options || [])].forEach(add);
            });
        });
        return [...texts];
    }
}
