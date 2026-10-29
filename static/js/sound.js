/**
 * Web Audio API Sound Synthesizer
 * Provides instant sound effects & musical playback without external MP3s!
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, duration = 0.15, type = 'sine', gainVal = 0.2) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Sound: Card selection click
  cardClick() {
    this.playTone(520, 0.08, 'triangle', 0.15);
  }

  // Sound: Card pass swish
  cardPass() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {}
  }

  // Sound: Buzzer / Error
  buzzer() {
    this.playTone(180, 0.35, 'sawtooth', 0.25);
  }

  // Sound: Ding / Correct answer
  ding() {
    this.playTone(880, 0.3, 'sine', 0.25);
    setTimeout(() => this.playTone(1320, 0.4, 'sine', 0.2), 100);
  }

  // Sound: Victory Fanfare!
  fanfare() {
    const notes = [
      { f: 523, d: 0.12 }, // C5
      { f: 659, d: 0.12 }, // E5
      { f: 784, d: 0.15 }, // G5
      { f: 1046, d: 0.4 }  // C6
    ];
    let time = 0;
    notes.forEach(n => {
      setTimeout(() => this.playTone(n.f, n.d, 'triangle', 0.25), time);
      time += n.d * 1000 + 40;
    });
  }

  // Play custom melody note sequence for "Guess the Song"
  playMelody(melodyList, onFinish = null) {
    if (this.muted) {
      if (onFinish) onFinish();
      return;
    }
    this.init();
    if (!this.ctx) {
      if (onFinish) onFinish();
      return;
    }

    let delay = 0;
    melodyList.forEach(([freq, durationMs, pauseMs], idx) => {
      setTimeout(() => {
        this.playTone(freq, durationMs / 1000, 'square', 0.18);
      }, delay);
      delay += durationMs + pauseMs;
    });

    if (onFinish) {
      setTimeout(() => {
        onFinish();
      }, delay + 200);
    }
  }
}

window.soundEngine = new SoundEngine();

