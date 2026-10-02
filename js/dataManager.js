'use strict';

// Holds the curriculum data once loaded.
let curriculumData = null;

// VERSION: Update this whenever you change curriculum.json
const CURRICULUM_VERSION = '2.0.0'; // Change this to force refresh

// Loads curriculum data from the JSON file.
async function loadCurriculum() {
    if (curriculumData) return curriculumData; // Return cached data if available
    try {
        // Add cache-busting parameter to URL
        const response = await fetch(`curriculum.json?v=${CURRICULUM_VERSION}`);
        curriculumData = await response.json();
        console.log('Curriculum loaded successfully!', curriculumData.version);
        return curriculumData;
    } catch (error) {
        console.error('Could not load curriculum:', error);
        curriculumData = {
            techniques: [],
            glossary: {},
            encouragingMessages: ["أحسنت! 🌟", "رائع! 🎉", "ممتاز! 👍"]
        };
        return curriculumData;
    }
}

// Provides methods to access curriculum data.
export class DataManager {
    constructor() {
        this.isLoaded = false;
    }

    async init() {
        if (!curriculumData) {
            await loadCurriculum();
        }
        this.isLoaded = true;
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
}
