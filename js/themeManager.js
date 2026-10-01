'use strict';

// Manages UI themes and the theme selector buttons.
export class ThemeManager {
    constructor() {
        // localStorage throws when the browser blocks site data; fall back to the default theme
        let savedTheme = null;
        try { savedTheme = localStorage.getItem('phonics-theme'); } catch {}
        this.currentTheme = savedTheme || 'default';
        this.applyTheme(this.currentTheme);
        this.initThemeSelector();
    }

    applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        this.currentTheme = themeName;
        try { localStorage.setItem('phonics-theme', themeName); } catch {}
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === themeName);
        });
    }

    initThemeSelector() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyTheme(btn.dataset.theme);
                this.createThemeChangeEffect();
            });
        });
    }

    createThemeChangeEffect() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.3);
            z-index: 9999;
            pointer-events: none;
            animation: theme-flash 0.3s ease-out;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes theme-flash {
                0% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.remove();
            style.remove();
        }, 300);
    }
}
