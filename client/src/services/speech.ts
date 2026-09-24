import type { Language } from '../types/vocabulary';

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private activeAudioElement: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.activeAudioElement) {
      this.activeAudioElement.pause();
      this.activeAudioElement = null;
    }
  }

  public speak(
    text: string,
    language: Language = 'en',
    options?: {
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: unknown) => void;
    }
  ): void {
    if (!this.synth) {
      options?.onError?.(new Error('SpeechSynthesis not supported'));
      return;
    }

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);

    // Rate: 0.88 default for clear school learning
    utterance.rate = options?.rate ?? 0.88;
    utterance.pitch = options?.pitch ?? 1.0;

    const voices = this.synth.getVoices();
    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (language === 'en') {
      utterance.lang = 'en-GB';
      selectedVoice =
        voices.find(v => v.lang.startsWith('en-GB') && (v.name.includes('Natural') || v.name.includes('Daniel') || v.name.includes('Serena'))) ||
        voices.find(v => v.lang.startsWith('en-GB')) ||
        voices.find(v => v.lang.startsWith('en-US') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Ava'))) ||
        voices.find(v => v.lang.startsWith('en')) ||
        null;
    } else if (language === 'la') {
      utterance.lang = 'it-IT';
      selectedVoice =
        voices.find(v => v.lang.startsWith('la')) ||
        voices.find(v => v.lang.startsWith('it')) ||
        null;
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      options?.onError?.(e);
      options?.onEnd?.();
    };

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis speak call failed', e);
      options?.onError?.(e);
    }
  }

  public playAudioDataUrl(
    dataUrl: string,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    this.stop();
    const audio = new Audio(dataUrl);
    this.activeAudioElement = audio;

    audio.onplay = () => onStart?.();
    audio.onended = () => {
      this.activeAudioElement = null;
      onEnd?.();
    };
    audio.onerror = () => {
      this.activeAudioElement = null;
      onEnd?.();
    };

    audio.play().catch(e => {
      console.warn('Could not play audio', e);
      onEnd?.();
    });
  }
}

export const speechService = new SpeechService();
