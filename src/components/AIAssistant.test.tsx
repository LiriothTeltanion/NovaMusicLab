import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AppProvider } from '../context/AppContext';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import AIAssistant, { buildSandboxGenreResponse, buildSandboxResponse } from './AIAssistant';

const data = defaultMusicData as unknown as MusicDnaData;

describe('AIAssistant accessibility', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.setItem('nml_lang', 'en');
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  });

  it('labels both inputs and exposes new messages through a polite log', () => {
    render(
      <AppProvider>
        <AIAssistant data={data} />
      </AppProvider>
    );

    expect(screen.getByRole('log', { name: 'Conversation with Nova' }))
      .toHaveAttribute('aria-live', 'polite');
    expect(screen.getByLabelText('Ask Nova about your music history')).toBeInTheDocument();
    expect(screen.getByLabelText('Gemini API key')).toHaveAttribute('aria-describedby', 'nova-api-key-description');
  });

  it('marks the Gemini destination as a safe new-tab link', () => {
    render(
      <AppProvider>
        <AIAssistant data={data} />
      </AppProvider>
    );

    const link = screen.getByRole('link', { name: /Get a free Gemini key.*opens in a new tab/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('keeps the Gemini key only in page memory and supports clear', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <AIAssistant data={data} />
      </AppProvider>
    );

    const input = screen.getByLabelText('Gemini API key');
    await user.type(input, 'test-session-key');

    expect(window.sessionStorage.getItem('nml_gemini_api_key_session')).toBeNull();
    expect(window.localStorage.getItem('nml_gemini_api_key')).toBeNull();
    expect(screen.getByText('Key held only in memory; it is never saved to browser storage.'))
      .toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Forget and clear key' }));
    expect(input).toHaveValue('');
    expect(window.sessionStorage.getItem('nml_gemini_api_key_session')).toBeNull();
    expect(window.localStorage.getItem('nml_gemini_api_key')).toBeNull();
  });

  it('renders complete Hebrew controls, status copy and RTL semantics', async () => {
    window.localStorage.setItem('nml_lang', 'he');

    render(
      <AppProvider>
        <AIAssistant data={data} />
      </AppProvider>
    );

    const conversation = await screen.findByRole('log', { name: 'שיחה עם Nova' });

    expect(document.documentElement).toHaveAttribute('lang', 'he');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(conversation).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByLabelText('שליחת שאלה ל-Nova על היסטוריית ההאזנה שלך'))
      .toHaveAttribute('placeholder', 'אפשר לשאול את Nova על היסטוריית ההאזנה שלך…');
    expect(screen.getByLabelText('מפתח API של Gemini'))
      .toHaveAttribute('aria-describedby', 'nova-api-key-description');
    expect(screen.getByRole('button', { name: 'ניקוי השיחה' })).toBeInTheDocument();
    expect(screen.getByText('תבניות לניתוח מהיר:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /קבלת מפתח Gemini בחינם.*נפתח בכרטיסייה חדשה/ }))
      .toHaveAttribute('target', '_blank');
    expect(screen.getByText('השמעות מתועדות')).toBeInTheDocument();
    expect(screen.getByText('אמנים ייחודיים')).toBeInTheDocument();
  });

  it('builds the sandbox genre reading from real shares instead of fixed claims', () => {
    const english = buildSandboxGenreResponse(data, 'en');
    const spanish = buildSandboxGenreResponse(data, 'es');
    const hebrew = buildSandboxGenreResponse(data, 'he');
    const syntheticHebrew = buildSandboxGenreResponse({
      ...data,
      core_metrics: { ...data.core_metrics, total_plays: 100 },
      top_genres: [
        { name: 'Unclassified', plays: 40 },
        { name: 'Alternative / Miscellaneous', plays: 30 },
        { name: 'Metalcore', plays: 20 },
        { name: 'Post-Hardcore', plays: 10 },
      ],
    }, 'he');
    const specificShare = ((data.top_genres[1].plays / data.core_metrics.total_plays) * 100).toFixed(1);
    const genericShare = ((data.top_genres[0].plays / data.core_metrics.total_plays) * 100).toFixed(1);

    expect(english).toContain(`**${specificShare}%**`);
    expect(english).toContain(`**${genericShare}%**`);
    expect(english).toContain('classification uncertainty');
    expect(english).not.toContain('45%');
    expect(spanish).toContain('incertidumbre de clasificación');
    expect(hebrew).toContain('חוסר ודאות בסיווג');
    expect(syntheticHebrew).toContain('אלטרנטיבי / שונות');
    expect(syntheticHebrew).toContain('לא מסווג');
    expect(syntheticHebrew).not.toContain('Alternative / Miscellaneous');
    expect(syntheticHebrew).not.toContain('Unclassified');
    expect(hebrew).toContain(new Intl.NumberFormat('he-IL').format(data.top_genres[0].plays));
    expect(hebrew).not.toContain('classification uncertainty');
    expect(hebrew).not.toContain('incertidumbre de clasificación');
  });

  it('answers every local sandbox route in idiomatic Hebrew', () => {
    const playlist = buildSandboxResponse(data, 'he', 'נא ליצור פלייליסט לבוקר');
    const obsessions = buildSandboxResponse(data, 'he', 'נתח את ההאזנה החוזרת שלי');
    const daypart = buildSandboxResponse(data, 'he', 'מהו חלון ההאזנה שלי?');
    const fallback = buildSandboxResponse(data, 'he', 'ספר לי משהו חדש על הארכיון');

    expect(playlist).toContain('פלייליסט מותאם אישית');
    expect(playlist).toContain('Deafheaven');
    expect(obsessions).toContain('סיכום דפוסי ההאזנה החוזרת');
    expect(obsessions).toContain('In Blur');
    expect(daypart).toContain('ניתוח חלון ההאזנה הדומיננטי');
    expect(daypart).toMatch(/בוקר|אחר הצהריים|ערב|לילה מאוחר/);
    expect(fallback).toContain('מצב ה-Sandbox של Nova');
    expect(fallback).toContain(new Intl.NumberFormat('he-IL').format(data.core_metrics.total_plays));
    expect([playlist, obsessions, daypart, fallback].join('\n')).not.toContain('escuchas');
  });

  it('builds playlist, repetition and daypart answers only from the active archive', () => {
    const foreignArchive: MusicDnaData = {
      ...data,
      core_metrics: { ...data.core_metrics, total_plays: 100 },
      top_artists: [
        { name: 'Signal Nomad', plays: 40, genre: 'Ambient', country: 'Iceland' },
        { name: 'Glass Harbour', plays: 25, genre: 'Art Pop', country: 'Canada' },
      ],
      top_tracks: [
        { artist: 'Signal Nomad', title: 'Glass Orbit', plays: 25, genre: 'Ambient' },
        { artist: 'Glass Harbour', title: 'Northern Static', plays: 15, genre: 'Art Pop' },
      ],
      top_genres: [
        { name: 'Ambient', plays: 55 },
        { name: 'Art Pop', plays: 45 },
      ],
      yearly_eras: data.yearly_eras.map((era, index) => ({
        ...era,
        plays: index === 0 ? 80 : 10,
        dominant_daypart: 'Noche 18-23',
      })),
    };

    const answers = [
      buildSandboxResponse(foreignArchive, 'en', 'suggest a playlist'),
      buildSandboxResponse(foreignArchive, 'en', 'analyze my obsession'),
      buildSandboxResponse(foreignArchive, 'en', 'explain my daypart'),
    ].join('\n');

    expect(answers).toContain('Glass Orbit');
    expect(answers).toContain('Signal Nomad');
    expect(answers).toContain('**25.0%**');
    expect(answers).toContain('**Ambient**');
    expect(answers).not.toContain('In Blur');
    expect(answers).not.toContain('Deafheaven');
    expect(answers).not.toContain('coding or working');
  });
});
