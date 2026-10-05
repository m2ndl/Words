'use strict';
import { QuestionRenderer } from './questionRenderer.js';
import { ar, expandLearnMarkup, highlightFocus, highlightPart, diffHighlight, speakerButton, wordButton } from './textUtils.js';
import { soundOutButton, soundOut } from './soundOut.js';
import { openDialog, closeDialog, isDialogOpen } from './dialogs.js';
import { routes } from './router.js';

const STEP_TITLES = { learn: '📖 تعلّم', drill: '🎯 التمرين', quiz: '🏆 الاختبار', review: '🔁 المراجعة', placement: '🧭 تحديد المستوى' };
// Placement: per unit, 4 items from its quizzes; 3 or more correct moves on to the next unit.
const PLACEMENT_ITEMS = 4, PLACEMENT_PASS = 3;
// Leaving these before the end loses the result, so the learner is asked first.
const LEAVE_MESSAGES = {
    drill: { title: 'تخرج من التمرين؟', text: 'لن تُحفظ نتيجة هذا التمرين.', cancel: 'تابع التمرين', ok: 'نعم، اخرج' },
    quiz: { title: 'تخرج من الاختبار؟', text: 'لن تُحفظ نتيجة هذا الاختبار، وستبدؤه من جديد في المرة القادمة.', cancel: 'تابع الاختبار', ok: 'نعم، اخرج' },
    placement: { title: 'توقف تحديد المستوى؟', text: 'لن يُحفظ ما أجبته، وتستطيع أن تبدأه من جديد من القائمة.', cancel: 'تابع', ok: 'نعم، توقّف' }
};
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The core logic for running lessons, practice, tests, review and the placement check, inside the activity dialog.
// Every item gets one attempt. Scores count first attempts only; in practice a missed item comes back at the end.
// Each result screen's main button leads to the next step. `nav` (set by the app) moves between routes.
export class GameEngine {
    constructor(dataManager, stateManager, uiManager, audioManager, effectsManager) {
        this.data = dataManager;
        this.state = stateManager;
        this.ui = uiManager;
        this.audio = audioManager;
        this.effects = effectsManager;
        this.renderer = new QuestionRenderer(this.ui, this.audio, this, this.data);
        this.nav = { replace() {}, exit() {}, requestExit() {} };
        this.renderToken = 0;
    }

    shuffleArray(array) {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }

    isLocked() { return !!this.state.activitySession.locked; }

    // ---------------- the dialog ----------------
    // activity: { kind: learn|drill|quiz|review|placement, techId, subId }. Returns false if it cannot start.
    open(activity) {
        const el = this.ui.elements;
        this.audio.stop();
        this.effects.clearEffects();
        this.renderToken++;
        el.modal_feedback.innerHTML = '';
        el.modal_progress.innerHTML = '';
        el.modal_body.classList.remove('fade-out');
        let started;
        if (activity.kind === 'review') started = this.startReview();
        else if (activity.kind === 'placement') started = this.showPlacementIntro();
        else started = this.runActivity(activity.techId, activity.subId, activity.kind);
        if (!started) return false;
        if (!isDialogOpen(el.activity_modal)) openDialog(el.activity_modal, { onCancel: () => this.nav.requestExit(), focus: el.modal_title });
        else el.modal_title.focus({ preventScroll: true });
        return true;
    }

    close() {
        this.renderToken++;
        this.audio.stop();
        this.effects.clearEffects();
        closeDialog(this.ui.elements.activity_modal);
        this.state.activitySession = {};
    }

    // Starts the current activity again (retry a test or practice).
    restart() {
        const { techniqueId, subSkillId, step } = this.state.activitySession;
        this.open({ kind: step, techId: techniqueId, subId: subSkillId });
    }

    needsLeaveConfirm() {
        const s = this.state.activitySession;
        return !!LEAVE_MESSAGES[s.step] && !s.done && (s.results?.length || 0) > 0;
    }

