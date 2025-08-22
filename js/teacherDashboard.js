'use strict';

// Manages the Teacher Dashboard UI and functionality.
export class TeacherDashboard {
    constructor(dataManager, stateManager) {
        this.data = dataManager;
        this.state = stateManager;
        this.isOpen = false;
        this.currentView = 'overview';
    }

    toggle() {
        this.isOpen = !this.isOpen;
        const dashboardEl = document.getElementById('teacher-dashboard');
        if (this.isOpen) {
            this.render();
            dashboardEl.classList.remove('hidden');
        } else {
            dashboardEl.classList.add('hidden');
        }
    }

    render() {
        const dashboard = document.getElementById('teacher-dashboard');
        const report = this.state.generateProgressReport();
        dashboard.innerHTML = `
            <div class="glass-card p-8 max-w-6xl mx-auto">
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-3xl font-bold text-gray-800">📊 Teacher Dashboard</h2>
                    <button id="close-dashboard" class="btn-secondary">✕ إغلاق</button>
                </div>
                <div class="flex gap-4 mb-8 border-b border-gray-200">
                    <button class="tab-btn ${this.currentView === 'overview' ? 'active' : ''}" data-view="overview">📈 نظرة عامة</button>
                    <button class="tab-btn ${this.currentView === 'analytics' ? 'active' : ''}" data-view="analytics">📊 التحليلات</button>
                    <button class="tab-btn ${this.currentView === 'settings' ? 'active' : ''}" data-view="settings">⚙️ إعدادات الصعوبة</button>
                    <button class="tab-btn ${this.currentView === 'reports' ? 'active' : ''}" data-view="reports">📋 التقارير</button>
                </div>
                <div id="dashboard-content">
                    ${this.renderCurrentView(report)}
                </div>
            </div>`;
        this.attachEventListeners();
    }

    renderCurrentView(report) {
        switch (this.currentView) {
            case 'overview': return this.renderOverview(report);
            case 'analytics': return this.renderAnalytics(report);
            case 'settings': return this.renderSettings();
            case 'reports': return this.renderReports(report);
            default: return this.renderOverview(report);
        }
    }

