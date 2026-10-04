'use strict';
import { QuestionRenderer } from './questionRenderer.js';
import { escapeHtml, expandLearnMarkup, highlightFocus, highlightPart, diffHighlight, speakerButton } from './textUtils.js';
import { soundOutButton, soundOut } from './soundOut.js';

const STEP_TITLES = { drill: '🎯 التمرين', quiz: '🏆 الاختبار', review: '🔁 المراجعة', placement: '🧭 تحديد المستوى' };
// Placement: per unit, 4 items from its quizzes; 3 or more correct moves on to the next unit.
const PLACEMENT_ITEMS = 4, PLACEMENT_PASS = 3;

// The core logic for running lessons, practice, tests, review and the placement check.
// Scores count first attempts only; practice lets the learner retry, tests do not.
export class GameEngine {
    constructor(dataManager, stateManager, uiManager, audioManager, effectsManager) {
        this.data = dataManager;
        this.state = stateManager;
        this.ui = uiManager;
        this.audio = audioManager;
        this.effects = effectsManager;
        this.renderer = new QuestionRenderer(this.ui, this.audio, this, this.data);
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

    runActivity(techniqueId, subSkillId, step) {
        // Clear any lingering effects when starting an activity
        this.effects.clearEffects();

        const subSkill = this.data.getSubSkill(techniqueId, subSkillId);
        if (!subSkill) return;

        this.state.activitySession = { techniqueId, subSkillId, step };
        this.ui.elements.modal_progress.innerHTML = '';
        this.ui.elements.modal_feedback.innerHTML = '';
        this.ui.elements.modal_exit_btn.style.display = 'none';
        this.ui.elements.modal_action_btn.style.display = 'inline-block';
        this.ui.elements.modal_action_btn.onclick = null;

        if (step === 'learn') {
            this.renderLearnActivity(subSkill);
        } else {
            const data = step === 'drill' ? subSkill.drill : subSkill.quiz;
            const questions = data.questions.map(q => ({ ...q, techniqueId, subSkillId }));
            this.startSession(step, step === 'quiz' ? this.shuffleArray(questions) : questions);
        }
        this.ui.showModal();
    }

    renderLearnActivity(subSkill) {
        const focus = subSkill.focus || [];
        this.ui.elements.modal_title.innerHTML = `<span class="text-4xl ml-3">${subSkill.icon}</span> ${escapeHtml(subSkill.name)}`;
        this.ui.elements.modal_action_btn.textContent = "فهمت! 💪";
        this.ui.elements.modal_action_btn.onclick = () => this.endSession();

        const explanationHTML = `<div class="learn-text">${expandLearnMarkup(subSkill.learn_info || '', focus)}</div>`;
        const wordHTML = (w, other) => {
            // Show the lesson's pattern when the word has it (hate: a…e); otherwise the letters that differ (pin / bin).
            const withFocus = highlightFocus(w, focus);
            const shown = other && !withFocus.includes('<mark') ? diffHighlight(w, other) : withFocus;
            return `<div class="example-word" dir="ltr">${speakerButton(w, 'md')}<span class="english-font" data-word="${escapeHtml(w)}">${shown}</span></div>
                    <div class="example-gloss">${escapeHtml(this.data.getGloss(w))} ${soundOutButton(this.audio, w)}</div>`;
        };
        const examplesHTML = (subSkill.examples || []).map(ex => {
            if (ex.mark) {
                return `<div class="example-card"><div class="example-word" dir="ltr">${speakerButton(ex.before, 'md')}<span class="english-font">${highlightPart(ex.before, ex.mark)}</span></div>
                        <div class="example-gloss">${escapeHtml(this.data.getGloss(ex.before))}</div></div>`;
            }
            if (ex.before === ex.after) return `<div class="example-card">${wordHTML(ex.before)}</div>`;
            const sign = ex.kind === 'pair' ? '≠' : '→';
            return `<div class="example-card example-pair" dir="ltr">
                      <div>${wordHTML(ex.before, ex.after)}</div>
                      <span class="transformation-arrow">${sign}</span>
                      <div>${wordHTML(ex.after, ex.before)}</div>
                    </div>`;
        }).join('');

        this.ui.elements.modal_body.innerHTML = `
            ${explanationHTML}
            <h3 class="examples-title">${subSkill.kind === 'heart' ? 'كلمات هذا الدرس — الجزء الملوّن هو الصعب:'
                : examplesHTML.includes('data-soundout') ? 'أمثلة — اضغط 🔊 لتسمع الكلمة، و🐢 لتسمعها صوتاً صوتاً:' : 'أمثلة — اضغط 🔊 لتسمع:'}</h3>
            <div class="examples-grid">${examplesHTML}</div>
            ${subSkill.tip ? `<div class="learn-tip">💡 ${escapeHtml(subSkill.tip)}</div>` : ''}
        `;
    }

    // Generic session runner. Each question carries techniqueId/subSkillId so review and placement can mix lessons.
    startSession(step, questions, extra = {}) {
        this.ui.elements.modal_title.textContent = STEP_TITLES[step] || '';
        this.ui.elements.modal_action_btn.style.display = 'none';
        this.ui.elements.modal_exit_btn.style.display = 'inline-block';

        const cap = Math.max(this.state.difficultySettings.questionsPerSession, 1);
        let list = questions;
        if (step !== 'placement' && questions.length > cap) {
            // Practice keeps its authored order (read aloud → hear → build), so take a spread of items, not just the first ones.
            const keep = new Set(this.shuffleArray(questions.map((_, i) => i)).slice(0, cap));
            list = step === 'drill' ? questions.filter((_, i) => keep.has(i)) : questions.slice(0, cap);
        }
        Object.assign(this.state.activitySession, {
            step,
            questions: list,
            total: list.length,
            currentIndex: 0,
            firstTryCorrect: 0,
            results: [],
            locked: false,
            ...extra
        });
        this.state.startSession();
        this.renderCurrentQuestion();
    }

    async renderCurrentQuestion() {
        const container = this.ui.elements.modal_body;
        container.classList.add('fade-out');
        await new Promise(resolve => setTimeout(resolve, 250));
        this.effects.clearEffects();

        const session = this.state.activitySession;
        const { questions, currentIndex } = session;
        session.locked = false;
        this.ui.elements.modal_feedback.innerHTML = '';
        this.ui.elements.modal_action_btn.style.display = 'none';
        this.ui.elements.modal_progress.innerHTML = `<div class="q-dots ${questions.length > 12 ? 'many' : ''}">${questions.map((_, i) =>
            `<span class="progress-dot ${i < currentIndex ? 'completed' : ''} ${i === currentIndex ? 'pulse' : ''}"></span>`).join('')}</div>`;

        const q = questions[currentIndex];
        const sub = this.data.getSubSkill(q.techniqueId, q.subSkillId);
        this.renderer.render(q, sub);
        container.classList.remove('fade-out');
    }

    // result: { correct, chosen, target, el, ... } reported by the renderer.
    handleAnswer(result) {
        const session = this.state.activitySession;
        if (session.locked) return;
        const q = session.questions[session.currentIndex];
        const sub = this.data.getSubSkill(q.techniqueId, q.subSkillId) || {};
        const firstTry = !q._tried;
        q._tried = true;
        const practice = session.step === 'drill';

        if (firstTry) {
            if (result.correct && !q._requeued) session.firstTryCorrect++;
            if (!q._requeued) session.results.push({ q, correct: result.correct });
            const target = ['sort', 'build', 'say'].includes(q.type) ? q.word : q.type === 'sentence' ? q.text : q.answer;
            this.state.logResponse({
                tech: q.techniqueId, sub: q.subSkillId, step: session.step, qid: q.id, type: q.type,
                target, chosen: result.chosen, ok: !!result.correct
            });
            if (session.step === 'review') {
                this.state.updateReview(`${q.techniqueId}|${q.subSkillId}|${q.id}`, !!result.correct);
            }
            // Practice: a missed item comes back once at the end of the session.
            if (practice && !result.correct && !q._requeued) {
                session.questions.push({ ...q, _tried: false, _requeued: true });
            }
        }

        if (result.el && result.el.classList) {
            result.el.classList.add(result.correct ? 'correct' : 'incorrect');
        }
        this.showFeedback(q, sub, result);

        if (result.correct) {
            this.effects.createQuickCelebration();
            this.finishQuestion();
        } else {
            this.effects.playWrongSound();
            if (practice && !result.selfCheck) {
                // Practice: the learner can try again; the wrong option is switched off.
                if (result.el && result.el.classList?.contains('option-button')) result.el.disabled = true;
            } else {
                this.revealCorrect(q, result);
                this.finishQuestion();
            }
        }
    }

    // Marks the right option after a wrong answer in a test.
    revealCorrect(q, result) {
        const body = this.ui.elements.modal_body;
        if (q.type === 'sort') {
            const btn = body.querySelector(`.q-option[data-value="${q.answer}"]`);
            if (btn) btn.classList.add('correct');
        } else if (q.type === 'sentence') {
            body.querySelectorAll('.q-option').forEach(b => { if (b.dataset.value === q.options[q.answer]) b.classList.add('correct'); });
        } else if (q.type === 'fill') {
            body.querySelectorAll('.q-option').forEach(b => { if (b.dataset.value === q.correct) b.classList.add('correct'); });
        } else if (q.type !== 'build' && q.type !== 'say') {
            body.querySelectorAll('.q-option').forEach(b => { if (b.dataset.value === q.answer) b.classList.add('correct'); });
        }
    }

    finishQuestion() {
        const session = this.state.activitySession;
        session.locked = true;
        this.ui.elements.modal_body.querySelectorAll('.q-option, .q-self').forEach(b => { b.disabled = true; });
        const btn = this.ui.elements.modal_action_btn;
        btn.style.display = 'inline-block';
        const last = session.currentIndex + 1 >= session.questions.length;
        btn.textContent = last ? 'إنهاء 🎉' : 'التالي ⬅️';
        btn.onclick = () => this.nextQuestion();
        if (this.state.difficultySettings.autoAdvance) {
            const index = session.currentIndex;
            setTimeout(() => { if (this.state.activitySession.currentIndex === index && this.state.activitySession.locked) this.nextQuestion(); }, 2200);
        }
    }

    nextQuestion() {
        const session = this.state.activitySession;
        if (!session.questions) return;
        if (session.step === 'placement' && this.placementCheckpoint()) return;
        session.currentIndex++;
        if (session.currentIndex < session.questions.length) this.renderCurrentQuestion();
        else this.endSession();
    }

    // Explains the answer: plays the words, highlights the letters that differ, and repeats the rule.
    showFeedback(q, sub, result) {
        const gloss = w => escapeHtml(this.data.getGloss(w));
        const wordLine = (w, other) =>
            `<span class="fb-word english-font" dir="ltr" data-word="${escapeHtml(w)}">${other ? diffHighlight(w, other) : highlightFocus(w, sub.focus || [])}</span>${speakerButton(w)}${soundOutButton(this.audio, w)}<span class="fb-gloss">${gloss(w)}</span>`;
        let html;

        if (result.selfCheck) {
            html = result.correct
                ? `<div class="feedback ok"><div class="fb-title">✅ ممتاز!</div></div>`
                : `<div class="feedback bad"><div class="fb-title">لا بأس — ستعود هذه الكلمة في آخر التمرين.</div>${sub.tip ? `<div class="fb-tip">💡 ${escapeHtml(sub.tip)}</div>` : ''}</div>`;
            this.ui.elements.modal_feedback.innerHTML = html;
            return;
        }

        if (q.type === 'sentence') {
            this.audio.speak(q.text);
            html = result.correct
                ? `<div class="feedback ok"><div class="fb-title">${this.data.getRandomEncouragement()}</div><div class="fb-row">${speakerButton(q.text)}<span>${escapeHtml(result.correctMeaning)}</span></div></div>`
                : `<div class="feedback bad"><div class="fb-title">ليس هذا المعنى</div>
                     <div class="fb-row">المعنى الصحيح: <b>${escapeHtml(result.correctMeaning)}</b></div>
                     <div class="fb-tip">💡 اقرأ كل كلمة من اليسار إلى اليمين، ثم اختر.</div></div>`;
        } else if (q.type === 'sort') {
            this.audio.speak(q.word);
            html = result.correct
                ? `<div class="feedback ok"><div class="fb-title">${this.data.getRandomEncouragement()}</div><div class="fb-row">${wordLine(q.word)}</div></div>`
                : `<div class="feedback bad"><div class="fb-title">الإجابة: ${escapeHtml(result.correctLabel)}</div>
                     <div class="fb-row">${wordLine(q.word)}</div>${sub.tip ? `<div class="fb-tip">💡 ${escapeHtml(sub.tip)}</div>` : ''}</div>`;
        } else {
            const target = result.target;
            const chosen = result.chosen;
            if (result.correct) {
                if (q.type !== 'listen') this.audio.speak(target);
                html = `<div class="feedback ok"><div class="fb-title">${this.data.getRandomEncouragement()}</div><div class="fb-row">${wordLine(target)}</div></div>`;
            } else {
                // Replay the learner's choice only when it is a real word (not a half-built word),
                // then sound the right word out (c – a – t … cat) while its letters light up.
                const chosenWord = q.type !== 'build' && this.data.getGloss(chosen) ? chosen : null;
                const sayTarget = () => {
                    const el = this.ui.elements.modal_feedback.querySelector('.fb-row.fb-target [data-word]');
                    if (!soundOut(this.audio, target, el)) this.audio.speak(target);
                };
                if (chosenWord) this.audio.speak(chosenWord, { onend: () => setTimeout(sayTarget, 350) });
                else setTimeout(sayTarget, 0);
                html = `<div class="feedback bad"><div class="fb-title">ليس هذا — قارِن:</div>
                          <div class="fb-row"><span class="fb-label">اخترتَ:</span>${wordLine(chosen, target)}</div>
                          <div class="fb-row fb-target"><span class="fb-label">الصحيح:</span>${wordLine(target, chosen)}</div>
                          ${sub.tip ? `<div class="fb-tip">💡 ${escapeHtml(sub.tip)}</div>` : ''}</div>`;
            }
        }
        this.ui.elements.modal_feedback.innerHTML = html;
        this.ui.elements.modal_feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
            this.ui.showSuccessModal('لا توجد كلمات للمراجعة الآن. عُد غداً.', '🔁', null, { emoji: '✅', title: 'لا مراجعة اليوم' });
            return;
        }
        this.state.activitySession = { techniqueId: null, subSkillId: null };
        this.ui.elements.modal_feedback.innerHTML = '';
        this.startSession('review', this.shuffleArray(questions));
        this.ui.showModal();
    }

