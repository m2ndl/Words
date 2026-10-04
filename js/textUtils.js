'use strict';

// Small text helpers shared by the Learn page, the activities and the feedback panel.

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// English inside Arabic text: a run of words joined by spaces, commas, hyphens, middle dots, slashes,
// "&", underscores or "…", with an optional leading hyphen (-ed). Each run is isolated so it keeps its
// own direction: without this, "-ed" shows as "ed-" and "a e i o u" can be reordered.
const LATIN_RUN = /-?[A-Za-z][A-Za-z'’]*(?:(?:\s*[·&]\s*|[-_…/]|,\s*|\s+)-?[A-Za-z][A-Za-z'’]*)*/g;

// English text set apart from the Arabic around it (short runs don't break across lines).
export function en(text) {
  const nowrap = text.length <= 16 ? ' nw' : '';
  return `<bdi class="en${nowrap}" dir="ltr" lang="en">${escapeHtml(text)}</bdi>`;
}

// Arabic text from the curriculum or the app, escaped, with its English runs isolated.
export function ar(text) {
  const s = String(text ?? '');
  let html = '', last = 0;
  for (const m of s.matchAll(LATIN_RUN)) {
    html += escapeHtml(s.slice(last, m.index)) + en(m[0]);
    last = m.index + m[0].length;
  }
  return html + escapeHtml(s.slice(last));
}

// The same for trusted curriculum HTML (Learn texts): tags, entities, {words} and `code` are left alone.
export function arHtml(html) {
  return String(html ?? '')
    .split(/(<[^>]*>|&#?\w+;|\{[^{}]*\}|`[^`]*`)/)
    .map((part, i) => (i % 2 ? part : part.replace(LATIN_RUN, m => en(m))))
    .join('');
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

// A small, neutral speaker icon (the colour comes from the button).
export const SPEAKER_ICON = '<svg class="spk-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path d="M10 3.5L6 7H3v6h3l4 3.5v-13z"/><path d="M14 10a4 4 0 00-2-3.46v6.92A4 4 0 0014 10z"/></svg>';

export function speakerButton(text, size = 'sm') {
  const t = escapeHtml(text);
  return `<button class="speaker-btn speaker-${size}" data-speak="${t}" aria-label="استمع: ${t}">${SPEAKER_ICON}</button>`;
}

// An English word that plays when tapped. `inner` is the word's (highlighted) HTML.
export function wordButton(word, inner = escapeHtml(word), cls = '') {
  const w = escapeHtml(word);
  return `<button class="word-btn ${cls}" data-speak="${w}" lang="en" dir="ltr"><span class="word-text" data-word="${w}">${inner}</span>${SPEAKER_ICON}</button>`;
}

// Expands the Learn-page markup used in curriculum.json:
//   {word}      a word that plays when tapped
//   {a > b}     a → b
//   {a ≠ b}     a ≠ b
//   `text`      inline English without audio
// Words in a row ({a} · {b} · {c}) are set as a wrapping group, without the separators.
export function expandLearnMarkup(html, focus = []) {
  const word = w => wordButton(w, highlightFocus(w, focus), 'learn-word');
  const pair = (a, b, sign, cls) =>
    `<span class="learn-pair" dir="ltr">${word(a.trim())}<span class="learn-sign ${cls}" aria-hidden="true">${sign}</span>${word(b.trim())}</span>`;
  return arHtml(html)
    .replace(/\}\s*·\s*\{/g, '}{')
    .replace(/(?:\{[^{}]+\}\s*){2,}/g, group => `<span class="learn-words">${group.trim()}</span>`)
    .replace(/\{([^{}]+?)\s*>\s*([^{}]+?)\}/g, (_, a, b) => pair(a, b, '→', 'is-arrow'))
    .replace(/\{([^{}]+?)\s*≠\s*([^{}]+?)\}/g, (_, a, b) => pair(a, b, '≠', 'is-ne'))
    .replace(/\{([^{}]+)\}/g, (_, a) => word(a.trim()))
    .replace(/`([^`]+)`/g, (_, a) => `<bdi class="en en-inline" dir="ltr" lang="en">${escapeHtml(a)}</bdi>`);
}