    renderOverview(report) {
        const mastered = report.techniqueProgress.filter(t => t.mastered).length;
        const total = report.techniqueProgress.length || 1;
        const completionRate = Math.round((mastered / total) * 100);
        return `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="stat-card"><div class="stat-icon">⏱️</div><div class="stat-value">${report.totalTimeSpent}h</div><div class="stat-label">إجمالي وقت التعلم</div></div>
                <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-value">${report.averageAccuracy}%</div><div class="stat-label">متوسط الدقة</div></div>
                <div class="stat-card"><div class="stat-icon">🏆</div><div class="stat-value">${completionRate}%</div><div class="stat-label">معدل الإتمام</div></div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4">📚 تقدم المهارات</h3>
                    <div class="space-y-4">${report.techniqueProgress.map(tech => `<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div class="flex items-center gap-3"><span class="text-2xl">${tech.mastered ? '✅' : '⏳'}</span><div><div class="font-semibold">${tech.name}</div><div class="text-sm text-gray-600">${tech.timeSpent} دقيقة</div></div></div><div class="text-right"><div class="font-bold text-lg">${tech.completedSteps}/12</div><div class="text-sm text-gray-500">خطوة</div></div></div>`).join('')}</div>
                </div>
                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4">📋 ملخص الأداء</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg"><span class="font-semibold">الجلسات المكتملة</span><span class="text-xl font-bold text-blue-600">${report.sessionsCompleted}</span></div>
                        <div class="flex justify-between items-center p-3 bg-orange-50 rounded-lg"><span class="font-semibold">النقاط المكتسبة</span><span class="text-xl font-bold text-orange-600">${report.totalPoints}</span></div>
                        <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg"><span class="font-semibold">سلسلة الأيام</span><span class="text-xl font-bold text-green-600">${report.currentStreak} أيام</span></div>
                    </div>
                    ${report.weakAreas.length > 0 ? `<div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg"><h4 class="font-bold text-red-800 mb-2">🔍 مناطق تحتاج تحسين:</h4><div class="text-sm text-red-600">${report.weakAreas.map(area => area.replace(/_/g, ' ')).join('، ')}</div></div>` : ''}
                    ${report.strongAreas.length > 0 ? `<div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg"><h4 class="font-bold text-green-800 mb-2">⭐ نقاط القوة:</h4><div class="text-sm text-green-600">${report.strongAreas.map(area => area.replace(/_/g, ' ')).join('، ')}</div></div>` : ''}
                </div>
            </div>`;
    }

    renderAnalytics(report) {
        const dailyData = this.state.userProgress.analytics.dailyActivity;
        const last7Days = this.getLast7DaysData(dailyData);
        return `
            <div class="space-y-8">
                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4">📊 تحليل الوقت</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><h4 class="font-semibold mb-3">آخر 7 أيام</h4><div class="space-y-2">${last7Days.map(day => `<div class="flex justify-between items-center p-2 bg-gray-50 rounded"><span class="text-sm">${day.date}</span><span class="font-bold">${day.minutes}د</span></div>`).join('')}</div></div>
                        <div><h4 class="font-semibold mb-3">الوقت حسب المهارة</h4><div class="space-y-2">${Object.entries(this.state.userProgress.analytics.timeByTechnique || {}).map(([tech, time]) => `<div class="flex justify-between items-center p-2 bg-gray-50 rounded"><span class="text-sm">${tech.replace(/_/g, ' ')}</span><span class="font-bold">${Math.round(time / 60000)}د</span></div>`).join('')}</div></div>
                    </div>
                </div>
                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4">🎯 اتجاهات الدقة</h3>
                    <div class="text-center p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <div class="text-4xl font-bold text-purple-600 mb-2">${report.averageAccuracy}%</div>
                        <div class="text-lg text-gray-600">متوسط الدقة الإجمالي</div>
                        <div class="mt-4 text-sm text-gray-500">${report.averageAccuracy >= 90 ? '🏆 أداء ممتاز!' : report.averageAccuracy >= 75 ? '👍 أداء جيد' : '📈 يحتاج المزيد من التدريب'}</div>
                    </div>
                </div>
            </div>`;
    }

    renderSettings() {
        const settings = this.state.difficultySettings;
        return `
            <div class="glass-card p-6 max-w-2xl">
                <h3 class="text-xl font-bold mb-6">⚙️ إعدادات الصعوبة والتحكم</h3>
                <div class="space-y-6">
                    <div class="setting-item"><label class="block text-sm font-semibold mb-2">عدد الأسئلة في كل جلسة</label><div class="flex items-center gap-4"><input type="range" id="questions-slider" min="3" max="10" value="${settings.questionsPerSession}" class="flex-grow"><span id="questions-value" class="font-bold text-lg w-8">${settings.questionsPerSession}</span></div><p class="text-sm text-gray-600 mt-1">المزيد من الأسئلة = تدريب أطول</p></div>
                    <div class="setting-item"><label class="block text-sm font-semibold mb-2">نسبة النجاح المطلوبة</label><div class="flex items-center gap-4"><input type="range" id="passing-slider" min="0.5" max="1" step="0.1" value="${settings.passingScore}" class="flex-grow"><span id="passing-value" class="font-bold text-lg w-12">${Math.round(settings.passingScore * 100)}%</span></div><p class="text-sm text-gray-600 mt-1">النسبة المطلوبة للانتقال للمرحلة التالية</p></div>
                    <div class="setting-item"><label class="flex items-center gap-3"><input type="checkbox" id="hints-toggle" ${settings.enableHints ? 'checked' : ''} class="w-5 h-5"><span class="font-semibold">تفعيل التلميحات</span></label><p class="text-sm text-gray-600 mt-1">إظهار تلميحات مساعدة أثناء الأنشطة</p></div>
                    <div class="setting-item"><label class="flex items-center gap-3"><input type="checkbox" id="auto-advance-toggle" ${settings.autoAdvance ? 'checked' : ''} class="w-5 h-5"><span class="font-semibold">الانتقال التلقائي</span></label><p class="text-sm text-gray-600 mt-1">الانتقال التلقائي للسؤال التالي بعد الإجابة الصحيحة</p></div>
                    <div class="setting-item border-t pt-6"><h4 class="font-semibold text-red-600 mb-3">⚠️ إعادة تعيين</h4><div class="flex gap-3"><button id="reset-progress-btn" class="btn-secondary bg-red-50 text-red-600 border-red-200">🔄 إعادة تعيين التقدم</button><button id="export-data-btn" class="btn-secondary">📤 تصدير البيانات</button></div></div>
                </div>
            </div>`;
    }

    renderReports(report) {
        return `
            <div class="space-y-6">
                <div class="glass-card p-6">
                    <div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold">📋 تقرير شامل</h3><button id="download-report-btn" class="btn-primary">📥 تحميل التقرير</button></div>
                    <div class="prose max-w-none">
                        <div class="bg-gray-50 p-6 rounded-lg mb-6"><h4 class="text-lg font-bold mb-4">ملخص الأداء</h4><ul class="space-y-2"><li>📅 <strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-SA')}</li><li>⏱️ <strong>إجمالي وقت التعلم:</strong> ${report.totalTimeSpent} ساعة</li><li>🎯 <strong>متوسط الدقة:</strong> ${report.averageAccuracy}%</li><li>🏆 <strong>المهارات المتقنة:</strong> ${report.techniqueProgress.filter(t => t.mastered).length}/${report.techniqueProgress.length}</li><li>🔥 <strong>أطول سلسلة أيام:</strong> ${report.currentStreak} يوم</li></ul></div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><h4 class="text-lg font-bold mb-3">تفصيل المهارات</h4><div class="space-y-3">${report.techniqueProgress.map(tech => `<div class="p-3 border rounded-lg ${tech.mastered ? 'bg-green-50 border-green-200' : 'bg-gray-50'}"><div class="flex justify-between items-center"><span class="font-semibold">${tech.name}</span><span class="text-sm ${tech.mastered ? 'text-green-600' : 'text-gray-500'}">${tech.mastered ? 'مكتمل ✅' : `${tech.completedSteps}/12 خطوة`}</span></div><div class="text-sm text-gray-600 mt-1">وقت التدريب: ${tech.timeSpent} دقيقة</div></div>`).join('')}</div></div>
                            <div><h4 class="text-lg font-bold mb-3">التوصيات</h4><div class="space-y-3">${this.generateRecommendations(report).map(rec => `<div class="p-3 border rounded-lg ${rec.type === 'strength' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}"><div class="font-semibold">${rec.title}</div><div class="text-sm text-gray-600 mt-1">${rec.description}</div></div>`).join('')}</div></div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    generateRecommendations(report) {
        const recommendations = [];
        if (report.averageAccuracy < 70) recommendations.push({ type: 'improvement', title: '🎯 تحسين الدقة', description: 'ينصح بتكرار التمارين والتركيز على المهارات الأساسية' });
        if (report.totalTimeSpent < 5) recommendations.push({ type: 'improvement', title: '⏰ زيادة وقت التدريب', description: 'المزيد من الممارسة اليومية سيحسن النتائج' });
        if (report.strongAreas.length > 0) recommendations.push({ type: 'strength', title: '⭐ نقاط القوة', description: `أداء ممتاز في: ${report.strongAreas.join('، ')}` });
        if (report.currentStreak > 7) recommendations.push({ type: 'strength', title: '🔥 التزام ممتاز', description: 'الاستمرارية في التعلم تؤتي ثمارها!' });
        return recommendations;
    }

    getLast7DaysData(dailyData) {
        const last7Days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            const dayData = dailyData[dateStr];
            last7Days.push({
                date: date.toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' }),
                minutes: dayData ? Math.round(dayData.timeSpent / 60000) : 0
            });
        }
        return last7Days;
    }

    attachEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
            this.currentView = btn.dataset.view;
            this.render();
        }));
        document.getElementById('close-dashboard')?.addEventListener('click', () => this.toggle());
        this.attachSettingsListeners();
        this.attachReportListeners();
    }

    attachSettingsListeners() {
        const questionsSlider = document.getElementById('questions-slider');
        const passingSlider = document.getElementById('passing-slider');
        questionsSlider?.addEventListener('input', (e) => {
            document.getElementById('questions-value').textContent = e.target.value;
            this.state.updateDifficultySetting('questionsPerSession', parseInt(e.target.value));
        });
        passingSlider?.addEventListener('input', (e) => {
            document.getElementById('passing-value').textContent = Math.round(e.target.value * 100) + '%';
            this.state.updateDifficultySetting('passingScore', parseFloat(e.target.value));
        });
        document.getElementById('hints-toggle')?.addEventListener('change', (e) => this.state.updateDifficultySetting('enableHints', e.target.checked));
        document.getElementById('auto-advance-toggle')?.addEventListener('change', (e) => this.state.updateDifficultySetting('autoAdvance', e.target.checked));
        document.getElementById('reset-progress-btn')?.addEventListener('click', () => {
            if (confirm('هل أنت متأكد من إعادة تعيين جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) {
                localStorage.removeItem('modernPhonicsProgress');
                location.reload();
            }
        });
        document.getElementById('export-data-btn')?.addEventListener('click', () => this.exportData());
    }

    attachReportListeners() {
        document.getElementById('download-report-btn')?.addEventListener('click', () => this.downloadReport());
    }

    exportData() {
        const data = {
            progress: this.state.userProgress,
            settings: this.state.difficultySettings,
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phonics-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    downloadReport() {
        const report = this.state.generateProgressReport();
        const reportContent = this.generateReportContent(report);
        const blob = new Blob([reportContent], { type: 'text/plain; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `تقرير-التقدم-${new Date().toLocaleDateString('ar-SA')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    generateReportContent(report) {
        return `
تقرير تقدم تعلم الأصوات الإنجليزية
=====================================
تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}
ملخص الأداء:
- إجمالي وقت التعلم: ${report.totalTimeSpent} ساعة
- عدد الجلسات المكتملة: ${report.sessionsCompleted}
- متوسط الدقة: ${report.averageAccuracy}%
- النقاط المكتسبة: ${report.totalPoints}
- أطول سلسلة أيام: ${report.currentStreak}
تفصيل المهارات:
${report.techniqueProgress.map(tech => `- ${tech.name}: ${tech.mastered ? 'مكتمل ✓' : `${tech.completedSteps}/12 خطوة`} (${tech.timeSpent} دقيقة)`).join('\n')}
${report.strongAreas.length > 0 ? `نقاط القوة:\n${report.strongAreas.map(area => `- ${area.replace(/_/g, ' ')}`).join('\n')}` : ''}
${report.weakAreas.length > 0 ? `مناطق تحتاج تحسين:\n${report.weakAreas.map(area => `- ${area.replace(/_/g, ' ')}`).join('\n')}` : ''}
التوصيات:
${this.generateRecommendations(report).map(rec => `- ${rec.title}: ${rec.description}`).join('\n')}
        `.trim();
    }
}
