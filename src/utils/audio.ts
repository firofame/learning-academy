class AudioEngine {
  private synth: SpeechSynthesis | null = null;
  private context: AudioContext | null = null;
  private tones = new Set<OscillatorNode>();
  private playbackGeneration = 0;
  public speechAudio = true;
  public slowSpeech = false;

  public get speechEnabled(): boolean {
    return this.speechAudio;
  }
  public set speechEnabled(value: boolean) {
    this.speechAudio = value;
  }

  public get slowMode(): boolean {
    return this.slowSpeech;
  }
  public set slowMode(value: boolean) {
    this.slowSpeech = value;
  }

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public speak(text: string, lang: 'en-US' | 'hi-IN' | 'ml-IN' = 'en-US', onEnd?: () => void): boolean {
    if (!this.speechAudio || !this.synth) {
      if (onEnd) setTimeout(onEnd, 300);
      return false;
    }

    try {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = this.slowSpeech ? 0.72 : 0.9;
      utterance.pitch = 1.05;

      const language = lang.split('-')[0];
      const voice = this.synth.getVoices().find(candidate => candidate.lang.startsWith(language));
      if (voice) utterance.voice = voice;

      if (onEnd) {
        utterance.onend = onEnd;
        utterance.onerror = onEnd;
      }

      this.synth.speak(utterance);
      return true;
    } catch {
      if (onEnd) onEnd();
      return false;
    }
  }

  public async playFeedback(kind: 'correct' | 'review' | 'complete'): Promise<void> {
    if (!this.speechAudio || typeof window === 'undefined' || !window.AudioContext) return;
    const generation = this.playbackGeneration;
    try {
      this.context ??= new window.AudioContext();
      const context = this.context;
      if (context.state === 'suspended') await context.resume();
      if (!this.speechAudio || generation !== this.playbackGeneration) return;
      const notes = kind === 'complete' ? [523.25, 659.25, 783.99]
        : kind === 'correct' ? [523.25, 659.25] : [392];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * 0.12;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.035, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          this.tones.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + 0.18);
        this.tones.add(oscillator);
      });
    } catch (cause) {
      console.warn('Celebration audio is unavailable. Revision can continue without sound.', cause);
    }
  }

  public stopAll() {
    this.synth?.cancel();
    this.playbackGeneration++;
    this.tones.forEach(tone => tone.stop());
    this.tones.clear();
  }
}

export const audioService = new AudioEngine();
