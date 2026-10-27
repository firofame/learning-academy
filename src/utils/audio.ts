/**
 * Audio and Speech Synthesis Engine
 * Uses Web Speech API for voice pronunciation and Web Audio API for gentle auditory feedback.
 */

class AudioEngine {
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;
  public speechEnabled: boolean = true;
  public slowMode: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Speak a word or sentence with proper language tagging and speed.
   */
  public speak(text: string, lang: 'en-US' | 'hi-IN' | 'ml-IN' = 'en-US', onEnd?: () => void): boolean {
    if (!this.speechEnabled || !this.synth) {
      if (onEnd) setTimeout(onEnd, 300);
      return false;
    }

    try {
      this.synth.cancel(); // Stop any pending utterance

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = this.slowMode ? 0.72 : 0.9;
      utterance.pitch = 1.05; // Slightly warmer/friendly pitch for children

      // Try finding the best matched voice
      const voices = this.synth.getVoices();
      const matchedVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0])) || null;
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      if (onEnd) {
        utterance.onend = () => onEnd();
        utterance.onerror = () => onEnd();
      }

      this.synth.speak(utterance);
      return true;
    } catch {
      if (onEnd) onEnd();
      return false;
    }
  }

  /**
   * Spell out letters one by one clearly: "B ... I ... C ... Y ... C ... L ... E"
   */
  public spellOut(letters: string[], onLetterSpeak?: (index: number) => void, onComplete?: () => void) {
    if (!this.speechEnabled || !this.synth) {
      if (onComplete) onComplete();
      return;
    }

    this.synth.cancel();
    let currentIndex = 0;

    const speakNext = () => {
      if (currentIndex >= letters.length) {
        if (onComplete) onComplete();
        return;
      }

      const letter = letters[currentIndex];
      if (letter.trim() === '') {
        currentIndex++;
        setTimeout(speakNext, 300);
        return;
      }

      if (onLetterSpeak) {
        onLetterSpeak(currentIndex);
      }

      const utterance = new SpeechSynthesisUtterance(letter);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.pitch = 1.1;

      utterance.onend = () => {
        currentIndex++;
        setTimeout(speakNext, 350);
      };

      utterance.onerror = () => {
        currentIndex++;
        setTimeout(speakNext, 200);
      };

      this.synth?.speak(utterance);
    };

    speakNext();
  }

  /**
   * Gentle, cheerful success chime (Marimba chord: C5 - E5 - G5 - C6)
   */
  public playGentleSuccess() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + i * 0.08);

      gain.gain.setValueAtTime(0.001, startTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + i * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + i * 0.08);
      osc.stop(startTime + i * 0.08 + 0.4);
    });
  }

  /**
   * Gentle, soft guidance chime for thoughtful pause (soft low bell, never a harsh buzzer)
   */
  public playGentlePrompt() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc.frequency.exponentialRampToValueAtTime(349.23, ctx.currentTime + 0.3); // F4

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }

  /**
   * Click / Tile pop sound
   */
  public playTileTap() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.07);
  }

  public stopAll() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const audioService = new AudioEngine();
