import { beforeEach, describe, expect, it, vi } from 'vitest';

function fakeAudioContext() {
  const audioParam = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  } as unknown as AudioParam;
  const connect = vi.fn();
  const context = {
    currentTime: 1,
    state: 'running',
    destination: {},
    createGain: vi.fn(() => ({ gain: audioParam, connect })),
    createBiquadFilter: vi.fn(() => ({
      type: 'lowpass',
      Q: audioParam,
      frequency: audioParam,
      connect,
    })),
    createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: audioParam,
      detune: audioParam,
      connect,
      start: vi.fn(),
      stop: vi.fn(),
    })),
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  } as unknown as AudioContext;

  return context;
}

describe('sonicFeedback', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('persists the explicit off preference and remains silent', async () => {
    const context = fakeAudioContext();
    const constructor = vi.fn(function FakeAudioContext() {
      return context;
    });
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: constructor,
    });
    const sound = await import('./sonicFeedback');

    sound.setMuseumSoundEnabled(false);
    sound.playMuseumSound('enter');

    expect(window.localStorage.getItem('nova-museum-sound')).toBe('off');
    expect(constructor).not.toHaveBeenCalled();
  });

  it('uses Web Audio without loading an external media asset', async () => {
    const context = fakeAudioContext();
    const constructor = vi.fn(function FakeAudioContext() {
      return context;
    });
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: constructor,
    });
    const sound = await import('./sonicFeedback');

    sound.setMuseumSoundEnabled(true);
    sound.playMuseumSound('open');

    expect(constructor).toHaveBeenCalledTimes(1);
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
    expect(context.createGain).toHaveBeenCalled();
  });

  it('keeps the off choice in memory when browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    const context = fakeAudioContext();
    const constructor = vi.fn(function FakeAudioContext() {
      return context;
    });
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: constructor,
    });
    const sound = await import('./sonicFeedback');

    sound.setMuseumSoundEnabled(false);
    sound.playMuseumSound('navigate');

    expect(sound.getMuseumSoundEnabled()).toBe(false);
    expect(constructor).not.toHaveBeenCalled();
  });
});