    leaveMessage() {
        return LEAVE_MESSAGES[this.state.activitySession.step];
    }

    setTitle(stepTitle, lessonName = '') {
        this.ui.elements.modal_title.innerHTML = `<span class="mt-step">${ar(stepTitle)}</span>${lessonName ? `<span class="mt-lesson">${ar(lessonName)}</span>` : ''}`;
    }

    // The footer's buttons: main and secondary are { label, onClick, disabled } or null (hidden).
    setFooter(main = null, secondary = null) {
        const { modal_action_btn: mainBtn, modal_secondary_btn: secondBtn, modal_footer: footer } = this.ui.elements;
        const set = (btn, cfg) => {
            btn.classList.toggle('hidden', !cfg);
            btn.onclick = cfg ? cfg.onClick : null;
            if (!cfg) return;
            btn.innerHTML = ar(cfg.label);
            btn.disabled = !!cfg.disabled;
        };
        set(mainBtn, main);
        set(secondBtn, secondary);
        footer.classList.toggle('hidden', !main && !secondary);
    }

    setActionDisabled(disabled) {
        this.ui.elements.modal_action_btn.disabled = !!disabled;
    }

    dots(count, index) {
        return Array.from({ length: count }, (_, i) =>
            `<span class="progress-dot ${i < index ? 'done' : ''} ${i === index ? 'current' : ''}"></span>`).join('');
    }

    // ---------------- lessons ----------------
    runActivity(techniqueId, subSkillId, step) {
        const techniques = this.data.getTechniques();
        const index = techniques.findIndex(t => t.id === techniqueId);
        const subSkill = this.data.getSubSkill(techniqueId, subSkillId);
        if (!subSkill || !this.state.isStepAvailable(index, techniques, subSkillId, step)) return false;
        this.state.setLastLesson(techniqueId, subSkillId);
        this.state.activitySession = { techniqueId, subSkillId, step };
        if (step === 'learn') {
            this.renderLearn(subSkill, 0);
        } else {
            const data = step === 'drill' ? subSkill.drill : subSkill.quiz;
            const questions = data.questions.map(q => ({ ...q, techniqueId, subSkillId }));
            this.startSession(step, step === 'quiz' ? this.shuffleArray(questions) : questions);
        }
        return true;
    }

    // Learn comes in two short panels: the rule, then the examples. Closing it does not count it as done.
    renderLearn(subSkill, panel) {
        const el = this.ui.elements;
        this.state.activitySession.panel = panel;
        this.setTitle(STEP_TITLES.learn, subSkill.name);
        el.modal_progress.innerHTML = `<div class="q-dots learn-dots" aria-hidden="true">${this.dots(2, panel)}</div><span class="q-count">${panel + 1} من 2</span>`;
        el.modal_feedback.innerHTML = '';
        el.modal_body.innerHTML = panel === 0 ? this.learnRuleHTML(subSkill) : this.learnExamplesHTML(subSkill);
        el.modal_scroll.scrollTop = 0;
        if (panel === 0) {
            this.setFooter({ label: 'التالي: أمثلة ⬅', onClick: () => this.renderLearn(subSkill, 1) });
        } else {
            this.setFooter({ label: 'فهمت — ابدأ التمرين ⬅', onClick: () => this.finishLearn() },
                { label: '→ السابق', onClick: () => this.renderLearn(subSkill, 0) });
            el.modal_body.querySelector('.learn-panel')?.focus({ preventScroll: true });
        }
    }

    learnRuleHTML(subSkill) {
        return `<div class="learn-panel" tabindex="-1"><div class="learn-text">${expandLearnMarkup(subSkill.learn_info || '', subSkill.focus || [])}</div></div>`;
    }

