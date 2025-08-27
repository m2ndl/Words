'use strict';

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
    this.container.innerHTML = `
      <div class="glass-card p-8 max-w-6xl mx-auto bg-white">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl font-bold text-gray-800">📊 لوحة التعلم</h2>
          <button id="close-dashboard" class="btn-secondary">✕ إغلاق</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div class="stat-card">
            <div class="stat-icon">⭐</div>
            <div class="stat-value">${stats.points}</div>
            <div class="stat-label">النقاط</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-value">${stats.streak}</div>
            <div class="stat-label">سلسلة الأيام</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📚</div>
            <div class="stat-value">${stats.completedSteps}</div>
            <div class="stat-label">خطوات مكتملة</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="glass-card p-6">
            <h3 class="font-bold mb-4">إعدادات صعوبة</h3>
            <div class="setting-item mb-4">
              <label class="block mb-2">عدد الأسئلة في كل جلسة: <b id="val-qcount">${this.state.difficultySettings.questionsPerSession}</b></label>
              <input id="input-qcount" type="range" min="3" max="10" step="1" value="${this.state.difficultySettings.questionsPerSession}">
            </div>
            <div class="setting-item mb-4">
              <label class="block mb-2">نسبة النجاح: <b id="val-pass">${Math.round(this.state.difficultySettings.passingScore*100)}%</b></label>
              <input id="input-pass" type="range" min="50" max="100" step="5" value="${Math.round(this.state.difficultySettings.passingScore*100)}">
            </div>
            <div class="setting-item">
              <label class="inline-flex items-center gap-2">
                <input id="input-auto" type="checkbox" ${this.state.difficultySettings.autoAdvance ? 'checked' : ''}>
                تفعيل الانتقال التلقائي للسؤال التالي (بدلاً من الضغط على زر "التالي")
              </label>
            </div>
          </div>

          <div class="glass-card p-6">
            <h3 class="font-bold mb-4">التقدم حسب المهارة</h3>
            <div class="space-y-2">
              ${this.data.getTechniques().map(t => {
                const p = this.state.getTechniqueProgress(t.id);
                const steps = Object.values(p.subSkills).flat().length;
                const total = t.subSkills.length * 3;
                const pct = total ? Math.round(steps/total*100) : 0;
                return `<div class="flex items-center justify-between">
                  <div class="flex items-center gap-2"><span>${t.icon}</span><span>${t.name_ar}</span></div>
                  <div class="text-sm text-gray-600">${steps}/${total} (${pct}%)</div>
                </div>`;
              }).join('')}
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
    const points = this.state.userProgress.points || 0;
    const streak = this.state.userProgress.streak || 0;
    const completedSteps = Object.values(this.state.userProgress.techniques || {}).reduce((acc, t) => acc + Object.values(t.subSkills || {}).flat().length, 0);
    return { points, streak, completedSteps };
  }
}
