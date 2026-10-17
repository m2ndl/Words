'use strict';
import { escapeHtml, ar, highlightFocus, wordButton } from './textUtils.js';
import { openDialog, closeDialog, isDialogOpen } from './dialogs.js';
import { routes } from './router.js';

// The main button's label for each step of a lesson.
const STEP_START = { learn: 'ابدأ الدرس', drill: 'ابدأ التمرين', quiz: 'ابدأ الاختبار' };
const STEPS = ['learn', 'drill', 'quiz'];
// The "words you can read" chip appears once the learner can read this many words.
const MIN_WORDS_SHOWN = 5;

// Renders the pages (home, unit), the header, short messages and confirmations.
export class UIManager {
  constructor(dataManager, stateManager, audioManager) {
    this.data = dataManager;
    this.state = stateManager;
    this.audio = audioManager;
    this.elements = {};
    this.toastTimer = null;
    this.initElements();
  }

  initElements() {
    const ids = [
      'boot', 'boot-loading', 'boot-error', 'boot-actions', 'boot-retry', 'start-btn',
      'app', 'nav-btn', 'nav-icon', 'main-title', 'words-chip', 'words-count', 'streak-chip', 'streak-count',
      'home-view', 'unit-view', 'progress-view', 'note-view',
      'activity-modal', 'modal-title', 'modal-close-btn', 'modal-progress', 'modal-scroll', 'modal-body', 'modal-feedback',
      'modal-footer', 'modal-action-btn', 'modal-secondary-btn',
      'confirm-dialog', 'confirm-title', 'confirm-text', 'confirm-ok', 'confirm-cancel',
      'side-menu', 'toast'
    ];
    ids.forEach(id => {
      this.elements[id.replace(/-/g, '_')] = document.getElementById(id);
    });
  }

  // ---------------- frame ----------------
  // The page title, and the navigation button: ☰ (menu) on home, → (back) everywhere else.
  setHeader(titleHtml, isHome) {
    const { main_title, nav_btn, nav_icon } = this.elements;
    main_title.innerHTML = titleHtml;
    nav_icon.textContent = isHome ? '☰' : '→';
    nav_btn.dataset.mode = isHome ? 'menu' : 'back';
    nav_btn.setAttribute('aria-label', isHome ? 'القائمة' : 'رجوع');
    if (isHome) nav_btn.setAttribute('aria-controls', 'side-menu');
    else { nav_btn.removeAttribute('aria-controls'); nav_btn.removeAttribute('aria-expanded'); }
    this.updateChips();
  }

  // "Words you can read" is the headline measure of progress (shown from 5 words); the streak shows from two days on.
  updateChips() {
    const words = this.state.countWordsLearned(this.data.getTechniques());
    this.elements.words_count.textContent = words;
    this.elements.words_chip.classList.toggle('hidden', words < MIN_WORDS_SHOWN);
    const streak = this.state.userProgress.streak || 0;
    this.elements.streak_count.textContent = streak;
    this.elements.streak_chip.classList.toggle('hidden', streak < 2);
  }

  showView(name) {
    ['home', 'unit', 'progress', 'note'].forEach(v => this.elements[`${v}_view`].classList.toggle('hidden', v !== name));
  }

  unitPicture(tech, size = '') {
    return `<img class="unit-pic ${size}" src="${escapeHtml(this.data.unitPicture(tech))}" alt="" data-emoji="${escapeHtml(tech.icon || '')}">`;
  }

  // A picture that fails to load is replaced by the unit's emoji.
  fallbackPictures(container) {
    container.querySelectorAll('img.unit-pic').forEach(img => img.addEventListener('error', () => {
      const span = document.createElement('span');
      span.className = `${img.className} unit-pic-emoji`;
      span.setAttribute('aria-hidden', 'true');
      span.textContent = img.dataset.emoji;
      img.replaceWith(span);
    }, { once: true }));
  }

  // The unit's keyword ("ship" for sh), with its pattern highlighted; tap to hear it.
  keywordButton(tech) {
    if (!tech.keyword) return '';
    return wordButton(tech.keyword, highlightFocus(tech.keyword, tech.keywordFocus || []), 'keyword');
  }

  // ---------------- home ----------------
  renderHome() {
    const techniques = this.data.getTechniques();
    const next = this.state.nextStep(techniques);
    const due = this.state.getDueReviewKeys(99).length;
    const review = due ? `
      <button class="review-row" data-go="${routes.review()}">
        <span>🔁 مراجعة اليوم</span><span class="review-count">${due} ${due === 1 ? 'سؤال' : due === 2 ? 'سؤالان' : due <= 10 ? 'أسئلة' : 'سؤالاً'} ⬅</span>
      </button>` : '';

    const el = this.elements.home_view;
    el.innerHTML = `
      ${this.homeStats()}
      ${this.continueCard(next)}
      ${next ? this.skipLink(next.tech) : ''}
      ${review}
      <details class="all-units">
        <summary class="section-title"><span>كل الوحدات</span><span class="chev" aria-hidden="true">▾</span></summary>
        <ol class="unit-list">${this.unitRows(techniques, next)}</ol>
      </details>`;
    this.fallbackPictures(el);
    this.setHeader('دورة قراءة الكلمات', true);
    this.showView('home');
  }