    learnExamplesHTML(subSkill) {
        const focus = subSkill.focus || [];
        const gloss = w => ar(this.data.getGloss(w));
        const wordHTML = (w, other) => {
            // Show the lesson's pattern when the word has it (hate: a…e); otherwise the letters that differ (pin / bin).
            const withFocus = highlightFocus(w, focus);
            const shown = other && !withFocus.includes('<mark') ? diffHighlight(w, other) : withFocus;
            return `<div class="example-word">${wordButton(w, shown)}</div>
                    <div class="example-gloss">${gloss(w)} ${soundOutButton(this.audio, w)}</div>`;
        };
        const examplesHTML = (subSkill.examples || []).map(ex => {
            if (ex.mark) {
                return `<div class="example-card"><div class="example-word">${wordButton(ex.before, highlightPart(ex.before, ex.mark))}</div>
                        <div class="example-gloss">${gloss(ex.before)}</div></div>`;
            }
            if (ex.before === ex.after) return `<div class="example-card">${wordHTML(ex.before)}</div>`;
            const isPair = ex.kind === 'pair';
            return `<div class="example-card example-pair" dir="ltr">
                      <div>${wordHTML(ex.before, ex.after)}</div>
                      <span class="example-sign ${isPair ? 'is-ne' : 'is-arrow'}" aria-hidden="true">${isPair ? '≠' : '→'}</span>
                      <div>${wordHTML(ex.after, ex.before)}</div>
                    </div>`;
        }).join('');
        const title = subSkill.kind === 'heart' ? 'كلمات هذا الدرس — الجزء الملوّن هو الصعب. اضغط الكلمة لتسمعها:'
            : examplesHTML.includes('data-soundout') ? 'أمثلة — اضغط الكلمة لتسمعها، و🐢 لتسمعها صوتاً صوتاً:' : 'أمثلة — اضغط الكلمة لتسمعها:';
        return `<div class="learn-panel" tabindex="-1">
                  <h3 class="examples-title">${title}</h3>
                  <div class="examples-grid">${examplesHTML}</div>
                  ${subSkill.tip ? `<div class="learn-tip">💡 ${ar(subSkill.tip)}</div>` : ''}
                </div>`;
    }

    // "فهمت": Learn is done, and practice starts straight away.
    finishLearn() {
        const { techniqueId, subSkillId } = this.state.activitySession;
        this.state.markStepComplete(techniqueId, subSkillId, 'learn');
        this.state.activitySession.done = true;
        this.nav.replace(routes.step(techniqueId, subSkillId, 'drill'));
    }

    // ---------------- sessions ----------------
    // Generic session runner. Each question carries techniqueId/subSkillId so review and placement can mix lessons.
    startSession(step, questions, extra = {}) {
        const session = this.state.activitySession;
        const subSkill = session.subSkillId ? this.data.getSubSkill(session.techniqueId, session.subSkillId) : null;
        this.setTitle(STEP_TITLES[step] || '', subSkill?.name || '');
        this.setFooter(null);

        const cap = Math.max(this.state.difficultySettings.questionsPerSession, 1);
        let list = questions;
        if (step !== 'placement' && questions.length > cap) {
            // Practice keeps its authored order (read aloud → hear → build), so take a spread of items, not just the first ones.
            const keep = new Set(this.shuffleArray(questions.map((_, i) => i)).slice(0, cap));
            list = step === 'drill' ? questions.filter((_, i) => keep.has(i)) : questions.slice(0, cap);
        }
        Object.assign(session, {
            step,
            questions: list,
            total: list.length,
            currentIndex: 0,
            firstTryCorrect: 0,
            results: [],
            locked: false,
            done: false,
            ...extra
        });
        this.state.startSession();
        this.renderCurrentQuestion();
    }

    async renderCurrentQuestion() {
        const el = this.ui.elements;
        const container = el.modal_body;
        const session = this.state.activitySession;
        const token = ++this.renderToken;
        if (!reducedMotion() && container.innerHTML) {
            container.classList.add('fade-out');
            await new Promise(resolve => setTimeout(resolve, 200));
            if (token !== this.renderToken || this.state.activitySession !== session) return;
        }
        this.effects.clearEffects();
        session.locked = false;
        el.modal_feedback.innerHTML = '';
        this.setFooter(null);
        this.renderProgress();

        const q = session.questions[session.currentIndex];
        const sub = this.data.getSubSkill(q.techniqueId, q.subSkillId);
        this.renderer.render(q, sub);
        container.classList.remove('fade-out');
        el.modal_scroll.scrollTop = 0;
        container.querySelector('.q-prompt')?.focus({ preventScroll: true });
        this.preloadAudio();
    }

