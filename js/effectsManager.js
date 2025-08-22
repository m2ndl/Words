'use strict';
import { SoundManager } from './soundManager.js';

// Manages visual effects like particles and floating emojis.
export class EffectsManager {
    constructor() {
        this.particleContainer = document.getElementById('particles-container');
        this.soundManager = new SoundManager();
    }

    createParticleExplosion(x, y, count = 8) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            // ⏬ reduced scatter distance (from 200 → 100px)
            const dx = (Math.random() - 0.5) * 100;
            const dy = (Math.random() - 0.5) * 100;
            particle.style.cssText = `
                left: ${x}px;
                top: ${y}px;
                --dx: ${dx}px;
                --dy: ${dy}px;
                background: hsl(${Math.random() * 360}, 70%, 60%);
            `;
            this.particleContainer.appendChild(particle);
            // ⏱️ shorter lifetime (1200ms instead of 2000ms)
            setTimeout(() => particle.remove(), 1200);
        }
    }

    createFloatingEmoji(emoji, x, y) {
        const element = document.createElement('div');
        element.className = 'floating-emoji';
        element.textContent = emoji;
        element.style.left = `${x || Math.random() * window.innerWidth}px`;
        element.style.top = `${y || window.innerHeight - 100}px`;
        document.body.appendChild(element);
        // ⏱️ quicker removal
        setTimeout(() => element.remove(), 1200);
    }

    createCelebrationBurst() {
        const emojis = ['🎉', '⭐', '✨', '🌟'];
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        this.createParticleExplosion(centerX, centerY, 12);
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const x = centerX + (Math.random() - 0.5) * 150; // ⏬ reduced from 300
                const y = centerY + (Math.random() - 0.5) * 80;  // ⏬ reduced from 150
                this.createFloatingEmoji(
                    emojis[Math.floor(Math.random() * emojis.length)], 
                    x, 
                    y
                );
            }, i * 120);
        }
        this.soundManager.playAchievement();
    }

    createQuickCelebration() {
        const emojis = ['⭐', '✨'];
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createFloatingEmoji(
                    emojis[Math.floor(Math.random() * emojis.length)],
                    window.innerWidth / 2 + (Math.random() - 0.5) * 100, // ⏬ reduced from 200
                    window.innerHeight / 2
                );
            }, i * 100);
        }
        this.soundManager.playCorrectAnswer();
    }

    createSuccessRipple(element) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(72, 187, 120, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = rect.left + rect.width / 2 - size / 2 + 'px';
        ripple.style.top = rect.top + rect.height / 2 - size / 2 + 'px';
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);

        if (!document.getElementById('ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        this.soundManager.playSuccessSound();
    }

    playWrongSound() {
        this.soundManager.playWrongAnswer();
    }
}
