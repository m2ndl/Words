// Checks curriculum.json for mistakes that would teach the wrong thing.
// Run: npm run validate   (or: node tools/validate-curriculum.mjs)
import { readFileSync } from 'node:fs';

const file = new URL('../curriculum.json', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8'));
const errors = [];
const warnings = [];
const err = msg => errors.push(msg);
const warn = msg => warnings.push(msg);

const TYPES = new Set(['say', 'listen', 'read', 'sort', 'odd', 'fill', 'build', 'sentence']);
const gloss = data.glossary || {};
const hasGloss = w => Object.prototype.hasOwnProperty.call(gloss, String(w).toLowerCase());
const ids = new Set();
const seenId = (id, where) => { if (ids.has(id)) err(`${where}: duplicate id "${id}"`); ids.add(id); };

for (const tech of data.techniques || []) {
  seenId(tech.id, 'unit');
  if (!tech.name_ar || !tech.subSkills?.length) err(`${tech.id}: missing name_ar or lessons`);
  if (tech.keyword && !hasGloss(tech.keyword)) err(`${tech.id}: no gloss for keyword "${tech.keyword}"`);
  for (const sub of tech.subSkills || []) {
    const where = `${tech.id}/${sub.id}`;
    seenId(sub.id, where);
    if (!sub.learn_info) err(`${where}: missing learn_info`);
    const opens = (sub.learn_info.match(/\{/g) || []).length, closes = (sub.learn_info.match(/\}/g) || []).length;
    if (opens !== closes) err(`${where}: unbalanced { } in learn_info`);
    for (const m of sub.learn_info.matchAll(/\{([^{}]+)\}/g)) {
      for (const w of m[1].split(/[>≠]/).map(x => x.trim())) if (!hasGloss(w)) warn(`${where}: no gloss for learn word "${w}"`);
    }
    for (const ex of sub.examples || []) {
      for (const w of [ex.before, ex.after]) if (!hasGloss(w)) err(`${where}: no gloss for example "${w}"`);
    }
    for (const w of sub.heartWords || []) if (!hasGloss(w)) err(`${where}: no gloss for heart word "${w}"`);

    for (const step of ['drill', 'quiz']) {
      const qs = sub[step]?.questions || [];
      if (!qs.length) err(`${where}: ${step} has no questions`);
      for (const q of qs) {
        const at = `${where} ${q.id || '(no id)'}`;
        if (!q.id) err(`${at}: missing id`); else seenId(q.id, at);
        if (!TYPES.has(q.type)) { err(`${at}: unknown type "${q.type}"`); continue; }
        const words = [];
        if (['listen', 'read', 'odd'].includes(q.type)) {
          if (!q.options.includes(q.answer)) err(`${at}: answer "${q.answer}" is not one of the options`);
          if (new Set(q.options).size !== q.options.length) err(`${at}: duplicate options`);
          if (q.type === 'listen' && q.audio !== q.answer) err(`${at}: audio "${q.audio}" does not match answer "${q.answer}"`);
          if (q.type !== 'odd' && q.options.length < 3) warn(`${at}: only ${q.options.length} options (3 recommended)`);
          words.push(...q.options);
          if (q.type === 'read') {
            const gl = q.options.map(o => gloss[o.toLowerCase()]);
            if (new Set(gl).size !== gl.length) err(`${at}: two options have the same Arabic meaning`);
          }
        }
        if (q.type === 'say' || q.type === 'sort') words.push(q.word);
        if (q.type === 'sort' && !(q.answer >= 0 && q.answer < q.labels.length)) err(`${at}: sort answer index out of range`);
        if (q.type === 'fill') {
          if (q.partial.replace('_', q.correct) !== q.answer) err(`${at}: "${q.partial}" + "${q.correct}" does not spell "${q.answer}"`);
          if (!q.options.includes(q.correct)) err(`${at}: correct letters not in options`);
          words.push(q.answer);
        }
        if (q.type === 'build') {
          if (q.tiles.join('') !== q.word) err(`${at}: tiles do not spell "${q.word}"`);
          if (q.start && q.start.length !== q.tiles.length) err(`${at}: start has ${q.start.length} boxes, word has ${q.tiles.length}`);
          words.push(q.word);
        }
        if (q.type === 'sentence') {
          if (!(q.answer >= 0 && q.answer < q.options.length)) err(`${at}: sentence answer index out of range`);
          if (new Set(q.options).size !== q.options.length) err(`${at}: duplicate meanings`);
        }
        for (const w of words) if (!hasGloss(w)) err(`${at}: no gloss for "${w}"`);
      }
    }
  }
}

warnings.forEach(w => console.log('warning:', w));
errors.forEach(e => console.log('ERROR:', e));
const units = (data.techniques || []).length;
const lessons = (data.techniques || []).reduce((n, t) => n + t.subSkills.length, 0);
console.log(`${units} units, ${lessons} lessons, ${ids.size} ids, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