    renderProgress() {
        const s = this.state.activitySession;
        let dots, count;
        if (s.step === 'placement') {
            // Placement shows the current unit's block and which unit it is on.
            const blockSize = Math.min(PLACEMENT_ITEMS, s.questions.length - s.blockStart);
            dots = this.dots(blockSize, s.currentIndex - s.blockStart);
            count = `الوحدة ${s.placementUnit + 1} من ${this.data.getTechniques().length}`;
        } else {
            dots = this.dots(s.questions.length, s.currentIndex);
            count = `${s.currentIndex + 1} من ${s.questions.length}`;
        }
        this.ui.elements.modal_progress.innerHTML =
            `<div class="q-dots ${s.questions.length > 12 && s.step !== 'placement' ? 'many' : ''}" aria-hidden="true">${dots}</div><span class="q-count">${count}</span>`;
    }

    // Downloads the clips of this item and the next one, so they play without a wait.
    preloadAudio() {
        const s = this.state.activitySession;
        const texts = q => !q ? [] : q.type === 'sentence' ? [q.text]
            : [q.word, q.answer, q.audio, ...(['listen', 'read', 'odd'].includes(q.type) ? q.options : [])];
        this.audio.preload([...texts(s.questions[s.currentIndex]), ...texts(s.questions[s.currentIndex + 1])]);
    }

    // result: { correct, chosen, target, el, ... } reported by the renderer. One attempt per item.
    handleAnswer(result) {
        const session = this.state.activitySession;
        if (session.locked) return;
        session.locked = true;
        const q = session.questions[session.currentIndex];
        const sub = this.data.getSubSkill(q.techniqueId, q.subSkillId) || {};

        if (!q._requeued) {
            if (result.correct) session.firstTryCorrect++;
            session.results.push({ q, correct: !!result.correct });
        }
        const target = ['sort', 'build', 'say'].includes(q.type) ? q.word : q.type === 'sentence' ? q.text : q.answer;
        this.state.logResponse({
            tech: q.techniqueId, sub: q.subSkillId, step: session.step, qid: q.id, type: q.type,
            target, chosen: result.chosen, ok: !!result.correct
        });
        if (session.step === 'review') {
            this.state.updateReview(`${q.techniqueId}|${q.subSkillId}|${q.id}`, !!result.correct);
        }
        // Practice: a missed item comes back once at the end of the session.
        if (session.step === 'drill' && !result.correct && !q._requeued) {
            session.questions.push({ ...q, _requeued: true });
        }

        if (result.el && result.el.classList) {
            result.el.classList.add(result.correct ? 'correct' : 'incorrect');
        }
        if (!result.correct) this.revealCorrect(q);
        this.showFeedback(q, sub, result);
        if (result.correct) this.effects.playCorrectSound();
        else this.effects.playWrongSound();
        this.finishQuestion();
    }

    // Marks the right option after a wrong answer.
    revealCorrect(q) {
        const body = this.ui.elements.modal_body;
        const right = q.type === 'sort' ? String(q.answer)
            : q.type === 'sentence' ? q.options[q.answer]
            : q.type === 'fill' ? q.correct : q.answer;
        if (q.type === 'build' || q.type === 'say') return;
        body.querySelectorAll('.q-option').forEach(b => { if (b.dataset.value === right) b.classList.add('correct'); });
    }

