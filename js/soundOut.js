'use strict';
import { escapeHtml } from './textUtils.js';

// "Sound it out" (c – a – t … cat): each sound plays while its letters light up, then the whole word.
// It models blending for decodable words; heart words are learnt as wholes and have no button.

export function soundOutButton(audio, word, size = 'sm') {
    if (!audio.canSoundOut(word)) return '';
    return `<button class="soundout-btn soundout-${size}" data-soundout="${escapeHtml(word)}" title="قطّع الكلمة: صوتاً صوتاً" aria-label="قطّع الكلمة: صوتاً صوتاً">🐢</button>`;
}

// Letter positions for each part; a split digraph (a_e) is its vowel plus the final e.
function letterGroups(text, parts) {
    const groups = [];
    let p = 0;
    for (const [letters] of parts) {
        if (letters.includes('_')) { groups.push([p, text.length - 1]); p += 1; }
        else { groups.push(Array.from(letters, (_, k) => p + k)); p += letters.length; }
    }
    return groups;
}

// Plays the word sound by sound. el (optional) shows the word; its letters light up as they are said.
export function soundOut(audio, word, el = null, onend = null) {
    const parts = audio.partsOf(word);
    let restore = () => {};
    let step = () => {};
    const text = el ? el.textContent.trim() : '';
    if (el && parts && text.toLowerCase() === String(word).toLowerCase()) {
        const saved = el.innerHTML;
        const groups = letterGroups(text, parts);
        el.innerHTML = Array.from(text, (ch, i) => `<span class="so-l" data-i="${i}">${escapeHtml(ch)}</span>`).join('');
        el.classList.add('so-active');
        const letters = [...el.querySelectorAll('.so-l')];
        step = i => letters.forEach(l => l.classList.toggle('so-on', i === -1 || groups[i].includes(+l.dataset.i)));
        restore = () => { el.innerHTML = saved; el.classList.remove('so-active'); };
    }
    return audio.soundOut(word, {
        onStep: step,
        onend: () => { restore(); if (onend) onend(); },
        oncancel: restore
    });
}

// The word element that goes with a sound-out button (same example card, feedback row or item).
export function wordElementFor(button) {
    const word = button.dataset.soundout;
    const scope = button.closest('.example-card, .fb-row, #modal-body') || document;
    return [...scope.querySelectorAll('[data-word]')].find(el => el.dataset.word === word) || null;
}