    // ---------------- placement check ----------------
    startPlacement() {
        this.state.activitySession = { techniqueId: null, subSkillId: null };
        this.ui.elements.modal_feedback.innerHTML = '';
        const first = this.placementItems(1);
        this.startSession('placement', first, { placementUnit: 1, blockStart: 0 });
        this.ui.showModal();
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
        this.ui.hideModal();
        const tech = techniques[startUnit];
        this.ui.showSuccessModal(
            startUnit === 0
                ? 'ننصحك بالبدء من الوحدة الأولى (أصوات الحروف) لتثبيت الأساس.'
                : `ننصحك بالبدء من الوحدة ${startUnit}: ${tech.name_ar}. فُتحت لك الوحدات التي قبلها لتعود إليها متى شئت.`,
            '🧭 تم تحديد مستواك', null, { emoji: '🧭', title: 'نتيجة تحديد المستوى' });
        this.state.activitySession = {};
    }

    // ---------------- end of a session ----------------
    endSession() {
        const session = this.state.activitySession;
        const { techniqueId, subSkillId, step } = session;

        if (step === 'learn') {
            this.state.markStepComplete(techniqueId, subSkillId, 'learn');
            this.state.addPoints(2);
            this.ui.hideModal();
            this.ui.showSuccessModal('أحسنت! الآن جرّب التمرين.', '+2 نقطة ⭐');
            this.effects.soundManager.playSuccessSound();
            this.ui.renderTechniqueView(techniqueId);
            return;
        }

        if (step === 'placement') {
            this.finishPlacement(Math.min(session.placementUnit + 1, this.data.getTechniques().length - 1));
            return;
        }

        const total = session.results.length || 1;
        const right = session.firstTryCorrect;
        const pct = Math.round((right / total) * 100);
        const scoreLine = `${right} من ${total} صحيحة من المحاولة الأولى (${pct}%)`;
        this.ui.hideModal();

        if (step === 'review') {
            this.state.addPoints(right);
            this.ui.showSuccessModal(`أنهيت المراجعة: ${scoreLine}. ستعود الكلمات الصعبة قريباً.`, `+${right} نقطة ⭐`, null, { emoji: '🔁', title: 'أحسنت!' });
            this.effects.soundManager.playSuccessSound();
            this.state.activitySession = {};
            this.ui.renderSkillsGrid();
            return;
        }

        const technique = this.data.getTechnique(techniqueId);
        const subSkill = this.data.getSubSkill(techniqueId, subSkillId);
        this.state.recordScore(subSkillId, step, right / total);

        if (step === 'drill') {
            this.state.markStepComplete(techniqueId, subSkillId, 'drill');
            const gained = 5 + right;
            this.state.addPoints(gained);
            const advice = pct < 60 ? ' راجع الدرس ثم أعد التمرين قبل الاختبار.' : ' أنت جاهز للاختبار.';
            this.ui.showSuccessModal(`أنهيت التمرين: ${scoreLine}.${advice}`, `+${gained} نقطة ⭐`, null,
                pct < 60 ? { emoji: '📖', title: 'أنهيت التمرين' } : {});
            this.effects.soundManager.playSuccessSound();
        } else if (step === 'quiz') {
            const passMark = this.state.difficultySettings.passingScore;
            if (right / total >= passMark) {
                this.state.markStepComplete(techniqueId, subSkillId, 'quiz');
                this.state.addToReview(subSkill.quiz.questions.map(q => `${techniqueId}|${subSkillId}|${q.id}`));
                let gained = 10 + right;
                const mastered = technique.subSkills.every(ss => this.state.isStepComplete(techniqueId, ss.id, 'quiz'));
                const tp = this.state.getTechniqueProgress(techniqueId);
                if (mastered && !tp.mastered) {
                    this.state.markTechniqueMastered(techniqueId);
                    gained += 25;
                    this.ui.showSuccessModal(`نجحت في الاختبار: ${scoreLine}. وأتقنت وحدة «${technique.name_ar}»!`, `+${gained} نقطة 🎊`);
                    this.effects.createCelebrationBurst();
                } else {
                    this.ui.showSuccessModal(`نجحت في الاختبار: ${scoreLine}.`, `+${gained} نقطة ⭐`);
                    this.effects.soundManager.playSuccessSound();
                }
                this.state.addPoints(gained);
            } else {
                this.ui.showSuccessModal(
                    `نتيجتك: ${scoreLine}. تحتاج ${Math.round(passMark * 100)}% للنجاح. راجع الدرس ثم أعد المحاولة.`,
                    'لا تستسلم! 💪',
                    { label: '📖 راجع الدرس', onClick: () => this.runActivity(techniqueId, subSkillId, 'learn') },
                    { emoji: '💪', title: 'محاولة جيدة' });
            }
        }

        this.state.activitySession = {};
        this.ui.renderTechniqueView(techniqueId);
    }
}