    finishQuestion() {
        const session = this.state.activitySession;
        session.locked = true;
        const body = this.ui.elements.modal_body;
        body.querySelectorAll('.q-option, .q-self, .letter-box, .letter-choice').forEach(b => { b.disabled = true; });
        body.querySelectorAll('#build-clear, #build-hint').forEach(el => el.classList.add('hidden'));
        const last = session.currentIndex + 1 >= session.questions.length;
        this.setFooter({ label: last ? 'النتيجة ⬅' : 'التالي ⬅', onClick: () => this.nextQuestion() });
        this.ui.elements.modal_action_btn.focus({ preventScroll: true });
        if (this.state.difficultySettings.autoAdvance) {
            const index = session.currentIndex;
            setTimeout(() => { if (this.state.activitySession === session && session.currentIndex === index && session.locked && !session.done) this.nextQuestion(); }, 2200);
        }
    }

    nextQuestion() {
        const session = this.state.activitySession;
        if (!session.questions || session.done) return;
        if (session.step === 'placement' && this.placementCheckpoint()) return;
        session.currentIndex++;
        if (session.currentIndex < session.questions.length) this.renderCurrentQuestion();
        else this.endSession();
    }

    // Explains the answer: plays the words, highlights the letters that differ, and repeats the rule.
    showFeedback(q, sub, result) {
        const feedbackEl = this.ui.elements.modal_feedback;
        const gloss = w => ar(this.data.getGloss(w));
        const focus = sub.focus || [];
        // Odd one out compares different words: show the lesson's pattern rather than "the letters that differ".
        const wordLine = (w, other) => {
            const inner = other && q.type !== 'odd' ? diffHighlight(w, other) : highlightFocus(w, focus);
            return `${wordButton(w, inner, 'fb-word')}${soundOutButton(this.audio, w)}<span class="fb-gloss">${gloss(w)}</span>`;
        };
        const tip = sub.tip ? `<div class="fb-tip">💡 ${ar(sub.tip)}</div>` : '';
        const wordButtonIn = selector => feedbackEl.querySelector(`${selector} .word-btn`);
        let html, after = null;

        if (result.selfCheck) {
            html = result.correct
                ? `<div class="feedback ok"><div class="fb-title">✅ ممتاز!</div></div>`
                : `<div class="feedback bad"><div class="fb-title">لا بأس — ستعود هذه الكلمة في آخر التمرين.</div>${tip}</div>`;
        } else if (q.type === 'sentence') {
            html = result.correct
                ? `<div class="feedback ok"><div class="fb-title">${ar(this.data.getRandomEncouragement())}</div><div class="fb-row">${speakerButton(q.text)}<span>${ar(result.correctMeaning)}</span></div></div>`
                : `<div class="feedback bad"><div class="fb-title">ليس هذا المعنى</div>
                     <div class="fb-row">${speakerButton(q.text)}<span>المعنى الصحيح: <b>${ar(result.correctMeaning)}</b></span></div>
                     <div class="fb-tip">💡 اقرأ كل كلمة من اليسار إلى اليمين، ثم اختر.</div></div>`;
            after = () => this.audio.speak(q.text, { el: feedbackEl.querySelector('.speaker-btn') });
        } else if (q.type === 'sort') {
            html = result.correct
                ? `<div class="feedback ok"><div class="fb-title">${ar(this.data.getRandomEncouragement())}</div><div class="fb-row">${wordLine(q.word)}</div></div>`
                : `<div class="feedback bad"><div class="fb-title">الإجابة: ${ar(result.correctLabel)}</div>
                     <div class="fb-row">${wordLine(q.word)}</div>${tip}</div>`;
            after = () => this.audio.speak(q.word, { el: wordButtonIn('.fb-row') });
        } else {
            const target = result.target;
            const chosen = result.chosen;
            if (result.correct) {
                html = `<div class="feedback ok"><div class="fb-title">${ar(this.data.getRandomEncouragement())}</div><div class="fb-row">${wordLine(target)}</div></div>`;
                if (q.type !== 'listen') after = () => this.audio.speak(target, { el: wordButtonIn('.fb-row') });
            } else {
                html = `<div class="feedback bad"><div class="fb-title">ليس هذا — قارِن:</div>
                          <div class="fb-row fb-chosen"><span class="fb-label">اخترتَ:</span>${wordLine(chosen, target)}</div>
                          <div class="fb-row fb-target"><span class="fb-label">الصحيح:</span>${wordLine(target, chosen)}</div>
                          ${tip}</div>`;
                // Replay the learner's choice only when it is a real word (not a half-built word),
                // then sound the right word out (c – a – t … cat) while its letters light up.
                const chosenWord = q.type !== 'build' && this.data.getGloss(chosen) ? chosen : null;
                const sayTarget = () => {
                    const button = wordButtonIn('.fb-target');
                    const wordEl = feedbackEl.querySelector('.fb-target [data-word]');
                    if (!soundOut(this.audio, target, wordEl, null, button)) this.audio.speak(target, { el: button });
                };
                after = chosenWord
                    ? () => this.audio.speak(chosenWord, { el: wordButtonIn('.fb-chosen'), onend: () => setTimeout(sayTarget, 350) })
                    : sayTarget;
            }
        }
        feedbackEl.innerHTML = html;
        if (after) after();
        feedbackEl.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    }

