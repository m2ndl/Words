'use strict';

// Small text helpers shared by the Learn page, the activities and the feedback panel.

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Wraps the letters of `word` that belong to the focus patterns in <mark class="focus">.
// Focus items: "sh", "ee" (anywhere), "a_e" (vowel + consonant(s) + final e),
// "-ed" / "-s" (only at the end of the word).
export function highlightFocus(word, focus = [], cls = 'focus') {
  const lower = word.toLowerCase();
  const mask = new Array(word.length).fill(false);
  focus.forEach(f => {
    if (!f) return;
    if (f.includes('_')) {
      const [v, end] = f.split('_');
      const m = lower.match(new RegExp(`(${v})([^aeiou]{1,2})(${end || 'e'})$`));
      if (m) {
        const i = m.index;
        mask[i] = true;
        mask[lower.length - 1] = true;
      }
      return;
    }
    if (f.startsWith('-')) {
      const suf = f.slice(1);
      if (lower.endsWith(suf) && lower.length > suf.length) {
        for (let i = lower.length - suf.length; i < lower.length; i++) mask[i] = true;
      }
      return;
    }
    let from = 0;
    const g = f.toLowerCase();
    while (g && (from = lower.indexOf(g, from)) !== -1) {
      for (let i = from; i < from + g.length; i++) mask[i] = true;
      from += g.length;
    }
  });
  return wrapMask(word, mask, cls);
}

// Highlights `mark` (a substring) inside `word` — used for the tricky part of heart words.
export function highlightPart(word, mark, cls = 'tricky') {
  const i = word.toLowerCase().indexOf((mark || '').toLowerCase());
  if (!mark || i === -1) return escapeHtml(word);
  const mask = new Array(word.length).fill(false);
  for (let k = i; k < i + mark.length; k++) mask[k] = true;
  return wrapMask(word, mask, cls);
}

// Marks the letters where two words differ (common start and end are left plain).
export function diffHighlight(word, other, cls = 'diff') {
  const a = word.toLowerCase(), b = (other || '').toLowerCase();
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  const mask = new Array(word.length).fill(false);
  for (let i = start; i < word.length - end; i++) mask[i] = true;
  return wrapMask(word, mask, cls);
}

function wrapMask(word, mask, cls) {
  let html = '', open = false;
  for (let i = 0; i < word.length; i++) {
    if (mask[i] && !open) { html += `<mark class="${cls}">`; open = true; }
    if (!mask[i] && open) { html += '</mark>'; open = false; }
    html += escapeHtml(word[i]);
  }
  if (open) html += '</mark>';
  return html;
}

export function speakerButton(text, size = 'sm') {
  const t = escapeHtml(text);
  return `<button class="speaker-btn speaker-${size}" data-speak="${t}" aria-label="استمع إلى ${t}">🔊</button>`;
}

// Expands the Learn-page markup used in curriculum.json:
//   {word}      word with a speaker button
//   {a > b}     a → b
//   {a ≠ b}     a ≠ b
//   `text`      inline English without audio
export function expandLearnMarkup(html, focus = []) {
  const word = w => `<span class="learn-word" dir="ltr">${speakerButton(w)}<span class="english-font">${highlightFocus(w, focus)}</span></span>`;
  return String(html)
    .replace(/\{([^{}]+?)\s*>\s*([^{}]+?)\}/g, (_, a, b) =>
      `<span class="learn-pair" dir="ltr">${word(a.trim())}<span class="learn-arrow">→</span>${word(b.trim())}</span>`)
    .replace(/\{([^{}]+?)\s*≠\s*([^{}]+?)\}/g, (_, a, b) =>
      `<span class="learn-pair" dir="ltr">${word(a.trim())}<span class="learn-arrow">≠</span>${word(b.trim())}</span>`)
    .replace(/\{([^{}]+)\}/g, (_, a) => word(a.trim()))
    .replace(/`([^`]+)`/g, (_, a) => `<span class="english-font en-inline" dir="ltr">${escapeHtml(a)}</span>`);
}
