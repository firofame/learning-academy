class AudioEngine {
  private synth: SpeechSynthesis | null = null;
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

  public stopAll() {
    this.synth?.cancel();
  }
}

export const audioService = new AudioEngine();
