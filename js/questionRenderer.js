'use strict';
import { escapeHtml, highlightFocus } from './textUtils.js';
import { soundOutButton, soundOut } from './soundOut.js';

// Default instructions for each activity type (a question can override them with `prompt`).
const PROMPTS = {
    say: 'اقرأ الكلمة بصوت عالٍ، ثم اضغط 🔊 لتتحقّق.',
    listen: 'استمع، ثم اختر الكلمة التي سمعتها.',
    read: 'اقرأ الكلمة، ثم اختر معناها.',
    sort: 'اختر الإجابة الصحيحة.',
    odd: 'اقرأ الكلمات، ثم اختر الكلمة التي صوتها مختلف.',
    fill: 'استمع، ثم اختر الحرف الناقص.',
    build: 'استمع، ثم ابنِ الكلمة.',
    chain: 'غيّر حرفاً واحداً لتكتب الكلمة التي تسمعها.',
    sentence: 'اقرأ الجملة، ثم اختر معناها.'
};

const SPEAKER_SVG = '<svg class="w-10 h-10 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/><path d="M14 10a4 4 0 00-4-4v8a4 4 0 004-4z"/></svg>';

// Renders one activity item inside the activity modal and reports the learner's answer to the game engine.
// Decoding items (read, sort, odd, say, sentence) show print only; the audio comes after the answer.
export class QuestionRenderer {
    constructor(uiManager, audioManager, gameEngine, dataManager) {
        this.ui = uiManager;
        this.audio = audioManager;
        this.game = gameEngine;
        this.data = dataManager;
    }

    render(question, subSkill) {
        this.q = question;
        this.sub = subSkill || {};
        const renderers = {
            say: () => this.renderSay(),
            listen: () => this.renderListen(),
            read: () => this.renderRead(),
            sort: () => this.renderSort(),
            odd: () => this.renderOdd(),
            fill: () => this.renderFill(),
            build: () => this.renderBuild(),
            sentence: () => this.renderSentence()
        };
        (renderers[question.type] || renderers.listen)();
    }

    get body() { return this.ui.elements.modal_body; }

    prompt(type) {
        const text = this.q.prompt || PROMPTS[type];
        return `<p class="q-prompt">${escapeHtml(text)}</p>`;
    }

    word(w) {
        return `<div class="q-word english-font" dir="ltr" data-word="${escapeHtml(w)}">${highlightFocus(w, [])}</div>`;
    }

    bigSpeaker(id) {
        return `<button id="${id}" class="speaker-btn q-speaker" aria-label="استمع">${SPEAKER_SVG}</button>`;
    }

    // Shuffled option buttons; `label` turns an option into its visible text.
    optionButtons(options, label, extraClass = '') {
        return this.game.shuffleArray(options).map(o =>
            `<button class="option-button q-option ${extraClass}" data-value="${escapeHtml(o)}">${label(o)}</button>`).join('');
    }

    bindOptions(onPick) {
        this.body.querySelectorAll('.q-option').forEach(btn => {
            btn.onclick = () => onPick(btn.dataset.value, btn);
        });
    }

    // --- read aloud, then check (self-assessed practice) ---
    renderSay() {
        const { word } = this.q;
        this.body.innerHTML = `
            ${this.prompt('say')}
            ${this.word(word)}
            ${this.bigSpeaker('say-check')}
            <div id="say-gloss" class="q-gloss hidden">${escapeHtml(this.data.getGloss(word))} ${soundOutButton(this.audio, word)}</div>
            <div id="say-self" class="q-options-row hidden">
                <button class="option-button q-self" data-self="yes">✅ قرأتها صحيحة</button>
                <button class="option-button q-self" data-self="no">🔁 ليس بعد</button>
            </div>`;
        this.body.querySelector('#say-check').onclick = () => {
            this.audio.speak(word);
            this.body.querySelector('#say-gloss').classList.remove('hidden');
            this.body.querySelector('#say-self').classList.remove('hidden');
        };
        this.body.querySelectorAll('.q-self').forEach(btn => {
            btn.onclick = () => {
                const correct = btn.dataset.self === 'yes';
                this.game.handleAnswer({ correct, chosen: btn.dataset.self, target: word, el: btn, selfCheck: true });
                // Not yet: hear it sound by sound while the letters light up.
                if (!correct) soundOut(this.audio, word, this.body.querySelector('.q-word'));
            };
        });
    }

    // --- hear a word, choose the written word ---
    renderListen() {
        const { audio, options, answer } = this.q;
        this.body.innerHTML = `
            ${this.prompt('listen')}
            ${this.bigSpeaker('listen-play')}
            <div class="q-options-col">${this.optionButtons(options, o => `<span class="english-font" dir="ltr">${escapeHtml(o)}</span>`)}</div>`;
        const play = () => this.audio.speak(audio, { variety: true });
        this.body.querySelector('#listen-play').onclick = play;
        setTimeout(play, 350);
        this.bindOptions((value, btn) => this.game.handleAnswer({ correct: value === answer, chosen: value, target: answer, el: btn }));
    }

    // --- read a word, choose its meaning (no audio before answering) ---
    renderRead() {
        const { word, options, answer } = this.q;
        this.body.innerHTML = `
            ${this.prompt('read')}
            ${this.word(word)}
            <div class="q-options-col">${this.optionButtons(options, o => escapeHtml(this.data.getGloss(o) || o), 'q-arabic')}</div>`;
        this.bindOptions((value, btn) => this.game.handleAnswer({ correct: value === answer, chosen: value, target: answer, el: btn }));
    }