    // Shows a result screen inside the dialog; its main button is the next step.
    showResult({ emoji, title, score = '', advice = '', main = null, secondary = null }) {
        const el = this.ui.elements;
        const session = this.state.activitySession;
        session.done = true;
        session.locked = true;
        el.modal_progress.innerHTML = '';
        el.modal_feedback.innerHTML = '';
        el.modal_body.classList.remove('fade-out');
        el.modal_body.innerHTML = `
            <div class="result" tabindex="-1">
                <div class="result-emoji" aria-hidden="true">${emoji}</div>
                <h3 class="result-title">${ar(title)}</h3>
                ${score ? `<p class="result-score">${ar(score)}</p>` : ''}
                ${advice ? `<p class="result-advice">${ar(advice)}</p>` : ''}
            </div>`;
        el.modal_scroll.scrollTop = 0;
        this.setFooter(main, secondary);
        el.modal_body.querySelector('.result').focus({ preventScroll: true });
        this.ui.updateChips();
    }

    // The next lesson in this unit with a step to do (after this one, then from the start).
    nextInUnit(tech, current) {
        const techniques = this.data.getTechniques();
        const index = techniques.indexOf(tech);
        const subs = tech.subSkills;
        const at = subs.indexOf(current);
        for (const sub of [...subs.slice(at + 1), ...subs.slice(0, at)]) {
            const step = this.state.firstOpenStep(tech.id, sub.id);
            if (step && this.state.isStepAvailable(index, techniques, sub.id, step)) return { sub, step };
        }
        return null;
    }

    // ---------------- review ----------------
    startReview() {
        const keys = this.state.getDueReviewKeys();
        const questions = keys.map(key => {
            const [techniqueId, subSkillId, qid] = key.split('|');
            const q = this.data.findQuestion(techniqueId, subSkillId, qid);
            return q ? { ...q, techniqueId, subSkillId } : null;
        }).filter(Boolean);
        if (!questions.length) {
            this.ui.toast('لا توجد كلمات للمراجعة الآن. عُد غداً.');
            return false;
        }
        this.state.activitySession = { techniqueId: null, subSkillId: null };
        this.startSession('review', this.shuffleArray(questions));
        return true;
    }

    // ---------------- placement check ----------------
    showPlacementIntro() {
        const el = this.ui.elements;
        this.state.activitySession = { step: 'placement-intro' };
        this.setTitle(STEP_TITLES.placement);
        el.modal_body.innerHTML = `
            <div class="result-panel" tabindex="-1">
                <p><b>نعرف معاً من أين تبدأ.</b> نسألك عن الوحدات بالترتيب، من الأسهل إلى الأصعب: أربعة أسئلة لكل وحدة.</p>
                <p>إذا أجبت ثلاثة منها صحيحاً ننتقل إلى الوحدة التالية، وإلا نقترح عليك أن تبدأ منها.</p>
                <p>يستغرق ذلك عشر دقائق على الأكثر، وتستطيع أن تتوقّف متى شئت.</p>
            </div>`;
        el.modal_scroll.scrollTop = 0;
        this.setFooter({ label: 'ابدأ ⬅', onClick: () => this.startPlacement() });
        return true;
    }

