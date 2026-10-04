'use strict';
import { ThemeManager } from './themeManager.js';
import { EffectsManager } from './effectsManager.js';
import { DataManager } from './dataManager.js';
import { StateManager } from './stateManager.js';
import { AudioManager } from './audioManager.js';
import { UIManager } from './uiManager.js';
import { TeacherDashboard } from './teacherDashboard.js';
import { GameEngine } from './gameEngine.js';
import { soundOut, wordElementFor, setSoundOutLabel, SOUND_OUT_HINT, SOUND_OUT_HINT_USES } from './soundOut.js';
import { openDialog, closeDialog, isDialogOpen } from './dialogs.js';
import { parseRoute, routes, activityKey, pageOf, canGoBack, pushRoute, replaceRoute } from './router.js';

const APP_NAME = 'دورة قراءة الكلمات';
const IMPORTED_FLAG = 'wordsImported';
const TEACHER_PRESS_MS = 1000;

class ModernPhonicsApp {
  constructor() {
    this.themeManager = new ThemeManager();
    this.effectsManager = new EffectsManager();
    this.dataManager = new DataManager();
    this.stateManager = new StateManager();
    this.audioManager = new AudioManager();
    this.uiManager = new UIManager(this.dataManager, this.stateManager, this.audioManager);
    this.gameEngine = new GameEngine(this.dataManager, this.stateManager, this.uiManager, this.audioManager, this.effectsManager);
    this.teacherDashboard = new TeacherDashboard(this.dataManager, this.stateManager);
    this.gameEngine.nav = {
      replace: hash => this.replace(hash),
      exit: () => this.exitActivity(),
      requestExit: () => this.requestExit()
    };

    this.inApp = false;          // past the start screen
    this.renderedHash = null;    // the route on screen
    this.activityKey = null;     // the open activity, if any
    this.openedFrom = null;      // the page the open activity was started from
    this.leaving = false;        // an exit the learner already confirmed

    setSoundOutLabel(this.stateManager.hintCount(SOUND_OUT_HINT) < SOUND_OUT_HINT_USES);
    this.initEventListeners();
    this.boot();
    this.registerServiceWorker();
  }

  // ---------------- start-up ----------------
  // The start screen shows a spinner until the course is loaded, and a retry button if it cannot be.
  // New learners then choose "start" or "placement"; returning learners go straight to where they were.
  async boot() {
    const el = this.uiManager.elements;
    el.boot_loading.classList.remove('hidden');
    el.boot_error.classList.add('hidden');
    const manifest = Promise.race([this.audioManager.ready, new Promise(resolve => setTimeout(resolve, 4000))]);
    const [loaded] = await Promise.all([this.dataManager.init(), manifest]);
    el.boot_loading.classList.add('hidden');
    if (!loaded) {
      el.boot_error.classList.remove('hidden');
      return;
    }
    if (this.stateManager.isNewLearner()) {
      el.boot_actions.classList.remove('hidden');
      return;
    }
    this.enterApp();
    try {
      if (sessionStorage.getItem(IMPORTED_FLAG)) {
        sessionStorage.removeItem(IMPORTED_FLAG);
        this.uiManager.toast('✅ تمّ استرجاع تقدّمك.');
      }
    } catch {}
  }

  enterApp() {
    const el = this.uiManager.elements;
    el.boot.classList.add('hidden');
    el.app.classList.remove('hidden');
    this.inApp = true;
    // The menu and activities are not restored after a reload; the page under them is. When that page is the
    // previous entry, step back to it (so Back is not pressed twice for one page); otherwise replace the entry.
    const r = parseRoute(location.hash);
    if ((r.activity || r.menu) && canGoBack()) {
      history.back();
      setTimeout(() => { if (this.renderedHash === null) { replaceRoute(pageOf(parseRoute(location.hash))); this.route(); } }, 400);
      return;
    }
    replaceRoute(pageOf(r));
    this.route();
  }

