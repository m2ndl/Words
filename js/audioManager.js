'use strict';

// Manages Text-to-Speech (TTS) functionality.
export class AudioManager {
    constructor() {
        this.voice = null;
        this.init();
    }

    init() {
        if (!('speechSynthesis' in window)) return;
        this.loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        this.voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                     voices.find(v => v.lang.startsWith('en-US')) ||
                     voices.find(v => v.lang.startsWith('en'));
    }

    speak(text) {
        try {
            if (!('speechSynthesis' in window) || !text) return;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            if (this.voice) utterance.voice = this.voice;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Speech synthesis error:', error);
        }
    }
}
