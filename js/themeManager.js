'use strict';

// Browser bar colour for each theme (its action colour).
const THEME_COLORS = { default: '#5A67D8', ocean: '#0369A1', forest: '#047857', sunset: '#C2410C' };

// Manages UI themes and the theme selector buttons.
export class ThemeManager {
    constructor() {
        // localStorage throws when the browser blocks site data; fall back to the default theme
        let savedTheme = null;
        try { savedTheme = localStorage.getItem('phonics-theme'); } catch {}
        this.currentTheme = THEME_COLORS[savedTheme] ? savedTheme : 'default';
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