    // --- read a word, choose how a part of it sounds ---
    renderSort() {
        const { word, labels, answer } = this.q;
        this.body.innerHTML = `
            ${this.prompt('sort')}
            ${this.word(word)}
            <div class="q-options-row">${labels.map((l, i) => `<button class="option-button q-option q-label" data-value="${i}">${escapeHtml(l)}</button>`).join('')}</div>`;
        this.bindOptions((value, btn) => this.game.handleAnswer({
            correct: Number(value) === answer, chosen: labels[Number(value)], target: word, correctLabel: labels[answer], el: btn
        }));
    }

    // --- read four words, choose the one whose sound is different ---
    renderOdd() {
        const { options, answer } = this.q;
        this.body.innerHTML = `
            ${this.prompt('odd')}
            <div class="q-options-grid">${this.optionButtons(options, o => `<span class="english-font" dir="ltr">${escapeHtml(o)}</span>`)}</div>`;
        this.bindOptions((value, btn) => this.game.handleAnswer({ correct: value === answer, chosen: value, target: answer, el: btn }));
    }

    // --- hear a word, choose the missing letters (spelling) ---
    renderFill() {
        const { partial, options, correct, answer } = this.q;
        const shown = escapeHtml(partial).replace('_', '<span id="blank" class="q-blank">__</span>');
        this.body.innerHTML = `
            ${this.prompt('fill')}
            ${this.bigSpeaker('fill-play')}
            <div class="q-word english-font" dir="ltr">${shown}</div>
            <div class="q-options-row">${this.optionButtons(options, o => `<span class="english-font" dir="ltr">${escapeHtml(o)}</span>`)}</div>`;
        const play = () => this.audio.speak(answer);
        this.body.querySelector('#fill-play').onclick = play;
        setTimeout(play, 350);
        this.bindOptions((value, btn) => {
            const ok = value === correct;
            if (ok) this.body.querySelector('#blank').textContent = correct;
            this.game.handleAnswer({ correct: ok, chosen: partial.replace('_', value), target: answer, el: btn });
        });
    }

    // --- hear a word, build it from sound tiles (or change one tile of the previous word) ---
    renderBuild() {
        const { word, tiles, extra = [], start } = this.q;
        const isChain = Array.isArray(start);
        const boxes = isChain ? start.slice() : tiles.map(() => '');
        // Tiles still needed in the bank: for a chain only the ones that differ from the start word.
        const needed = isChain ? tiles.filter((t, i) => start[i] !== t) : tiles.slice();
        const bank = this.game.shuffleArray([...needed, ...extra]);
        this.body.innerHTML = `
            ${this.prompt(isChain ? 'chain' : 'build')}
            ${this.bigSpeaker('build-play')}
            <div class="q-gloss">${escapeHtml(this.data.getGloss(word))}</div>
            <div id="letter-boxes" class="q-boxes" dir="ltr"></div>
            <div id="letter-choices" class="q-tiles" dir="ltr"></div>`;
        const play = () => this.audio.speak(word);
        this.body.querySelector('#build-play').onclick = play;
        setTimeout(play, 350);

        const boxesEl = this.body.querySelector('#letter-boxes');
        const bankEl = this.body.querySelector('#letter-choices');
        let touched = false;
        const draw = () => {
            boxesEl.innerHTML = boxes.map((b, i) => `<button class="letter-box ${b ? 'filled' : ''}" data-i="${i}">${escapeHtml(b)}</button>`).join('');
            bankEl.innerHTML = bank.map((t, i) => `<button class="letter-choice" data-i="${i}">${escapeHtml(t)}</button>`).join('');
            boxesEl.querySelectorAll('.letter-box').forEach(el => el.onclick = () => {
                if (this.game.isLocked()) return;
                const i = Number(el.dataset.i);
                if (!boxes[i]) return;
                bank.push(boxes[i]); boxes[i] = ''; touched = true; draw();
            });
            bankEl.querySelectorAll('.letter-choice').forEach(el => el.onclick = () => {
                if (this.game.isLocked()) return;
                const empty = boxes.indexOf('');
                if (empty === -1) return;
                boxes[empty] = bank.splice(Number(el.dataset.i), 1)[0]; touched = true; draw();
                if (!boxes.includes('')) {
                    const built = boxes.join('');
                    this.game.handleAnswer({ correct: built === word, chosen: built, target: word, el: boxesEl });
                }
            });
        };
        draw();
        this.redrawBuild = draw;
        this.isBuildTouched = () => touched;
    }

    // --- read a sentence, choose its meaning (Arabic) ---
    renderSentence() {
        const { text, options, answer } = this.q;
        const correctText = options[answer];
        this.body.innerHTML = `
            ${this.prompt('sentence')}
            <div class="q-sentence english-font" dir="ltr">${escapeHtml(text)}</div>
            <div class="q-options-col">${this.optionButtons(options, o => escapeHtml(o), 'q-arabic')}</div>`;
        this.bindOptions((value, btn) => this.game.handleAnswer({ correct: value === correctText, chosen: value, target: text, correctMeaning: correctText, el: btn }));
    }
}
