export type MuseumSoundCue = 'enter' | 'navigate' | 'open' | 'confirm';

const SOUND_STORAGE_KEY = 'nova-museum-sound';
const MIN_CUE_INTERVAL_MS = 90;

let sharedContext: AudioContext | null = null;
let lastCueAt = 0;
let visibilityListenerAttached = false;
let sessionSoundEnabled: boolean | null = null;

function audioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    ?? null;
}

export function getMuseumSoundEnabled(): boolean {
  if (sessionSoundEnabled !== null) return sessionSoundEnabled;
  if (typeof window === 'undefined') return true;
  try {
    sessionSoundEnabled = window.localStorage.getItem(SOUND_STORAGE_KEY) !== 'off';
  } catch {
    sessionSoundEnabled = true;
  }
  return sessionSoundEnabled;
}

function discardAudioContext(): void {
  const context = sharedContext;
  sharedContext = null;
  if (context && context.state !== 'closed') {
    void context.close().catch(() => {});
  }
}

export function setMuseumSoundEnabled(enabled: boolean): void {
  sessionSoundEnabled = enabled;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'subtle' : 'off');
    } catch {
      // Private browsing can reject persistence; the current session still works.
    }
  }

  if (!enabled) discardAudioContext();
}

function attachVisibilityListener(): void {
  if (visibilityListenerAttached || typeof document === 'undefined') return;
  visibilityListenerAttached = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) discardAudioContext();
  });
}

function getAudioContext(): AudioContext | null {
  if (sharedContext && sharedContext.state !== 'closed') return sharedContext;
  const AudioContextCtor = audioContextConstructor();
  if (!AudioContextCtor) return null;
  sharedContext = new AudioContextCtor();
  attachVisibilityListener();
  return sharedContext;
}

interface CueShape {
  frequencies: number[];
  duration: number;
  peak: number;
  attack: number;
  startFrequency?: number;
  endFrequency?: number;
  filterStart: number;
  filterEnd: number;
  oscillatorTypes: OscillatorType[];
}

const CUES: Record<MuseumSoundCue, CueShape> = {
  enter: {
    frequencies: [220, 329.63, 493.88],
    duration: 0.64,
    peak: 0.025,
    attack: 0.12,
    filterStart: 320,
    filterEnd: 1450,
    oscillatorTypes: ['sine', 'triangle', 'sine'],
  },
  navigate: {
    frequencies: [680],
    duration: 0.085,
    peak: 0.012,
    attack: 0.008,
    startFrequency: 620,
    endFrequency: 760,
    filterStart: 1900,
    filterEnd: 2900,
    oscillatorTypes: ['sine'],
  },
  open: {
    frequencies: [392, 587.33],
    duration: 0.18,
    peak: 0.018,
    attack: 0.018,
    filterStart: 850,
    filterEnd: 2200,
    oscillatorTypes: ['sine', 'triangle'],
  },
  confirm: {
    frequencies: [523.25, 659.25, 783.99],
    duration: 0.23,
    peak: 0.017,
    attack: 0.012,
    filterStart: 1100,
    filterEnd: 3200,
    oscillatorTypes: ['sine', 'sine', 'triangle'],
  },
};

/**
 * Plays a deliberately quiet semantic cue after a user gesture.
 * No samples, copyrighted audio or network requests are involved.
 */
export function playMuseumSound(cue: MuseumSoundCue): void {
  if (!getMuseumSoundEnabled()) return;

  const now = Date.now();
  if (now - lastCueAt < MIN_CUE_INTERVAL_MS) return;
  lastCueAt = now;

  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') {
      void context.resume().catch(() => {});
    }

    const shape = CUES[cue];
    const startsAt = context.currentTime + 0.008;
    const endsAt = startsAt + shape.duration;
    const master = context.createGain();
    const filter = context.createBiquadFilter();

    master.gain.setValueAtTime(0.0001, startsAt);
    master.gain.exponentialRampToValueAtTime(shape.peak, startsAt + shape.attack);
    master.gain.exponentialRampToValueAtTime(0.0001, endsAt);
    master.connect(context.destination);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(cue === 'enter' ? 1.1 : 0.7, startsAt);
    filter.frequency.setValueAtTime(shape.filterStart, startsAt);
    filter.frequency.exponentialRampToValueAtTime(shape.filterEnd, endsAt);
    filter.connect(master);

    shape.frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const voiceGain = context.createGain();
      oscillator.type = shape.oscillatorTypes[index % shape.oscillatorTypes.length];
      oscillator.frequency.setValueAtTime(shape.startFrequency ?? frequency, startsAt);
      if (shape.endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(shape.endFrequency, endsAt);
      }
      oscillator.detune.setValueAtTime(index % 2 === 0 ? -3 : 4, startsAt);
      voiceGain.gain.setValueAtTime(0.72 / shape.frequencies.length, startsAt);
      oscillator.connect(voiceGain);
      voiceGain.connect(filter);
      oscillator.start(startsAt);
      oscillator.stop(endsAt + 0.02);
    });
  } catch {
    // Sound is progressive enhancement. Navigation must never depend on it.
  }
}
