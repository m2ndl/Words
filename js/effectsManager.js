'use strict';
import { SoundManager } from './soundManager.js';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Sounds for right and wrong answers, and a short celebration for passing a test or finishing a unit.
export class EffectsManager {
  constructor() {
    this.particleContainer = document.getElementById('particles-container');
    this.soundManager = new SoundManager();
  }

  clearEffects() {
    // Remove particles and floating emojis immediately
    if (this.particleContainer) this.particleContainer.innerHTML = '';
    document.querySelectorAll('.floating-emoji').forEach(el => el.remove());
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
      setTimeout(() => particle.remove(), 900);
    }
  }

  createFloatingEmoji(emoji, x, y) {
    const element = document.createElement('div');
    element.className = 'floating-emoji';
    element.textContent = emoji;
    element.setAttribute('aria-hidden', 'true');
    element.style.left = `${x || Math.random() * window.innerWidth}px`;
    element.style.top = `${y || window.innerHeight - 100}px`;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 1000);
  }

  // Passing a test or finishing a unit. Without motion when the device asks for less motion.
  createCelebrationBurst() {
    this.soundManager.playAchievement();
    if (reducedMotion()) return;
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
  }

  playCorrectSound() {
    this.soundManager.playCorrectAnswer();
  }

  playWrongSound() {
    this.soundManager.playWrongAnswer();
  }
}
