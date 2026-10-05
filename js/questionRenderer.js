'use strict';
import { escapeHtml, ar, highlightFocus, SPEAKER_ICON } from './textUtils.js';
import { soundOutButton, soundOut } from './soundOut.js';

// Default instructions for each activity type (a question can override them with `prompt`).
const PROMPTS = {
    say: 'اقرأ الكلمة بصوت عالٍ، ثم اضغط 🔊 لتتحقّق.',
    listen: 'استمع، ثم اختر الكلمة التي سمعتها.',
    read: 'اقرأ الكلمة، ثم اختر معناها.',
    sort: 'اختر الإجابة الصحيحة.',
    odd: 'اقرأ الكلمات، ثم اختر الكلمة التي صوتها مختلف.',
    fill: 'استمع، ثم اختر الحرف الناقص.',
    fill2: 'استمع، ثم اختر الحرفين الناقصين.',
    build: 'استمع، ثم ابنِ الكلمة واضغط «تحقّق».',
    chain: 'غيّر حرفاً واحداً لتكتب الكلمة التي تسمعها: اضغط الحرف الذي يتغيّر لتحذفه، ثم اختر الحرف الجديد واضغط «تحقّق».',
    sentence: 'اقرأ الجملة، ثم اختر معناها.'
};

// Renders one activity item inside the activity dialog and reports the learner's answer to the game engine.
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
        return `<p class="q-prompt" tabindex="-1">${ar(text)}</p>`;
    }

    word(w) {
        return `<div class="q-word" dir="ltr" lang="en" data-word="${escapeHtml(w)}">${highlightFocus(w, [])}</div>`;
    }

    bigSpeaker(id) {
        return `<button id="${id}" class="speaker-btn q-speaker" aria-label="استمع مرة أخرى">${SPEAKER_ICON}</button>`;
    }

    // Shuffled option buttons; `label` turns an option into its visible text.
    optionButtons(options, label, extraClass = '') {
        return this.game.shuffleArray(options).map(o =>
            `<button class="option-button q-option ${extraClass}" data-value="${escapeHtml(o)}">${label(o)}</button>`).join('');
    }

    english(text) {
        return `<span dir="ltr" lang="en">${escapeHtml(text)}</span>`;
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
            <div id="say-gloss" class="q-gloss hidden">${ar(this.data.getGloss(word))} ${soundOutButton(this.audio, word)}</div>
            <div id="say-self" class="q-options-row hidden">
                <button class="option-button q-self" data-self="yes">✅ قرأتها صحيحة</button>
                <button class="option-button q-self" data-self="no">🔁 ليس بعد</button>
            </div>`;
        const check = this.body.querySelector('#say-check');
        check.setAttribute('aria-label', 'استمع لتتحقّق');
        check.onclick = () => {
            this.audio.speak(word, { el: check });
            this.body.querySelector('#say-gloss').classList.remove('hidden');
            this.body.querySelector('#say-self').classList.remove('hidden');
        };
        this.body.querySelectorAll('.q-self').forEach(btn => {
            btn.onclick = () => {
                const correct = btn.dataset.self === 'yes';
                this.game.handleAnswer({ correct, chosen: btn.dataset.self, target: word, el: btn, selfCheck: true });
                // Not yet: hear it sound by sound while the letters light up.
                if (!correct) soundOut(this.audio, word, this.body.querySelector('.q-word'), null, check);
            };
        });
    }

    // --- hear a word, choose the written word ---
    renderListen() {
        const { audio, options, answer } = this.q;
        this.body.innerHTML = `
            ${this.prompt('listen')}
            ${this.bigSpeaker('listen-play')}
            <div class="q-options-col">${this.optionButtons(options, o => this.english(o))}</div>`;
        const btn = this.body.querySelector('#listen-play');
        const play = () => this.audio.speak(audio, { variety: true, el: btn });
        btn.onclick = play;
        this.autoplay(play);
        this.bindOptions((value, el) => this.game.handleAnswer({ correct: value === answer, chosen: value, target: answer, el }));
    }

    // --- read a word, choose its meaning (no audio before answering) ---
    renderRead() {
        const { word, options, answer } = this.q;
        this.body.innerHTML = `
            ${this.prompt('read')}
            ${this.word(word)}
            <div class="q-options-col">${this.optionButtons(options, o => ar(this.data.getGloss(o) || o), 'q-arabic')}</div>`;
        this.bindOptions((value, el) => this.game.handleAnswer({ correct: value === answer, chosen: value, target: answer, el }));
    }

    // --- read a word, choose how a part of it sounds ---
    renderSort() {
        const { word, labels, answer } = this.q;
        this.body.innerHTML = `
            ${this.prompt('sort')}
            ${this.word(word)}
            <div class="q-options-row">${labels.map((l, i) => `<button class="option-button q-option q-label" data-value="${i}">${ar(l)}</button>`).join('')}</div>`;
        this.bindOptions((value, el) => this.game.handleAnswer({
            correct: Number(value) === answer, chosen: labels[Number(value)], target: word, correctLabel: labels[answer], el
        }));
    }

    // --- read four words, choose the one whose sound is different ---
    renderOdd() {
        const { options, answer } = this.q;
        this.body.innerHTML = `
            ${this.prompt('odd')}
            <div class="q-options-grid">${this.optionButtons(options, o => this.english(o))}</div>`;
        this.bindOptions((value, el) => this.game.handleAnswer({ correct: value === answer, chosen: value, target: answer, el }));
    }

    // --- hear a word, choose the missing letters (spelling): one blank per missing letter ---
    renderFill() {
        const { partial, options, correct, answer } = this.q;
        const [left, right = ''] = partial.split('_');
        const blanks = Array.from(correct, () => '<span class="q-blank"></span>').join('');
        const missing = correct.length === 1 ? 'حرف ناقص' : 'حرفان ناقصان';
        this.body.innerHTML = `
            ${this.prompt(correct.length > 1 ? 'fill2' : 'fill')}
            ${this.bigSpeaker('fill-play')}
            <div class="q-word" dir="ltr" lang="en">${escapeHtml(left)}<span id="blank" class="q-blanks">${blanks}<span class="sr-only" lang="ar">${missing}</span></span>${escapeHtml(right)}</div>
            <div class="q-options-row">${this.optionButtons(options, o => this.english(o))}</div>`;
        const btn = this.body.querySelector('#fill-play');
        const play = () => this.audio.speak(answer, { el: btn });
        btn.onclick = play;
        this.autoplay(play);
        this.bindOptions((value, el) => {
            // The word is completed with the right letters either way; the feedback compares the two.
            this.body.querySelector('#blank').outerHTML = `<span class="q-filled">${escapeHtml(correct)}</span>`;
            this.game.handleAnswer({ correct: value === correct, chosen: partial.replace('_', value), target: answer, el });
        });
    }

    // --- hear a word, build it from sound tiles (or change one tile of the previous word) ---
    // Nothing is checked until the learner presses «تحقّق»; a tile in the word goes back to the bank when tapped.
    renderBuild() {
        const { word, tiles, extra = [], start } = this.q;
        const isChain = Array.isArray(start);
        // Tiles still needed in the bank: for a chain only the ones that differ from the start word.
        const needed = isChain ? tiles.filter((t, i) => start[i] !== t) : tiles.slice();
        const startBank = this.game.shuffleArray([...needed, ...extra]);
        let boxes, bank;
        const reset = () => { boxes = isChain ? start.slice() : tiles.map(() => ''); bank = startBank.slice(); };
        reset();
        this.body.innerHTML = `
            ${this.prompt(isChain ? 'chain' : 'build')}
            ${this.bigSpeaker('build-play')}
            <div class="q-gloss">${ar(this.data.getGloss(word))}</div>
            <div id="letter-boxes" class="q-boxes" dir="ltr" lang="en" role="group" aria-label="الكلمة"></div>
            <p id="build-hint" class="q-hint hidden">اضغط أي حرف في الكلمة لتعيده.</p>
            <div id="letter-choices" class="q-tiles" dir="ltr" lang="en" role="group" aria-label="الحروف"></div>
            <div class="q-build-tools"><button id="build-clear" class="btn-text hidden">↺ ابدأ من جديد</button></div>`;
        const playBtn = this.body.querySelector('#build-play');
        const play = () => this.audio.speak(word, { el: playBtn });
        playBtn.onclick = play;
        this.autoplay(play);

        const boxesEl = this.body.querySelector('#letter-boxes');
        const bankEl = this.body.querySelector('#letter-choices');
        const clearBtn = this.body.querySelector('#build-clear');
        const hint = this.body.querySelector('#build-hint');
        const changed = () => isChain ? boxes.some((b, i) => b !== start[i]) : boxes.some(Boolean);
        const check = () => {
            if (this.game.isLocked() || boxes.includes('')) return;
            const built = boxes.join('');
            this.game.handleAnswer({ correct: built === word, chosen: built, target: word, el: boxesEl });
        };
        const draw = () => {
            boxesEl.innerHTML = boxes.map((b, i) => b
                ? `<button class="letter-box filled" data-i="${i}" aria-label="${escapeHtml(b)}: اضغط لتحذفه">${escapeHtml(b)}</button>`
                : `<button class="letter-box" data-i="${i}" disabled aria-label="مكان فارغ"></button>`).join('');
            bankEl.innerHTML = bank.map((t, i) => `<button class="letter-choice" data-i="${i}">${escapeHtml(t)}</button>`).join('');
            boxesEl.querySelectorAll('.letter-box.filled').forEach(el => el.onclick = () => {
                if (this.game.isLocked()) return;
                const i = Number(el.dataset.i);
                bank.push(boxes[i]); boxes[i] = ''; draw();
            });
            bankEl.querySelectorAll('.letter-choice').forEach(el => el.onclick = () => {
                if (this.game.isLocked()) return;
                const empty = boxes.indexOf('');
                if (empty === -1) return;
                boxes[empty] = bank.splice(Number(el.dataset.i), 1)[0]; draw();
            });
            clearBtn.classList.toggle('hidden', !changed());
            hint.classList.toggle('hidden', isChain || !boxes.some(Boolean) || this.game.isLocked());
            this.game.setActionDisabled(boxes.includes(''));
        };
        clearBtn.onclick = () => { if (!this.game.isLocked()) { reset(); draw(); } };
        this.game.setFooter({ label: 'تحقّق ✓', disabled: true, onClick: check });
        draw();
    }

    // --- read a sentence, choose its meaning (Arabic) ---
    renderSentence() {
        const { text, options, answer } = this.q;
        const correctText = options[answer];
        this.body.innerHTML = `
            ${this.prompt('sentence')}
            <div class="q-sentence" dir="ltr" lang="en">${escapeHtml(text)}</div>
            <div class="q-options-col">${this.optionButtons(options, o => ar(o), 'q-arabic')}</div>`;
        this.bindOptions((value, el) => this.game.handleAnswer({ correct: value === correctText, chosen: value, target: text, correctMeaning: correctText, el }));
    }

    // Plays the item's word once it is on screen (unless the learner has already moved on).
    autoplay(play) {
        const q = this.q;
        setTimeout(() => { if (this.q === q && !this.game.isLocked()) play(); }, 350);
    }
}