  startCourse(placement = false) {
    this.effectsManager.soundManager.resumeAudioContext();
    this.stateManager.markStarted();
    this.enterApp();
    if (placement) this.navigate(routes.placement());
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    const register = () => navigator.serviceWorker.register('./sw.js').catch(() => {});
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }

  // ---------------- routes ----------------
  navigate(hash) {
    if (hash === location.hash) return;
    pushRoute(hash);
    this.route();
  }

  replace(hash) {
    replaceRoute(hash);
    this.route();
  }

  // Back one step: to the previous entry when it is ours, otherwise to the page under the current one (or home).
  goBack() {
    const r = parseRoute(location.hash);
    if (canGoBack()) history.back();
    else this.replace(r.activity || r.menu ? pageOf(r) : routes.home());
  }

  // Renders whatever the address says: the page, the menu, and the activity over the page.
  route() {
    if (!this.inApp) return;
    const hash = location.hash || routes.home();
    if (hash === this.renderedHash) return;
    const r = parseRoute(hash);
    const key = activityKey(r);
    const prevKey = this.activityKey;

    // Leaving an activity whose answers would be lost (the phone's Back button): stay, and ask first.
    if (prevKey && key !== prevKey && !this.leaving && this.gameEngine.needsLeaveConfirm()) {
      pushRoute(this.renderedHash);
      this.confirmLeave();
      return;
    }
    this.leaving = false;
    const prevPage = this.renderedHash ? pageOf(parseRoute(this.renderedHash)) : null;
    this.renderedHash = hash;

    if (!this.renderPage(r)) {
      this.replace(routes.home());
      return;
    }
    this.setMenu(!!r.menu);

    if (key !== prevKey) {
      this.activityKey = key;
      if (key) {
        if (!prevKey) this.openedFrom = prevPage;
        if (!this.gameEngine.open(r.activity)) {
          // It cannot start (nothing to review, a step not open yet): back to the page it was opened from.
          this.activityKey = null;
          setTimeout(() => {
            if (canGoBack() && this.openedFrom === pageOf(r)) history.back();
            else this.replace(pageOf(r));
          }, 0);
        }
      } else if (prevKey) {
        this.gameEngine.close();
      }
    }

    // A new page (or the page under a closed activity): start at the top, and tell screen readers where we are.
    const page = pageOf(r);
    if (!key && !r.menu && (page !== prevPage || prevKey)) {
      window.scrollTo(0, 0);
      if (prevPage !== null) this.uiManager.elements.main_title.focus({ preventScroll: true });
    }
    const title = this.uiManager.elements.main_title.textContent.trim();
    document.title = title && title !== APP_NAME ? `${title} — ${APP_NAME}` : APP_NAME;
  }

  // Returns false when the page cannot be shown (an unknown or locked unit).
  renderPage(r) {
    const ui = this.uiManager;
    if (r.view === 'unit') {
      if (!ui.renderUnit(r.techId)) {
        ui.toast('هذه الوحدة مقفلة بعد.');
        return false;
      }
      this.audioManager.prefetch(this.dataManager.wordsForUnit(this.dataManager.getTechnique(r.techId)));
    } else if (r.view === 'progress') {
      this.teacherDashboard.render({ teacher: r.teacher || this.teacherDashboard.teacher });
      ui.setHeader('تقدّمي', false);
      ui.showView('progress');
    } else if (r.view === 'note') {
      ui.setHeader('حفظ تقدّمك ونقله', false);
      ui.showView('note');
    } else {
      ui.renderHome();
    }
    return true;
  }

  // ---------------- leaving an activity ----------------
  // ✕, Escape: ask first when answers would be lost.
  requestExit() {
    if (this.gameEngine.needsLeaveConfirm()) this.confirmLeave();
    else this.exitActivity();
  }

  async confirmLeave() {
    const ok = await this.uiManager.confirm(this.gameEngine.leaveMessage());
    if (ok) this.exitActivity();
  }

