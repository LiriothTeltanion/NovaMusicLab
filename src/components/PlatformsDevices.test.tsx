import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import PlatformsDevices from './PlatformsDevices';

const data = musicData as unknown as MusicDnaData;

describe('PlatformsDevices normalized distribution', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows privacy-safe device families based on the complete denominator', () => {
    localStorage.setItem('nml_lang', 'en');
    const fixture = {
      ...data,
      platform_breakdown: [
        { platform: 'Android OS 11 API 30 (Xiaomi, Mi 10)', plays: 70 },
        { platform: 'android', plays: 30 },
        { platform: 'Windows 10 (10.0.19041; x64; AppX)', plays: 50 },
        { platform: 'Partner android_tv Xiaomi;MIBOX4;756a522d9f1648b89e76e80be654456a;;tpapi', plays: 25 },
      ],
    } as MusicDnaData;
    render(<AppProvider><PlatformsDevices data={fixture} /></AppProvider>);

    expect(screen.getByText(/all 3 normalized families/i)).toBeInTheDocument();
    expect(screen.getAllByText('Android phone').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Android OS 11 API 30/)).not.toBeInTheDocument();
    expect(screen.queryByText(/756a522d9f1648b89e76e80be654456a/)).not.toBeInTheDocument();
  });

  it('localizes descriptive platform families in Hebrew', async () => {
    localStorage.setItem('nml_lang', 'he');
    const fixture = {
      ...data,
      platform_breakdown: [
        { platform: 'android', plays: 30 },
        { platform: 'web player', plays: 20 },
      ],
    } as MusicDnaData;

    render(<AppProvider><PlatformsDevices data={fixture} /></AppProvider>);

    expect((await screen.findAllByText('טלפון Android')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('נגן רשת').length).toBeGreaterThan(0);
    expect(screen.queryByText('Android phone')).not.toBeInTheDocument();
  });
});