    startPlacement() {
        this.state.activitySession = { techniqueId: null, subSkillId: null };
        this.startSession('placement', this.placementItems(1), { placementUnit: 1, blockStart: 0 });
    }

    placementItems(unitIndex) {
        const tech = this.data.getTechniques()[unitIndex];
        if (!tech) return [];
        const pool = [];
        tech.subSkills.filter(s => s.kind !== 'heart').forEach(s => {
            s.quiz.questions.filter(q => q.type === 'read' || q.type === 'listen' || q.type === 'sentence')
                .forEach(q => pool.push({ ...q, techniqueId: tech.id, subSkillId: s.id }));
        });
        return this.shuffleArray(pool).slice(0, PLACEMENT_ITEMS);
    }

    // At the end of each unit block: continue to the next unit, or stop and place the learner.
    placementCheckpoint() {
        const s = this.state.activitySession;
        const blockEnd = s.blockStart + PLACEMENT_ITEMS - 1;
        if (s.currentIndex < blockEnd && s.currentIndex < s.questions.length - 1) return false;
        const block = s.results.slice(s.blockStart, s.blockStart + PLACEMENT_ITEMS);
        const right = block.filter(r => r.correct).length;
        const techniques = this.data.getTechniques();
        if (right >= PLACEMENT_PASS && s.placementUnit + 1 < techniques.length) {
            const next = this.placementItems(s.placementUnit + 1);
            s.placementUnit += 1;
            s.blockStart = s.results.length;
            s.questions.push(...next);
            s.total = s.questions.length;
            return false;
        }
        // Weak on short-vowel words (unit 1): start with the letter-sound bridge (unit 0).
        const startUnit = right >= PLACEMENT_PASS ? techniques.length - 1 : (s.placementUnit === 1 ? 0 : s.placementUnit);
        this.finishPlacement(startUnit);
        return true;
    }

    finishPlacement(startUnit) {
        const techniques = this.data.getTechniques();
        this.state.setPlacement(startUnit);
        const tech = techniques[startUnit];
        const number = startUnit + 1;
        this.showResult({
            emoji: '🧭',
            title: 'نتيجة تحديد المستوى',
            score: startUnit === 0
                ? `ننصحك بالبدء من الوحدة 1 (${tech.name_ar}) لتثبيت الأساس.`
                : `ننصحك بالبدء من الوحدة ${number}: ${tech.name_ar}.`,
            advice: startUnit === 0 ? '' : 'فُتحت لك الوحدات التي قبلها، وتستطيع أن تبدأ فيها بالاختبار مباشرةً.',
            main: { label: `ابدأ الوحدة ${number} ⬅`, onClick: () => this.nav.replace(routes.unit(tech.id)) }
        });
    }

