'use strict';

// Plays the recorded clips listed in audio/manifest.json (made by tools/audio/generate.py), and falls
// back to the device's text-to-speech for anything without a clip.
// Clips play through Web Audio (fetch -> decode -> buffer source), which works on iPhone and Android
// once the audio context has been resumed inside a tap; every tap does that.
// Text-to-speech: a good US-English voice, never one of the novelty voices some devices ship.
const BASE = 'audio/';
const MAX_BUFFERS = 150; // decoded clips kept in memory
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
        this.clips = {};
        this.buffers = new Map(); // url -> AudioBuffer, oldest first
        this.ctx = null;
        this.sources = [];
        this.token = 0;
        this.varietyIndex = 0;
        this.init();
    }

    init() {
        try { if ('audioSession' in navigator) navigator.audioSession.type = 'playback'; } catch {}
        ['touchend', 'click', 'keydown'].forEach(ev =>
            document.addEventListener(ev, () => this.unlock(), { capture: true, passive: true }));
        this.loadManifest();
        if (!('speechSynthesis' in window)) return;
        this.loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    async loadManifest() {
        try {
            const response = await fetch(`${BASE}manifest.json`);
            if (response.ok) this.clips = (await response.json()).clips || {};
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
        return Object.keys(this.clips).length > 0 || this.voices.length > 0;
    }

    getContext() {
        if (!this.ctx || this.ctx.state === 'closed') {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            this.ctx = new AC();
        }
        return this.ctx;
    }

    // Called on every tap: browsers only start audio from inside a user gesture.
    unlock() {
        const ctx = this.getContext();
        if (ctx && ctx.state !== 'running') ctx.resume?.().catch(() => {});
    }

    // Path of the recorded clip for this text, or null. variety: alternate between the recorded voices.
    clipUrl(text, variety = false) {
        const entry = this.clips[String(text).toLowerCase()];
        if (!entry) return null;
        const voices = Object.keys(entry).sort();
        const voice = variety && voices.length > 1 ? voices[this.varietyIndex++ % voices.length] : (entry.f ? 'f' : voices[0]);
        return BASE + entry[voice];
    }

    async loadBuffer(url) {
        if (this.buffers.has(url)) {
            const hit = this.buffers.get(url);
            this.buffers.delete(url);
            this.buffers.set(url, hit);
            return hit;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error(`audio ${response.status}`);
        const data = await response.arrayBuffer();
        const buffer = await new Promise((resolve, reject) => {
            // Older Safari only has the callback form.
            const p = this.ctx.decodeAudioData(data, resolve, reject);
            if (p && p.then) p.then(resolve, reject);
        });
        this.buffers.set(url, buffer);
        if (this.buffers.size > MAX_BUFFERS) this.buffers.delete(this.buffers.keys().next().value);
        return buffer;
    }

    stop() {
        this.token++;
        this.sources.forEach(s => { try { s.onended = null; s.stop(); } catch {} });
        this.sources = [];
        try { window.speechSynthesis?.cancel(); } catch {}
    }

    // options.variety: use more than one speaker (listening practice).
    speak(text, { variety = false, onend = null } = {}) {
        if (!text) return;
        this.stop();
        const token = this.token;
        const url = this.clipUrl(text, variety);
        const ctx = url ? this.getContext() : null;
        if (!ctx) { this.speakTTS(text, { variety, onend }); return; }
        this.unlock();
        this.loadBuffer(url).then(buffer => {
            if (token !== this.token) return; // something else was played meanwhile
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                this.sources = this.sources.filter(s => s !== source);
                if (onend && token === this.token) onend();
            };
            source.onended = finish;
            // If the context is still suspended, onended never fires; don't let a sequence stall.
            setTimeout(finish, buffer.duration * 1000 + 600);
            this.sources.push(source);
            source.start();
        }).catch(() => {
            if (token === this.token) this.speakTTS(text, { variety, onend });
        });
    }

    speakTTS(text, { variety = false, onend = null } = {}) {
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
