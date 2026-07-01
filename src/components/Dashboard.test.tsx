import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';

const data = musicData as unknown as MusicDnaData;

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders successfully with real fixture data', () => {
    render(
      <AppProvider>
        <Dashboard data={data} />
      </AppProvider>
    );

    // "Personal Records" / "Récords Personales" heading should always be present
    // regardless of language, confirming the component rendered without throwing.
    expect(
      screen.getByText(/personal records|récords personales/i)
    ).toBeInTheDocument();
  });

  it('shows English KPI labels when nml_lang is set to "en"', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <Dashboard data={data} />
      </AppProvider>
    );

    expect(screen.getByText('Total Plays')).toBeInTheDocument();
    expect(screen.getByText('Hours Listened')).toBeInTheDocument();
  });

  it('shows Spanish KPI labels when nml_lang is set to "es"', () => {
    localStorage.setItem('nml_lang', 'es');

    render(
      <AppProvider>
        <Dashboard data={data} />
      </AppProvider>
    );

    expect(screen.getByText('Plays Totales')).toBeInTheDocument();
    expect(screen.getByText('Horas Escuchadas')).toBeInTheDocument();
  });
});