  // On phones the header has no room for the chips, so home shows the same progress here, with labels (see styles.css).
  homeStats() {
    const words = this.state.countWordsLearned(this.data.getTechniques());
    const streak = this.state.userProgress.streak || 0;
    const items = [
      words >= MIN_WORDS_SHOWN ? `<span class="chip"><span aria-hidden="true">📚</span> كلمات تستطيع قراءتها: ${words}</span>` : '',
      streak >= 2 ? `<span class="chip"><span aria-hidden="true">🔥</span> أيام متتالية: ${streak}</span>` : ''
    ].filter(Boolean);
    return items.length ? `<div class="home-stats">${items.join('')}</div>` : '';
  }

  continueCard(next) {
    if (!next) {
      return `
        <section class="continue-card" aria-labelledby="continue-title">
          <h2 id="continue-title" class="continue-kicker">🎉 أنهيت الدورة!</h2>
          <p class="continue-done">أتقنت كل الوحدات. راجع ما تعلّمته كل يوم، أو أعد أي درس تريده.</p>
        </section>`;
    }
    const { tech, sub, step, index } = next;
    const fresh = !this.state.userProgress.lastLesson;
    const quizTried = step === 'quiz' && this.state.getScore(sub.id, 'quiz') !== undefined;
    return `
      <section class="continue-card" aria-labelledby="continue-title">
        <h2 id="continue-title" class="continue-kicker">${fresh ? 'ابدأ من هنا' : 'تابع من حيث توقّفت'}</h2>
        <div class="continue-unit">
          ${this.unitPicture(tech)}
          <div class="continue-meta">
            <div class="continue-unit-name">الوحدة ${index + 1} · ${ar(tech.name_ar)}</div>
            <div class="continue-lesson">${ar(sub.name)}</div>
          </div>
        </div>
        ${this.unitBar(tech)}
        <button class="btn-primary btn-lg btn-block" data-go="${routes.step(tech.id, sub.id, step)}">${quizTried ? 'أعد الاختبار' : STEP_START[step]} ⬅</button>
      </section>`;
  }

  // For learners who already know a unit: a short test that skips it (not shown once the unit is mastered).
  skipLink(tech) {
    if (this.state.getTechniqueProgress(tech.id).mastered) return '';
    return `<div class="skip-unit"><button class="btn-text" data-go="${routes.skip(tech.id)}">⏭️ أعرف هذه الوحدة — اختبرني</button></div>`;
  }

  // How much of a unit is done, as a thin bar (nothing before the first step).
  unitBar(tech) {
    const progress = this.state.getTechniqueProgress(tech.id);
    const done = tech.subSkills.reduce((n, s) => n + (progress.subSkills[s.id] || []).length, 0);
    const total = tech.subSkills.length * STEPS.length;
    return done && done < total
      ? `<span class="mini-bar" aria-hidden="true"><span style="width:${Math.round(done / total * 100)}%"></span></span>` : '';
  }

  // One line per open unit, and the first locked one; the other locked units stay out of sight.
  // A locked unit explains itself when tapped.
  unitRows(techniques, next) {
    const firstLocked = techniques.findIndex((_, i) => !this.state.isTechniqueUnlocked(i, techniques));
    return techniques.map((tech, i) => {
      const unlocked = this.state.isTechniqueUnlocked(i, techniques);
      if (!unlocked && i !== firstLocked) return '';
      const mastered = this.state.getTechniqueProgress(tech.id).mastered;
      const current = !!next && next.index === i;
      const status = mastered ? '✓' : !unlocked ? '🔒' : current ? '▸' : '';
      const statusText = mastered ? 'أُتقنت' : !unlocked ? 'مقفلة' : current ? 'الوحدة الحالية' : '';
      const cls = ['unit-row', mastered && 'is-mastered', !unlocked && 'is-locked', current && 'is-current'].filter(Boolean).join(' ');
      const action = unlocked ? `data-go="${routes.unit(tech.id)}"` : `data-locked="${i}" aria-disabled="true"`;
      return `
        <li>
          <button class="${cls}" ${action}>
            <span class="unit-status" aria-hidden="true">${status}</span>
            ${this.unitPicture(tech, 'sm')}
            <span class="unit-text">
              <span class="unit-num">الوحدة ${i + 1}${statusText ? `<span class="sr-only"> (${statusText})</span>` : ''}</span>
              <span class="unit-name">${ar(tech.name_ar)}</span>
              ${unlocked && !mastered ? this.unitBar(tech) : ''}
            </span>
          </button>
        </li>`;
    }).join('');
  }

