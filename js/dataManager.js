'use strict';

// Holds the curriculum data once loaded.
let curriculumData = null;

// Loads curriculum data from the JSON file.
async function loadCurriculum() {
    if (curriculumData) return curriculumData; // Return cached data if available
    try {
        const response = await fetch('curriculum.json');
        curriculumData = await response.json();
        console.log('Curriculum loaded successfully!', curriculumData);
        return curriculumData;
    } catch (error) {
        console.error('Could not load curriculum:', error);
        curriculumData = {
            techniques: [],
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

    getSubSkill(techniqueId, subSkillId) {
        const technique = this.getTechnique(techniqueId);
        return technique ? technique.subSkills.find(s => s.id === subSkillId) : null;
    }

    getRandomEncouragement() {
        const messages = curriculumData?.encouragingMessages || ["أحسنت! 🌟"];
        return messages[Math.floor(Math.random() * messages.length)];
    }
}
