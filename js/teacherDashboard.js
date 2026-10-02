'use strict';
import { escapeHtml } from './textUtils.js';

// Learning dashboard: progress, first-try accuracy per lesson, the words most often confused, and settings.
export class TeacherDashboard {
  constructor(dataManager, stateManager) {
    this.data = dataManager;
    this.state = stateManager;
    this.container = document.getElementById('teacher-dashboard');
  }

  toggle() {
    if (this.container.classList.contains('hidden')) this.open();
    else this.close();
  }

  open() {
    this.render();
    this.container.classList.remove('hidden');
  }

  close() {
    this.container.classList.add('hidden');
  }

  render() {
    const stats = this._collectStats();
    const settings = this.state.difficultySettings;
    this.container.innerHTML = `
      <div class="glass-card p-6 sm:p-8 max-w-6xl mx-auto bg-white w-full">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl font-bold text-gray-800">📊 لوحة التعلم</h2>
          <button id="close-dashboard" class="btn-secondary">✕ إغلاق</button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${stats.wordsLearned}</div><div class="stat-label">كلمة تستطيع قراءتها</div></div>
          <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-value">${stats.accuracy}</div><div class="stat-label">دقّة المحاولة الأولى</div></div>
          <div class="stat-card"><div class="stat-icon">🔁</div><div class="stat-value">${stats.reviewDue}</div><div class="stat-label">للمراجعة اليوم</div></div>
          <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-value">${stats.points}</div><div class="stat-label">النقاط · 🔥 ${stats.streak} يوم</div></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="glass-card p-6">
            <h3 class="font-bold mb-1">الدقّة في كل درس</h3>
            <p class="text-sm text-gray-500 mb-4">من المحاولة الأولى في التمارين والاختبارات. الأقل من 60% يحتاج مراجعة.</p>
            <div class="space-y-4">${stats.units}</div>
          </div>

          <div class="space-y-6">
            <div class="glass-card p-6">
              <h3 class="font-bold mb-1">أكثر الكلمات التباساً</h3>
              <p class="text-sm text-gray-500 mb-4">الكلمة الصحيحة ← ما اختاره المتعلّم بدلاً منها.</p>
              ${stats.confusions}
            </div>

            <div class="glass-card p-6">
              <h3 class="font-bold mb-4">الإعدادات</h3>
              <div class="setting-item mb-4">
                <label class="block mb-2">أقصى عدد للأسئلة في الجلسة: <b id="val-qcount">${settings.questionsPerSession}</b></label>
                <input id="input-qcount" type="range" min="5" max="15" step="1" value="${settings.questionsPerSession}">
              </div>
              <div class="setting-item mb-4">
                <label class="block mb-2">نسبة النجاح في الاختبار (من المحاولة الأولى): <b id="val-pass">${Math.round(settings.passingScore * 100)}%</b></label>
                <input id="input-pass" type="range" min="50" max="100" step="5" value="${Math.round(settings.passingScore * 100)}">
              </div>
              <div class="setting-item">
                <label class="inline-flex items-center gap-2">
                  <input id="input-auto" type="checkbox" ${settings.autoAdvance ? 'checked' : ''}>
                  الانتقال التلقائي للسؤال التالي (بدلاً من الضغط على زر "التالي")
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#close-dashboard').addEventListener('click', () => this.close());

    // settings handlers
    const qCount = this.container.querySelector('#input-qcount');
    const qVal   = this.container.querySelector('#val-qcount');
    qCount.addEventListener('input', () => qVal.textContent = qCount.value);
    qCount.addEventListener('change', () => { this.state.difficultySettings.questionsPerSession = Number(qCount.value); this.state.saveDifficultySettings(); });

    const pass = this.container.querySelector('#input-pass');
    const passVal = this.container.querySelector('#val-pass');
    pass.addEventListener('input', () => passVal.textContent = pass.value + '%');
    pass.addEventListener('change', () => { this.state.difficultySettings.passingScore = Number(pass.value)/100; this.state.saveDifficultySettings(); });

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

    const units = this.data.getTechniques().map((t, i) => {
      const p = this.state.getTechniqueProgress(t.id);
      const done = t.subSkills.reduce((n, s) => n + (p.subSkills[s.id] || []).length, 0);
      const rows = t.subSkills.map(s => {
        const a = bySub[s.id];
        if (!a) return '';
        const pct = Math.round(a.ok / a.n * 100);
        return `<div class="dash-row"><span>${s.icon} ${escapeHtml(s.name)}</span>
                  <span class="dash-pct ${pct < 60 ? 'low' : ''}">${pct}% <small>(${a.ok}/${a.n})</small></span></div>`;
      }).join('');
      return `<div>
        <div class="flex items-center justify-between font-semibold"><span>${t.icon} ${i}. ${escapeHtml(t.name_ar)} ${p.mastered ? '✅' : ''}</span>
          <span class="text-sm text-gray-600">${done}/${t.subSkills.length * 3}</span></div>
        ${rows}
      </div>`;
    }).join('');

    const pairs = {};
    responses.filter(r => !r.ok && ['listen', 'read', 'odd', 'fill', 'build'].includes(r.type) && r.chosen && r.target)
      .forEach(r => {
        const k = `${r.target}|${r.chosen}`;
        (pairs[k] = pairs[k] || { target: r.target, chosen: r.chosen, n: 0 }).n++;
      });
    const top = Object.values(pairs).sort((a, b) => b.n - a.n).slice(0, 8);
    // Same order as the heading (read right to left): the right word, then what was chosen instead.
    const word = w => `<bdi class="english-font">${escapeHtml(w)}</bdi>`;
    const confusions = top.length
      ? `<div class="space-y-2">${top.map(p => `<div class="dash-row"><span><b>${word(p.target)}</b> ← ${word(p.chosen)}</span><span class="dash-pct">${p.n}×</span></div>`).join('')}</div>`
      : '<p class="text-gray-500">لا توجد أخطاء مسجّلة بعد.</p>';

    return {
      points: this.state.userProgress.points || 0,
      streak: this.state.userProgress.streak || 0,
      wordsLearned: this.state.countWordsLearned(this.data.getTechniques()),
      reviewDue: this.state.getDueReviewKeys(99).length,
      accuracy, units, confusions
    };
  }
}
