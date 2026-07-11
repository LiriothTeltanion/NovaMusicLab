import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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

  it('exposes the editorial protagonist and analytical chapters accessibly', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <Dashboard data={data} />
      </AppProvider>
    );

    expect(
      screen.getByRole('region', { name: 'A life measured in music' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open .+ in top artists/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Taste architecture' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Time signature' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The long arc' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Personal milestones' })).toBeInTheDocument();
  });

  it('provides purpose-built responsive ranking, heatmap and metric layouts', () => {
    localStorage.setItem('nml_lang', 'en');

    render(
      <AppProvider>
        <Dashboard data={data} />
      </AppProvider>
    );

    const layout = screen.getByTestId('dashboard-layout');
    expect(layout).toHaveClass('min-w-0', 'overflow-x-clip');

    const mobileRanking = screen.getByTestId('dashboard-mobile-top-artists');
    expect(mobileRanking).toHaveClass('md:hidden');
    const rankingButtons = within(mobileRanking).getAllByRole('button');
    expect(rankingButtons).toHaveLength(6);
    rankingButtons.forEach(button => expect(button).toHaveClass('min-h-[72px]'));

    const desktopRanking = screen.getByTestId('dashboard-desktop-top-artists');
    expect(desktopRanking).toHaveClass('hidden', 'md:block');
    expect(desktopRanking).toBeEmptyDOMElement();

    const mobileHeatmap = screen.getByTestId('dashboard-mobile-heatmap');
    expect(mobileHeatmap).toHaveClass('sm:hidden', 'min-w-0');
    expect(mobileHeatmap).toHaveAttribute('role', 'img');
    expect(mobileHeatmap.querySelectorAll('[title]')).toHaveLength(7 * 24);
    expect(screen.getByTestId('dashboard-desktop-heatmap')).toHaveClass('hidden', 'sm:block', 'overflow-x-auto');

    expect(screen.getByTestId('dashboard-supporting-grid')).toHaveClass('grid-cols-2', 'sm:grid-cols-3');
    expect(screen.getByTestId('dashboard-advanced-grid')).toHaveClass('grid-cols-1', 'min-[380px]:grid-cols-2');
    expect(screen.getByTestId('dashboard-record-grid')).toHaveClass('grid-cols-1', 'min-[380px]:grid-cols-2');
  });
});
