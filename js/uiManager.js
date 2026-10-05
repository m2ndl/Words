'use strict';
import { escapeHtml, ar, en, highlightFocus, wordButton } from './textUtils.js';
import { openDialog, closeDialog, isDialogOpen } from './dialogs.js';
import { routes } from './router.js';

const STEP_INFO = {
  learn: { icon: '📖', label: 'تعلّم', start: 'ابدأ التعلّم' },
  drill: { icon: '🎯', label: 'تمرين', start: 'ابدأ التمرين' },
  quiz: { icon: '🏆', label: 'اختبار', start: 'ابدأ الاختبار' }
};
const STEPS = ['learn', 'drill', 'quiz'];
const LOCK_REASON = { drill: 'بعد التعلّم', quiz: 'بعد التمرين' };
// The "words you can read" chip appears once the learner can read this many words.
const MIN_WORDS_SHOWN = 5;
const pct = score => Math.round(score * 100);

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
      'boot', 'boot-loading', 'boot-error', 'boot-actions', 'boot-retry', 'start-btn', 'placement-start-btn',
      'app', 'nav-btn', 'nav-icon', 'main-title', 'words-chip', 'words-count', 'streak-chip', 'streak-count',
      'home-view', 'unit-view', 'progress-view', 'note-view',
      'activity-modal', 'modal-title', 'modal-close-btn', 'modal-progress', 'modal-scroll', 'modal-body', 'modal-feedback',
      'modal-footer', 'modal-action-btn', 'modal-secondary-btn',
      'confirm-dialog', 'confirm-title', 'confirm-text', 'confirm-ok', 'confirm-cancel',
      'side-menu', 'menu-unlock', 'toast'
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
    const passedAny = techniques.some(t => t.subSkills.some(s => this.state.isStepComplete(t.id, s.id, 'quiz')));
    const notice = this.state.showUpdateNotice() ? `
      <div class="home-notice" role="note">
        <p>تمّ تحديث الدورة: أُعيد ترتيبها لتبدأ بأصوات الحروف والكلمات القصيرة، وأُضيفت الجمل والكلمات الشائعة والمراجعة. حدّد مستواك لتبدأ من الوحدة المناسبة لك.</p>
        <button class="icon-btn" data-dismiss-notice aria-label="إغلاق التنبيه"><span aria-hidden="true">✕</span></button>
      </div>` : '';
    const review = due ? `
      <button class="review-row" data-go="${routes.review()}">
        <span>🔁 مراجعة اليوم</span><span class="review-count">${due} ${due === 1 ? 'سؤال' : due === 2 ? 'سؤالان' : due <= 10 ? 'أسئلة' : 'سؤالاً'} ⬅</span>
      </button>` : '';
    const placement = !this.state.userProgress.placementDone && !passedAny
      ? `<div class="home-links"><button class="link-btn" data-go="${routes.placement()}">🧭 أعرف بعض القراءة — حدّد مستواي</button></div>` : '';

    const el = this.elements.home_view;
    el.innerHTML = `
      ${notice}
      ${this.continueCard(next)}
      ${review}
      ${placement}
      <h2 class="section-title">الوحدات</h2>
      <ol class="unit-list">${this.unitRows(techniques, next)}</ol>`;
    this.fallbackPictures(el);
    this.setHeader('دورة قراءة الكلمات', true);
    this.showView('home');
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
    const track = STEPS.map(st => {
      const done = this.state.isStepComplete(tech.id, sub.id, st);
      const cls = st === step ? 'is-next' : done ? 'is-done' : '';
      return `<li class="${cls}"><span aria-hidden="true">${STEP_INFO[st].icon}</span> ${STEP_INFO[st].label}${done ? ' <span aria-hidden="true">✓</span><span class="sr-only">(تمّ)</span>' : ''}</li>`;
    }).join('');
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
        <ol class="step-track" aria-label="خطوات الدرس">${track}</ol>
        <button class="btn-primary btn-lg btn-block" data-go="${routes.step(tech.id, sub.id, step)}">${quizTried ? 'أعد الاختبار' : STEP_INFO[step].start} ⬅</button>
      </section>`;
  }

  // One line per unit: status, picture, name and progress. A locked unit explains itself when tapped.
  unitRows(techniques, next) {
    return techniques.map((tech, i) => {
      const unlocked = this.state.isTechniqueUnlocked(i, techniques);
      const progress = this.state.getTechniqueProgress(tech.id);
      const done = tech.subSkills.reduce((n, s) => n + (progress.subSkills[s.id] || []).length, 0);
      const total = tech.subSkills.length * STEPS.length;
      const mastered = progress.mastered;
      const current = !!next && next.index === i;
      const status = mastered ? '✓' : !unlocked ? '🔒' : current ? '▸' : '';
      const statusText = mastered ? 'أُتقنت' : !unlocked ? 'مقفلة' : current ? 'الوحدة الحالية' : '';
      const cls = ['unit-row', mastered && 'is-mastered', !unlocked && 'is-locked', current && 'is-current'].filter(Boolean).join(' ');
      const action = unlocked ? `data-go="${routes.unit(tech.id)}"` : `data-locked="${i}" aria-disabled="true"`;
      const bar = unlocked && !mastered && done
        ? `<span class="mini-bar" aria-hidden="true"><span style="width:${Math.round(done / total * 100)}%"></span></span>` : '';
      return `
        <li>
          <button class="${cls}" ${action}>
            <span class="unit-status" aria-hidden="true">${status}</span>
            ${this.unitPicture(tech, 'sm')}
            <span class="unit-text">
              <span class="unit-num">الوحدة ${i + 1}${statusText ? `<span class="sr-only"> (${statusText})</span>` : ''}</span>
              <span class="unit-name">${ar(tech.name_ar)}</span>
              <span class="unit-en">${en(tech.name)}</span>
              ${bar}
            </span>
            <span class="unit-count"><span class="sr-only">الخطوات المنجزة: </span>${done}/${total}</span>
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
          <p class="unit-num">الوحدة ${index + 1} · ${en(tech.name)}</p>
          ${this.keywordButton(tech)}
          ${tech.intro ? `<p class="unit-intro">${ar(tech.intro)}</p>` : ''}
        </div>
      </div>
      ${free ? '<p class="unit-free-note">هذه الوحدة مفتوحة لك: إن كنت تعرفها فابدأ بالاختبار مباشرةً.</p>' : ''}
      <ol class="lesson-list">${tech.subSkills.map(sub => this.lessonCard(tech, index, sub, target, techniques)).join('')}</ol>`;
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

  lessonCard(tech, index, sub, target, techniques) {
    const isTarget = !!target && target.sub.id === sub.id;
    const steps = STEPS.map(step => this.stepButton(tech, index, sub, step, isTarget && target.step === step, techniques)).join('');
    return `
      <li class="lesson-card${isTarget ? ' is-current' : ''}">
        <h2 class="lesson-title"><span class="lesson-icon" aria-hidden="true">${sub.icon}</span><span>${ar(sub.name)}</span></h2>
        <div class="steps" role="group" aria-label="خطوات الدرس">${steps}</div>
      </li>`;
  }

  // The next step is the main button; done steps show ✓ (and the score); locked steps say why.
  stepButton(tech, index, sub, step, isNext, techniques) {
    const info = STEP_INFO[step];
    const done = this.state.isStepComplete(tech.id, sub.id, step);
    const available = this.state.isStepAvailable(index, techniques, sub.id, step);
    const score = step === 'learn' ? undefined : this.state.getScore(sub.id, step);
    let cls = 'step', state = '';
    if (!available) state = `🔒 ${LOCK_REASON[step]}`;
    else if (isNext) { cls += ' is-next'; state = score !== undefined ? `${pct(score)}% · أعد` : 'ابدأ'; }
    else if (done) { cls += ' is-done'; state = score !== undefined ? `✓ ${pct(score)}%` : '✓ تمّ'; }
    else if (score !== undefined) { cls += ' is-retry'; state = `${pct(score)}%`; }
    const attrs = available ? `data-go="${routes.step(tech.id, sub.id, step)}"` : 'disabled';
    return `<button class="${cls}" ${attrs}><span class="step-icon" aria-hidden="true">${info.icon}</span><span class="step-label">${info.label}</span><span class="step-state">${state}</span></button>`;
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
