'use strict';

// Plays recorded audio when a file is listed in audio/manifest.json, otherwise text-to-speech.
// Voice choice: a good US-English voice, never one of the novelty voices some devices ship.
const NOVELTY_VOICES = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i;
const PREFERRED_VOICES = [
    /natural|neural/i,
    /google us english/i,
    /samantha|ava|allison|susan|zoe|nicky|joelle|evan|nathan|tom|alex/i,
    /aria|jenny|guy|zira|david|mark/i
];

export class AudioManager {
    constructor() {
        this.voice = null;
        this.voices = [];
        this.files = {};
        this.varietyIndex = 0;
        this.currentAudio = null;
        this.init();
    }

    init() {
        this.loadManifest();
        if (!('speechSynthesis' in window)) return;
        this.loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    async loadManifest() {
        try {
            const response = await fetch('audio/manifest.json');
            if (response.ok) this.files = await response.json();
        } catch {}
    }

    loadVoices() {
        const score = v => {
            let s = /^en[-_]US/i.test(v.lang) ? 100 : 0;
            PREFERRED_VOICES.forEach((re, i) => { if (re.test(v.name)) s += 50 - i * 10; });
            return s;
        };
        this.voices = window.speechSynthesis.getVoices()
            .filter(v => /^en/i.test(v.lang) && !NOVELTY_VOICES.test(v.name))
            .sort((a, b) => score(b) - score(a));
        this.voice = this.voices[0] || null;
    }

    hasEnglishVoice() {
        return Object.keys(this.files).length > 0 || this.voices.length > 0;
    }

    stop() {
        try { window.speechSynthesis?.cancel(); } catch {}
        if (this.currentAudio) { this.currentAudio.pause(); this.currentAudio = null; }
    }

    // options.variety: rotate between up to three US voices (listening practice with more than one speaker).
    speak(text, { variety = false, onend = null } = {}) {
        if (!text) return;
        this.stop();
        const file = this.files[String(text).toLowerCase()];
        if (file) {
            this.currentAudio = new Audio(`audio/${file}`);
            if (onend) this.currentAudio.onended = onend;
            this.currentAudio.play().catch(() => onend && onend());
            return;
        }
        try {
            if (!('speechSynthesis' in window)) { if (onend) onend(); return; }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            const voice = variety ? this.nextVarietyVoice() : this.voice;
            if (voice) utterance.voice = voice;
            if (onend) {
                // Some browsers never fire onend; fall back to a timer.
                let done = false;
                const finish = () => { if (!done) { done = true; onend(); } };
                utterance.onend = finish;
                setTimeout(finish, 900 + String(text).length * 90);
            }
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Speech synthesis error:', error);
        }
    }

    // Plays several words one after another (used to compare the chosen and the correct word).
    speakSequence(texts) {
        const list = texts.filter(Boolean);
        const next = i => { if (i < list.length) this.speak(list[i], { onend: () => setTimeout(() => next(i + 1), 350) }); };
        next(0);
    }

    nextVarietyVoice() {
        const us = this.voices.filter(v => /^en[-_]US/i.test(v.lang)).slice(0, 3);
        if (us.length < 2) return this.voice;
        this.varietyIndex = (this.varietyIndex + 1) % us.length;
        return us[this.varietyIndex];
    }
}
