'use strict';
import { SoundManager } from './soundManager.js';

// Manages visual effects like particles and floating emojis.
export class EffectsManager {
  constructor() {
    this.particleContainer = document.getElementById('particles-container');
    this.soundManager = new SoundManager();
  }

  clearEffects() {
    // Remove particles, floating emojis, and ripples immediately
    if (this.particleContainer) this.particleContainer.innerHTML = '';
    document.querySelectorAll('.floating-emoji').forEach(el => el.remove());
    document.querySelectorAll('.ripple-effect').forEach(el => el.remove());
  }

  createParticleExplosion(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const dx = (Math.random() - 0.5) * 200;
      const dy = (Math.random() - 0.5) * 200;
      particle.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        --dx: ${dx}px;
        --dy: ${dy}px;
        background: hsl(${Math.random() * 360}, 70%, 60%);
      `;
      this.particleContainer.appendChild(particle);
      // faster cleanup: match CSS 0.9s
      setTimeout(() => particle.remove(), 900);
    }
  }

  createFloatingEmoji(emoji, x, y) {
    const element = document.createElement('div');
    element.className = 'floating-emoji';
    element.textContent = emoji;
    element.style.left = `${x || Math.random() * window.innerWidth}px`;
    element.style.top = `${y || window.innerHeight - 100}px`;
    document.body.appendChild(element);
    // FIXED: Reduced cleanup time to match gentler animation (1s)
    setTimeout(() => element.remove(), 1000);
}

  createCelebrationBurst() {
    const emojis = ['🎉', '⭐', '✨', '🌟'];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    this.createParticleExplosion(centerX, centerY, 12);
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const x = centerX + (Math.random() - 0.5) * 300;
        const y = centerY + (Math.random() - 0.5) * 150;
        this.createFloatingEmoji(emojis[Math.floor(Math.random() * emojis.length)], x, y);
      }, i * 100);
    }
    this.soundManager.playAchievement();
  }

  createQuickCelebration() {
    // FIXED: Reduced to just 1 subtle emoji instead of 3
    const emojis = ['⭐', '✨'];
    this.createFloatingEmoji(
      emojis[Math.floor(Math.random() * emojis.length)],
      window.innerWidth / 2 + (Math.random() - 0.5) * 100,
      window.innerHeight / 2
    );
    this.soundManager.playCorrectAnswer();
}

  createSuccessRipple(element) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple-effect';
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
          to { transform: scale(4); opacity: 0; }
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
