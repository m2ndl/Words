'use strict';

// Browser bar colour for each theme (its action colour).
const THEME_COLORS = { default: '#0A2F3A', ocean: '#0369A1', forest: '#047857', sunset: '#C2410C' };

// Manages UI themes and the theme selector buttons.
export class ThemeManager {
    constructor() {
        // The theme picker was retired: everyone gets the default theme, whatever an earlier choice or an imported
        // progress file says (the app's look is styled for the default theme only).
        this.currentTheme = 'default';
        this.applyTheme(this.currentTheme);
        this.initThemeSelector();
    }

    applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        this.currentTheme = themeName;
        try { localStorage.setItem('phonics-theme', themeName); } catch {}

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.setAttribute('aria-pressed', String(btn.dataset.theme === themeName));
        });
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[themeName] || THEME_COLORS.default);
    }

    initThemeSelector() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => this.applyTheme(btn.dataset.theme));
        });
    }
}