  // Back to the page under the activity (its unit, or home for review and placement).
  exitActivity() {
    const page = pageOf(parseRoute(location.hash));
    this.leaving = true;
    if (canGoBack() && this.openedFrom === page) history.back();
    else this.replace(page);
  }

  // ---------------- menu ----------------
  setMenu(open) {
    const { side_menu: menu, nav_btn: btn } = this.uiManager.elements;
    if (open && !isDialogOpen(menu)) {
      this.refreshUnlockButton();
      openDialog(menu, { onCancel: () => this.closeMenu(), focus: menu.querySelector('.menu-item') });
      btn.setAttribute('aria-expanded', 'true');
    } else if (!open && isDialogOpen(menu)) {
      closeDialog(menu);
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  closeMenu() {
    if (parseRoute(location.hash).menu) this.goBack();
  }

  refreshUnlockButton() {
    const btn = this.uiManager.elements.menu_unlock;
    const on = this.stateManager.unlockAll;
    btn.textContent = on ? '🔒 إلغاء فتح جميع الوحدات' : '🔓 فتح جميع الوحدات';
    btn.setAttribute('aria-pressed', String(on));
  }

  // ---------------- progress transfer (note page) ----------------
  progressFile() {
    const blob = new Blob([JSON.stringify(this.stateManager.exportData())], { type: 'application/json' });
    const name = `words-progress-${new Date().toISOString().slice(0, 10)}.json`;
    return { blob, name };
  }

  downloadProgress() {
    const { blob, name } = this.progressFile();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    this.uiManager.toast('حُفظ ملف بتقدّمك. أرسله إلى نفسك، ثم افتحه من هذه الصفحة على الجهاز الآخر.');
  }

  canShareFiles() {
    try {
      return !!navigator.canShare && navigator.canShare({ files: [new File(['{}'], 'progress.json', { type: 'application/json' })] });
    } catch { return false; }
  }

  async shareProgress() {
    const { blob, name } = this.progressFile();
    try {
      await navigator.share({ files: [new File([blob], name, { type: 'application/json' })], title: 'تقدّمي في دورة قراءة الكلمات' });
    } catch (error) {
      if (error?.name !== 'AbortError') this.downloadProgress();
    }
  }

  async importProgress(file) {
    let data = null;
    try {
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      data = JSON.parse(text);
    } catch {}
    if (!data || data.app !== 'words') {
      this.uiManager.toast('هذا الملف ليس نسخة من تقدّمك في هذه الدورة.');
      return;
    }
    const ok = await this.uiManager.confirm({
      title: 'تستبدل تقدّمك الحالي؟',
      text: 'سيُستبدل تقدّمك في هذا المتصفح بالنسخة التي اخترتها.',
      ok: 'نعم، استبدل',
      cancel: 'إلغاء'
    });
    if (!ok) return;
    if (!this.stateManager.importData(data)) {
      this.uiManager.toast('هذا الملف ليس نسخة من تقدّمك في هذه الدورة.');
      return;
    }
    try { sessionStorage.setItem(IMPORTED_FLAG, '1'); } catch {}
    history.replaceState(null, '', routes.home());
    location.reload();
  }

  async copyEmail() {
    const field = document.getElementById('email-field');
    try {
      await navigator.clipboard.writeText(field.value);
      this.uiManager.toast('✅ تم نسخ البريد إلى الحافظة');
    } catch {
      field.select();
      this.uiManager.toast('حدّد البريد وانسخه.');
    }
  }

  // ---------------- events ----------------
  initEventListeners() {
    const el = this.uiManager.elements;
    window.addEventListener('popstate', () => this.route());
    window.addEventListener('hashchange', () => this.route());

    el.start_btn.addEventListener('click', () => this.startCourse());
    el.placement_start_btn.addEventListener('click', () => this.startCourse(true));
    el.boot_retry.addEventListener('click', () => this.boot());

    el.nav_btn.addEventListener('click', () => {
      if (el.nav_btn.dataset.mode === 'back') this.goBack();
      else this.navigate(routes.menu());
    });
    el.modal_close_btn.addEventListener('click', () => this.requestExit());

    // Menu items replace the menu's entry, so Back from their page returns home.
    document.getElementById('menu-progress').addEventListener('click', () => this.replace(routes.progress()));
    document.getElementById('menu-review').addEventListener('click', () => this.replace(routes.review()));
    document.getElementById('menu-placement').addEventListener('click', () => this.replace(routes.placement()));
    document.getElementById('menu-note').addEventListener('click', () => this.replace(routes.note()));
    el.menu_unlock.addEventListener('click', () => {
      this.stateManager.toggleUnlockAll();
      this.refreshUnlockButton();
      this.uiManager.toast(this.stateManager.unlockAll
        ? 'فُتحت جميع الوحدات، وتستطيع أن تبدأ أي وحدة بالاختبار مباشرةً.'
        : 'عادت الوحدات تُفتح بالترتيب.');
      this.closeMenu();
    });

    // Note page: save, send and open a copy of the progress; copy the e-mail address.
    document.getElementById('export-btn').addEventListener('click', () => this.downloadProgress());
    const shareBtn = document.getElementById('share-btn');
    if (this.canShareFiles()) {
      shareBtn.classList.remove('hidden');
      shareBtn.addEventListener('click', () => this.shareProgress());
    }
    const importInput = document.getElementById('import-input');
    importInput.addEventListener('change', () => {
      const file = importInput.files?.[0];
      importInput.value = '';
      if (file) this.importProgress(file);
    });
    document.getElementById('copy-email-btn').addEventListener('click', () => this.copyEmail());

    // Teacher settings: press and hold the title of the progress page.
    let pressTimer = null;
    el.main_title.addEventListener('pointerdown', () => {
      if (parseRoute(location.hash).view !== 'progress') return;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        this.teacherDashboard.render({ teacher: true });
        this.uiManager.toast('إعدادات المعلّم ظاهرة الآن في آخر الصفحة.');
      }, TEACHER_PRESS_MS);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.main_title.addEventListener(ev, () => clearTimeout(pressTimer)));

    // Clicks on rendered content: audio, navigation, locked units, notices.
    document.addEventListener('click', (e) => {
      const target = e.target;
      const soundOutBtn = target.closest('[data-soundout]');
      if (soundOutBtn) {
        this.stateManager.bumpHint(SOUND_OUT_HINT);
        if (this.stateManager.hintCount(SOUND_OUT_HINT) >= SOUND_OUT_HINT_USES) setSoundOutLabel(false);
        soundOut(this.audioManager, soundOutBtn.dataset.soundout, wordElementFor(soundOutBtn), null, soundOutBtn);
        return;
      }

      const speakerButton = target.closest('[data-speak]');
      if (speakerButton) {
        this.audioManager.speak(speakerButton.dataset.speak, { el: speakerButton });
        return;
      }

      const go = target.closest('[data-go]');
      if (go) {
        this.effectsManager.soundManager.resumeAudioContext();
        this.navigate(go.dataset.go);
        return;
      }

      const locked = target.closest('[data-locked]');
      if (locked) {
        const i = Number(locked.dataset.locked);
        this.uiManager.toast(`الوحدة ${i + 1} مقفلة. انجح في اختبارات الوحدة ${i} لتفتحها، أو حدّد مستواك من القائمة.`);
        return;
      }

      if (target.closest('[data-dismiss-notice]')) {
        this.stateManager.dismissUpdateNotice();
        target.closest('.home-notice')?.remove();
        return;
      }

      if (target.closest('[data-menu-close]')) {
        this.closeMenu();
        return;
      }

      if (target.closest('#teacher-off')) {
        this.teacherDashboard.teacher = false;
        if (parseRoute(location.hash).teacher) this.replace(routes.progress());
        else this.teacherDashboard.render({ teacher: false });
      }
    });
  }
}

// Start the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new ModernPhonicsApp();
});
