'use strict';

// Generates and plays synthesized audio tones for feedback.
export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
            this.enabled = false;
        }
    }

    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    playSuccessSound() {
        if (!this.enabled) return;
        this.resumeAudioContext();
        const frequencies = [523.25, 659.25, 783.99];
        frequencies.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.1, 'sine'), i * 100);
        });
    }

    playCorrectAnswer() {
        if (!this.enabled) return;
        this.resumeAudioContext();
        this.playTone(880, 0.15, 'sine');
        setTimeout(() => this.playTone(1108.73, 0.1, 'sine'), 100);
    }

    playWrongAnswer() {
        if (!this.enabled) return;
        this.resumeAudioContext();
        this.playTone(440, 0.2, 'triangle', 0.3);
        setTimeout(() => this.playTone(369.99, 0.15, 'triangle', 0.2), 150);
    }

    playAchievement() {
        if (!this.enabled) return;
        this.resumeAudioContext();
        const melody = [523.25, 659.25, 783.99, 1046.50];
        melody.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine'), i * 150);
        });
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => this.playTone(2093 + Math.random() * 200, 0.05, 'sine', 0.3), i * 50);
            }
        }, 600);
    }

    playTone(frequency, duration, waveType = 'sine', volume = 0.1) {
        if (!this.audioContext || !this.enabled) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = waveType;
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
}