    // ---------------- end of a session ----------------
    endSession() {
        const session = this.state.activitySession;
        const { techniqueId, subSkillId, step } = session;

        if (step === 'placement') {
            this.finishPlacement(Math.min(session.placementUnit + 1, this.data.getTechniques().length - 1));
            return;
        }

        const total = session.results.length || 1;
        const right = session.firstTryCorrect;
        const pct = Math.round((right / total) * 100);
        const scoreLine = `${right} من ${total} صحيحة من أول محاولة (${pct}%)`;

        if (step === 'review') {
            this.showResult({
                emoji: '🔁', title: 'أنهيت المراجعة', score: scoreLine,
                advice: 'ستعود الكلمات الصعبة في مراجعة قريبة.',
                main: { label: 'تم ✓', onClick: () => this.nav.exit() }
            });
            return;
        }

        const technique = this.data.getTechnique(techniqueId);
        const subSkill = this.data.getSubSkill(techniqueId, subSkillId);
        const stepRoute = st => routes.step(techniqueId, subSkillId, st);
        const backToUnit = { label: 'رجوع إلى الوحدة', onClick: () => this.nav.exit() };
        this.state.recordScore(subSkillId, step, right / total);

        if (step === 'drill') {
            this.state.markStepComplete(techniqueId, subSkillId, 'drill');
            const ready = pct >= 60;
            if (pct >= 80) this.effects.soundManager.playSuccessSound();
            this.showResult({
                emoji: pct >= 80 ? '🎯' : '📖',
                title: pct >= 80 ? 'أحسنت!' : 'أنهيت التمرين',
                score: scoreLine,
                advice: ready ? 'أنت جاهز للاختبار.' : 'راجع الدرس، ثم أعد التمرين قبل الاختبار.',
                main: ready ? { label: 'ابدأ الاختبار ⬅', onClick: () => this.nav.replace(stepRoute('quiz')) }
                    : { label: '📖 راجع الدرس', onClick: () => this.nav.replace(stepRoute('learn')) },
                secondary: ready ? backToUnit : { label: 'أعد التمرين', onClick: () => this.restart() }
            });
            return;
        }

        // quiz
        const passMark = this.state.difficultySettings.passingScore;
        if (right / total < passMark) {
            this.showResult({
                emoji: '💪',
                title: 'لم تنجح هذه المرة',
                score: `نتيجتك: ${scoreLine}. تحتاج ${Math.round(passMark * 100)}% للنجاح.`,
                advice: 'راجع الدرس، ثم أعد الاختبار.',
                main: { label: '📖 راجع الدرس', onClick: () => this.nav.replace(stepRoute('learn')) },
                secondary: { label: 'أعد الاختبار', onClick: () => this.restart() }
            });
            return;
        }

        this.state.markStepComplete(techniqueId, subSkillId, 'quiz');
        this.state.addToReview(subSkill.quiz.questions.map(q => `${techniqueId}|${subSkillId}|${q.id}`));
        const techniques = this.data.getTechniques();
        const index = techniques.indexOf(technique);
        const masteredNow = technique.subSkills.every(ss => this.state.isStepComplete(techniqueId, ss.id, 'quiz'))
            && !this.state.getTechniqueProgress(techniqueId).mastered;
        if (masteredNow) this.state.markTechniqueMastered(techniqueId);
        this.effects.createCelebrationBurst();

        if (masteredNow) {
            const nextTech = techniques[index + 1];
            this.showResult({
                emoji: '🏆',
                title: `أتقنت وحدة «${technique.name_ar}»!`,
                score: `نجحت في الاختبار: ${scoreLine}.`,
                advice: nextTech ? `فُتحت الوحدة ${index + 2}: ${nextTech.name_ar}.` : 'أنهيت كل وحدات الدورة. واصل المراجعة اليومية لتثبّت ما تعلّمته.',
                main: nextTech ? { label: 'الوحدة التالية ⬅', onClick: () => this.nav.replace(routes.unit(nextTech.id)) }
                    : { label: 'الصفحة الرئيسية', onClick: () => this.nav.replace(routes.home()) },
                secondary: backToUnit
            });
            return;
        }

        const next = this.nextInUnit(technique, subSkill);
        this.showResult({
            emoji: '✅',
            title: 'نجحت في الاختبار!',
            score: scoreLine,
            advice: next ? `أُضيفت كلمات هذا الدرس إلى مراجعتك اليومية. الدرس التالي: ${next.sub.name}` : 'أُضيفت كلمات هذا الدرس إلى مراجعتك اليومية.',
            main: next ? { label: 'الدرس التالي ⬅', onClick: () => this.nav.replace(routes.step(techniqueId, next.sub.id, next.step)) } : backToUnit,
            secondary: next ? backToUnit : null
        });
    }
}
