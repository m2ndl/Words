'use strict';
import { ar, en } from './textUtils.js';

// The learning dashboard page ("تقدّمي"): progress, first-try accuracy per lesson, the words most often confused,
// and — in teacher mode only — the settings (session length, test pass mark, auto-advance).
// Teacher mode: open #/progress/teacher, or press and hold the page title for a second.
export class TeacherDashboard {
  constructor(dataManager, stateManager) {
    this.data = dataManager;
    this.state = stateManager;
    this.container = document.getElementById('progress-view');
    this.teacher = false;
  }

  render({ teacher = this.teacher } = {}) {
    this.teacher = teacher;
    const stats = this._collectStats();
    const settings = this.state.difficultySettings;
    const teacherPanel = !teacher ? '' : `
      <section class="panel" aria-labelledby="settings-title">
        <h2 id="settings-title" class="panel-title">⚙️ إعدادات المعلّم</h2>
        <p class="hint">هذه الإعدادات للمعلّم. خفض نسبة النجاح يجعل الاختبارات أسهل من اللازم.</p>
        <div class="setting-item">
          <label for="input-qcount">أقصى عدد للأسئلة في الجلسة: <b id="val-qcount">${settings.questionsPerSession}</b></label>
          <input id="input-qcount" type="range" min="5" max="15" step="1" value="${settings.questionsPerSession}">
        </div>
        <div class="setting-item">
          <label for="input-pass">نسبة النجاح في الاختبار (من أول محاولة): <b id="val-pass">${Math.round(settings.passingScore * 100)}%</b></label>
          <input id="input-pass" type="range" min="50" max="100" step="5" value="${Math.round(settings.passingScore * 100)}">
        </div>
        <div class="setting-item">
          <label class="setting-check" for="input-auto">
            <input id="input-auto" type="checkbox" ${settings.autoAdvance ? 'checked' : ''}>
            الانتقال التلقائي إلى السؤال التالي (بدلاً من الضغط على «التالي»)
          </label>
        </div>
        <button id="teacher-off" class="btn-secondary">إغلاق إعدادات المعلّم</button>
      </section>`;

    this.container.innerHTML = `
      <ul class="stat-row">
        <li class="stat"><span class="stat-value">${stats.wordsLearned}</span><span class="stat-label">كلمة تستطيع قراءتها</span></li>
        <li class="stat"><span class="stat-value">${stats.accuracy}</span><span class="stat-label">أجبت صحيحاً من أول محاولة</span></li>
        <li class="stat"><span class="stat-value">${stats.reviewDue}</span><span class="stat-label">للمراجعة اليوم</span></li>
        <li class="stat"><span class="stat-value">${stats.streak}</span><span class="stat-label">أيام متتالية من التعلّم</span></li>
      </ul>

      <section class="panel" aria-labelledby="acc-title">
        <h2 id="acc-title" class="panel-title">دقّتك في كل درس</h2>
        <p class="hint">من أول محاولة في التمارين والاختبارات. الدرس الذي نتيجته أقل من 60% يحتاج مراجعة.</p>
        ${stats.units}
      </section>

      <section class="panel" aria-labelledby="conf-title">
        <h2 id="conf-title" class="panel-title">كلمات تخلط بينها</h2>
        <p class="hint">الكلمة الصحيحة ← ما اخترته بدلاً منها.</p>
        ${stats.confusions}
      </section>
      ${teacherPanel}`;

    if (teacher) this._bindSettings();
  }

  _bindSettings() {
    const qCount = this.container.querySelector('#input-qcount');
    const qVal = this.container.querySelector('#val-qcount');
    qCount.addEventListener('input', () => { qVal.textContent = qCount.value; });
    qCount.addEventListener('change', () => { this.state.difficultySettings.questionsPerSession = Number(qCount.value); this.state.saveDifficultySettings(); });

    const pass = this.container.querySelector('#input-pass');
    const passVal = this.container.querySelector('#val-pass');
    pass.addEventListener('input', () => { passVal.textContent = pass.value + '%'; });
    pass.addEventListener('change', () => { this.state.difficultySettings.passingScore = Number(pass.value) / 100; this.state.saveDifficultySettings(); });

    const auto = this.container.querySelector('#input-auto');
    auto.addEventListener('change', () => { this.state.difficultySettings.autoAdvance = !!auto.checked; this.state.saveDifficultySettings(); });
  }

  _collectStats() {
    const responses = this.state.responses || [];
    const bySub = {};
    responses.filter(r => r.type !== 'say').forEach(r => {
      const s = bySub[r.sub] || (bySub[r.sub] = { ok: 0, n: 0 });
      s.n++; if (r.ok) s.ok++;
    });
    const scored = responses.filter(r => r.type !== 'say');
    const accuracy = scored.length ? `${Math.round(scored.filter(r => r.ok).length / scored.length * 100)}%` : '—';

    const techniques = this.data.getTechniques();
    const unitRows = techniques.map((t, i) => {
      const p = this.state.getTechniqueProgress(t.id);
      const done = t.subSkills.reduce((n, s) => n + (p.subSkills[s.id] || []).length, 0);
      const rows = t.subSkills.map(s => {
        const a = bySub[s.id];
        if (!a) return '';
        const pct = Math.round(a.ok / a.n * 100);
        return `<div class="dash-row"><span>${s.icon} ${ar(s.name)}</span>
                  <span class="dash-pct ${pct < 60 ? 'low' : ''}">${pct}% <small>(${a.ok} من ${a.n})</small></span></div>`;
      }).join('');
      if (!rows && !done) return '';
      return `<div class="dash-unit">
        <div class="dash-unit-head"><span>${t.icon} الوحدة ${i + 1}: ${ar(t.name_ar)} ${p.mastered ? '<span aria-label="أُتقنت">✅</span>' : ''}</span>
          <span class="hint">${done} من ${t.subSkills.length * 3} خطوات</span></div>
        ${rows}
      </div>`;
    }).join('');
    const units = unitRows || '<p class="hint">ستظهر هنا نتائجك بعد أول تمرين.</p>';

    const pairs = {};
    responses.filter(r => !r.ok && ['listen', 'read', 'odd', 'fill', 'build'].includes(r.type) && r.chosen && r.target)
      .forEach(r => {
        const k = `${r.target}|${r.chosen}`;
        (pairs[k] = pairs[k] || { target: r.target, chosen: r.chosen, n: 0 }).n++;
      });
    const top = Object.values(pairs).sort((a, b) => b.n - a.n).slice(0, 8);
    // Same order as the heading (read right to left): the right word, then what was chosen instead.
    const confusions = top.length
      ? `<div>${top.map(p => `<div class="dash-row"><span><b>${en(p.target)}</b> ← ${en(p.chosen)}</span><span class="dash-pct low">${p.n}×</span></div>`).join('')}</div>`
      : '<p class="hint">لا توجد أخطاء مسجّلة بعد.</p>';

    return {
      streak: this.state.userProgress.streak || 0,
      wordsLearned: this.state.countWordsLearned(techniques),
      reviewDue: this.state.getDueReviewKeys(99).length,
      accuracy, units, confusions
    };
  }
}