  // ---------------- unit page ----------------
  // Returns false when the unit does not exist or is locked.
  renderUnit(techId) {
    const techniques = this.data.getTechniques();
    const index = techniques.findIndex(t => t.id === techId);
    const tech = techniques[index];
    if (!tech || !this.state.isTechniqueUnlocked(index, techniques)) return false;
    const next = this.state.nextStep(techniques);
    const target = next && next.tech.id === tech.id ? next : this.firstOpenInUnit(tech, index, techniques);
    const free = this.state.isUnitFree(index);

    const el = this.elements.unit_view;
    el.innerHTML = `
      <div class="unit-head">
        ${this.unitPicture(tech, 'lg')}
        <div class="unit-head-text">
          <p class="unit-num">الوحدة ${index + 1}</p>
          ${this.keywordButton(tech)}
          ${tech.intro ? `<p class="unit-intro">${ar(tech.intro)}</p>` : ''}
        </div>
      </div>
      ${free ? '<p class="unit-free-note">هذه الوحدة مفتوحة لك.</p>' : ''}
      ${this.unitBar(tech)}
      <ol class="lesson-list">${tech.subSkills.map(sub => this.lessonRow(tech, index, sub, target, techniques)).join('')}</ol>
      ${this.skipLink(tech)}`;
    this.fallbackPictures(el);
    this.setHeader(ar(tech.name_ar), false);
    this.showView('unit');
    return true;
  }

  firstOpenInUnit(tech, index, techniques) {
    for (const sub of tech.subSkills) {
      const step = this.state.firstOpenStep(tech.id, sub.id);
      if (step && this.state.isStepAvailable(index, techniques, sub.id, step)) return { tech, sub, step, index };
    }
    return null;
  }

  // One button per lesson: it opens the lesson's next step (or Learn again once the lesson is done).
  // The learn / practice / test steps are not shown; the lesson simply carries on from where it was left.
  lessonRow(tech, index, sub, target, techniques) {
    const isTarget = !!target && target.sub.id === sub.id;
    const open = this.state.firstOpenStep(tech.id, sub.id);
    const step = open && this.state.isStepAvailable(index, techniques, sub.id, open) ? open : 'learn';
    const started = STEPS.some(st => this.state.isStepComplete(tech.id, sub.id, st));
    const state = !open ? '<span aria-hidden="true">✓</span><span class="sr-only">(تمّ)</span>'
      : isTarget ? (started ? 'تابع ⬅' : 'ابدأ ⬅') : '';
    const cls = ['lesson-row', isTarget && 'is-current', !open && 'is-done'].filter(Boolean).join(' ');
    return `
      <li>
        <button class="${cls}" data-go="${routes.step(tech.id, sub.id, step)}">
          <span class="lesson-icon" aria-hidden="true">${sub.icon}</span>
          <span class="lesson-name">${ar(sub.name)}</span>
          <span class="lesson-state">${state}</span>
        </button>
      </li>`;
  }

  // ---------------- messages ----------------
  toast(message, ms = 4000) {
    const t = this.elements.toast;
    clearTimeout(this.toastTimer);
    t.classList.remove('show');
    t.textContent = '';
    // A new message in the live region is announced even when it repeats the last one.
    requestAnimationFrame(() => {
      t.innerHTML = ar(message);
      t.classList.add('show');
      this.toastTimer = setTimeout(() => t.classList.remove('show'), ms);
    });
  }

  // Resolves true (ok) or false (cancel, Escape, or a tap outside).
  confirm({ title, text, ok, cancel }) {
    const el = this.elements;
    if (isDialogOpen(el.confirm_dialog)) return Promise.resolve(false);
    return new Promise(resolve => {
      el.confirm_title.textContent = title;
      el.confirm_text.textContent = text;
      el.confirm_ok.textContent = ok;
      el.confirm_cancel.textContent = cancel;
      const done = value => {
        el.confirm_ok.onclick = el.confirm_cancel.onclick = el.confirm_dialog.onclick = null;
        closeDialog(el.confirm_dialog);
        resolve(value);
      };
      el.confirm_ok.onclick = () => done(true);
      el.confirm_cancel.onclick = () => done(false);
      el.confirm_dialog.onclick = e => { if (e.target === el.confirm_dialog) done(false); };
      openDialog(el.confirm_dialog, { onCancel: () => done(false), focus: el.confirm_cancel });
    });
  }
}
