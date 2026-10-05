'use strict';

// Plays the recorded clips listed in audio/manifest.json (made by tools/audio/generate.py), and falls
// back to the device's text-to-speech for anything without a clip.
// Clips play through Web Audio (fetch -> decode -> buffer source), which works on iPhone and Android
// once the audio context has been resumed inside a tap; every tap does that.
// Text-to-speech: a good US-English voice, never one of the novelty voices some devices ship.
// The button that asked for a sound shows it: "is-loading" while the clip downloads, "is-playing" while it plays.
const BASE = 'audio/';
const MAX_BUFFERS = 150; // decoded clips kept in memory
const SOUND_GAP = 0.3;    // sound it out: silence between the sounds (s)
const WORD_PAUSE = 0.45;  // …and before the whole word
const PREFETCH_WORKERS = 3;
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
        this.sounds = {};   // single speech sounds, for sounding words out
        this.segments = {}; // word -> [[letters, sound], ...]
        this.onCancel = null;
        this.buffers = new Map(); // url -> AudioBuffer, oldest first
        this.ctx = null;
        this.sources = [];
        this.token = 0;
        this.varietyIndex = 0;
        this.indicator = null;    // the button showing the current sound
        this.prefetched = new Set();
        this.ready = Promise.resolve();
        this.init();
    }

    init() {
        try { if ('audioSession' in navigator) navigator.audioSession.type = 'playback'; } catch {}
        ['touchend', 'click', 'keydown'].forEach(ev =>
            document.addEventListener(ev, () => this.unlock(), { capture: true, passive: true }));
        this.ready = this.loadManifest();
        if (!('speechSynthesis' in window)) return;
        this.loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    async loadManifest() {
        try {
            const response = await fetch(`${BASE}manifest.json`);
            if (response.ok) {
                const m = await response.json();
                this.clips = m.clips || {};
                this.sounds = m.sounds || {};
                this.segments = m.segments || {};
            }
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

    // Shows which button the current sound belongs to (null clears it).
    indicate(el, state) {
        const prev = this.indicator;
        if (prev && prev !== el) prev.classList.remove('is-loading', 'is-playing');
        this.indicator = el || null;
        if (el) {
            el.classList.toggle('is-loading', state === 'loading');
            el.classList.toggle('is-playing', state === 'playing');
        }
    }

    // Path of the recorded clip for this text, or null. variety: alternate between the recorded voices.
    clipUrl(text, variety = false) {
        const entry = this.clips[String(text).toLowerCase()];
        if (!entry) return null;
        const voices = Object.keys(entry).sort();
        const voice = variety && voices.length > 1 ? voices[this.varietyIndex++ % voices.length] : (entry.f ? 'f' : voices[0]);
        return BASE + entry[voice];
    }

    // Every recorded clip of this text (all voices).
    clipUrls(text) {
        const entry = this.clips[String(text).toLowerCase()];
        return entry ? Object.values(entry).map(path => BASE + path) : [];
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

    // Downloads and decodes clips ahead of time (the next item's words), so they play at once.
    preload(texts) {
        if (!this.getContext()) return;
        texts.filter(Boolean).forEach(t => this.clipUrls(t).forEach(url => this.loadBuffer(url).catch(() => {})));
    }

    // Downloads a unit's clips in the background, a few at a time, so the service worker keeps them for
    // offline use. Skipped without a service worker, and on slow or data-saving connections.
    async prefetch(texts) {
        await this.ready;
        if (!navigator.serviceWorker?.controller) return;
        const c = navigator.connection;
        if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return;
        const urls = new Set();
        texts.forEach(t => this.clipUrls(t).forEach(u => urls.add(u)));
        Object.values(this.sounds).forEach(path => urls.add(BASE + path));
        const queue = [...urls].filter(u => !this.prefetched.has(u));
        queue.forEach(u => this.prefetched.add(u));
        const worker = async () => {
            while (queue.length) {
                const url = queue.shift();
                try { await fetch(url); } catch { this.prefetched.delete(url); }
            }
        };
        for (let i = 0; i < PREFETCH_WORKERS; i++) worker();
    }

    stop() {
        this.token++;
        const cancel = this.onCancel;
        this.onCancel = null;
        if (cancel) cancel();
        this.sources.forEach(s => { try { s.onended = null; s.stop(); } catch {} });
        this.sources = [];
        try { window.speechSynthesis?.cancel(); } catch {}
        this.indicate(null);
    }

    // options.variety: use more than one speaker (listening practice). options.el: the button to show it on.
    speak(text, { variety = false, onend = null, el = null } = {}) {
        if (!text) return;
        this.stop();
        const token = this.token;
        this.indicate(el, 'loading');
        const url = this.clipUrl(text, variety);
        const ctx = url ? this.getContext() : null;
        if (!ctx) { this.speakTTS(text, { variety, onend, el, token }); return; }
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
                if (token !== this.token) return;
                this.indicate(null);
                if (onend) onend();
            };
            source.onended = finish;
            // If the context is still suspended, onended never fires; don't let a sequence stall.
            setTimeout(finish, buffer.duration * 1000 + 600);
            this.sources.push(source);
            source.start();
            this.indicate(el, 'playing');
        }).catch(() => {
            if (token === this.token) this.speakTTS(text, { variety, onend, el, token });
        });
    }

    // Sound it out: the word's sounds one by one (c – a – t), then the whole word.
    // Only for words with recorded sounds; returns false otherwise.
    canSoundOut(word) {
        const key = String(word).toLowerCase();
        const parts = this.segments[key];
        return !!(parts && this.clips[key] && parts.every(([, sound]) => this.sounds[sound]) && (window.AudioContext || window.webkitAudioContext));
    }

    partsOf(word) {
        return this.segments[String(word).toLowerCase()] || null;
    }

    // onStep(i): sound i starts (-1: the whole word). oncancel: stopped before the end. el: the button to show it on.
    soundOut(word, { onStep = null, onend = null, oncancel = null, el = null } = {}) {
        if (!this.canSoundOut(word)) return false;
        this.stop();
        const token = this.token;
        this.onCancel = oncancel;
        this.indicate(el, 'loading');
        const ctx = this.getContext();
        this.unlock();
        const urls = this.partsOf(word).map(([, sound]) => BASE + this.sounds[sound]);
        urls.push(this.clipUrl(word));
        Promise.all(urls.map(u => this.loadBuffer(u))).then(buffers => {
            if (token !== this.token) return;
            this.indicate(el, 'playing');
            const at = (time, fn) => setTimeout(() => { if (token === this.token) fn(); }, Math.max(0, (time - ctx.currentTime) * 1000));
            let t = ctx.currentTime + 0.05;
            buffers.forEach((buffer, i) => {
                const whole = i === buffers.length - 1;
                if (whole) t += WORD_PAUSE - SOUND_GAP;
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(t);
                this.sources.push(source);
                const start = t;
                if (onStep) at(start, () => onStep(whole ? -1 : i));
                t += buffer.duration + SOUND_GAP;
            });
            at(t, () => {
                this.sources = [];
                this.onCancel = null;
                this.indicate(null);
                if (onend) onend();
            });
        }).catch(() => {
            if (token !== this.token) return;
            this.onCancel = null;
            if (oncancel) oncancel();
            this.speak(word, { onend, el });
        });
        return true;
    }

    speakTTS(text, { variety = false, onend = null, el = null, token = this.token } = {}) {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            if (token !== this.token) return;
            this.indicate(null);
            if (onend) onend();
        };
        try {
            if (!('speechSynthesis' in window)) { finish(); return; }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            const voice = variety ? this.nextVarietyVoice() : this.voice;
            if (voice) utterance.voice = voice;
            utterance.onstart = () => { if (token === this.token) this.indicate(el, 'playing'); };
            // Some browsers never fire onend; fall back to a timer.
            utterance.onend = finish;
            setTimeout(finish, 900 + String(text).length * 90);
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Speech synthesis error:', error);
            finish();
        }
    }

    nextVarietyVoice() {
        const us = this.voices.filter(v => /^en[-_]US/i.test(v.lang)).slice(0, 3);
        if (us.length < 2) return this.voice;
        this.varietyIndex = (this.varietyIndex + 1) % us.length;
        return us[this.varietyIndex];
    }
}
