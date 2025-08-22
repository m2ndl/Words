'use strict';

// Renders the HTML for different types of questions within the activity modal.
export class QuestionRenderer {
    constructor(uiManager, audioManager, gameEngine, effectsManager) {
        this.ui = uiManager;
        this.audio = audioManager;
        this.game = gameEngine;
        this.effects = effectsManager;
    }

    render(type, question, data, subSkill) {
        const renderers = {
            'morph': () => this.renderMorph(question, data),
            'sort': () => this.renderSort(question, data),
            'fill_in_blank': () => this.renderFillInBlank(question, data),
            'odd_one_out': () => this.renderOddOneOut(question, data),
            'build_the_word': () => this.renderBuildTheWord(question, data),
            'quiz': () => this.renderQuiz(question, data)
        };
        (renderers[type] || renderers['quiz'])();
    }

    renderMorph(q, data) {
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <div dir="ltr" class="text-6xl english-font font-bold mb-8">
                <span class="text-gray-800">${q.pair[0]}</span><span class="mx-4">➡️</span>
                <span id="target-word" class="text-gray-400">${q.pair[0]}_</span>
            </div>
            <button id="action-btn" class="btn-primary text-3xl">✨ أضف E السحري</button>`;
        document.getElementById('action-btn').onclick = e => {
            const target = document.getElementById('target-word');
            target.textContent = q.pair[1];
            target.classList.add('text-purple-600', 'celebration');
            this.audio.speak(q.pair[1]);
            this.game.handleAnswer(true, e.target);
        };
    }

    renderSort(q, data) {
        const { word, isCorrect } = q;
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <div class="flex flex-col items-center mb-8">
                <div class="text-5xl english-font font-bold mb-4">${word}</div>
                <button class="speaker-btn" data-speak="${word}" aria-label="Listen to ${word}">
                    <svg class="w-8 h-8 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/><path d="M14 10a4 4 0 00-4-4v8a4 4 0 004-4z"/></svg>
                </button>
            </div>
            <div class="flex justify-center gap-4">
                <button class="option-button" data-correct="${isCorrect}">✅ نعم</button>
                <button class="option-button" data-correct="${!isCorrect}">❌ لا</button>
            </div>`;
        this.audio.speak(word);
        document.querySelectorAll('.option-button').forEach(btn => {
            btn.onclick = () => this.game.handleAnswer(btn.dataset.correct === 'true', btn);
        });
    }

    renderFillInBlank(q, data) {
        const { partial, options, answer, correct } = q;
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <div dir="ltr" class="text-6xl english-font font-bold mb-8">${partial.replace('__', '<span id="blank" class="text-purple-400">__</span>')}</div>
            <div class="flex justify-center gap-4">${options.map(opt => `<button class="option-button english-font" data-option="${opt}">${opt}</button>`).join('')}</div>`;
        document.querySelectorAll('.option-button').forEach(btn => {
            btn.onclick = () => {
                const isCorrect = btn.dataset.option === correct;
                if (isCorrect) {
                    document.getElementById('blank').textContent = correct;
                    this.audio.speak(answer);
                }
                this.game.handleAnswer(isCorrect, btn);
            };
        });
    }

    renderOddOneOut(q, data) {
        const { options, answer } = q;
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <div class="grid grid-cols-2 gap-4">${options.map(opt => `<button class="option-button english-font" data-word="${opt}">${opt}</button>`).join('')}</div>`;
        document.querySelectorAll('.option-button').forEach(btn => {
            btn.onclick = () => {
                this.audio.speak(btn.dataset.word);
                this.game.handleAnswer(btn.dataset.word === answer, btn);
            };
        });
    }

    renderQuiz(q, data) {
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <button data-speak="${q.audio}" class="speaker-btn mb-8" aria-label="Listen to the word for this question">
                <svg class="w-12 h-12 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/><path d="M14 10a4 4 0 00-4-4v8a4 4 0 004-4z"/></svg>
            </button>
            <div class="flex flex-col items-center gap-4">${q.options.map(opt => `<button class="option-button english-font w-48" data-word="${opt}">${opt}</button>`).join('')}</div>`;
        document.querySelectorAll('.option-button').forEach(btn => {
            btn.onclick = () => this.game.handleAnswer(btn.dataset.word === q.answer, btn);
        });
    }

    renderBuildTheWord(q, data) {
        const shuffledLetters = this.game.shuffleArray(q.word.split('')).join('');
        this.ui.elements.modal_body.innerHTML = `
            <p class="text-xl text-gray-600 mb-8">${data.instruction}</p>
            <div class="text-6xl mb-6">${q.image}</div>
            <button data-speak="${q.word}" class="speaker-btn mb-8" aria-label="Listen to the word">
                <svg class="w-10 h-10 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/><path d="M14 10a4 4 0 00-4-4v8a4 4 0 004-4z"/></svg>
            </button>
            <div id="letter-boxes" class="mb-8" dir="ltr">${q.word.split('').map(() => `<div class="letter-box"></div>`).join('')}</div>
            <div id="letter-choices" dir="ltr">${shuffledLetters.split('').map(letter => `<div class="letter-choice">${letter}</div>`).join('')}</div>`;
        this.audio.speak(q.word);
        const choices = document.querySelectorAll('.letter-choice');
        const boxes = document.querySelectorAll('.letter-box');
        choices.forEach(choice => {
            choice.addEventListener('click', () => {
                const firstEmptyBox = Array.from(boxes).find(box => !box.textContent);
                if (firstEmptyBox) {
                    firstEmptyBox.textContent = choice.textContent;
                    choice.style.visibility = 'hidden';
                    this.checkWord(q.word);
                }
            });
        });
        boxes.forEach(box => {
            box.addEventListener('click', () => {
                if (box.textContent) {
                    const letterToReturn = box.textContent;
                    box.textContent = '';
                    const choiceToRestore = Array.from(choices).find(c => c.textContent === letterToReturn && c.style.visibility === 'hidden');
                    if (choiceToRestore) choiceToRestore.style.visibility = 'visible';
                }
            });
        });
    }

    checkWord(correctWord) {
        const boxes = document.querySelectorAll('.letter-box');
        let currentWord = Array.from(boxes).map(box => box.textContent).join('');
        if (currentWord.length === correctWord.length) {
            const isCorrect = currentWord === correctWord;
            this.game.handleAnswer(isCorrect, document.getElementById('letter-boxes'));
        }
    }
}
