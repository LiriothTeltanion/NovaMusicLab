import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import SectionNarrative from './SectionNarrative';
import MethodologyPanel from './MethodologyPanel';

// The collapsed-by-default convention: intro/tutorial prose must not push a
// section's actual data below the fold, but one click must reveal ALL of it
// (body, insights, dataNote, deepDive) - including the honesty disclaimers.

const narrativeContent = {
  eyebrow: 'Test eyebrow',
  title: 'Test narrative title',
  body: 'The long interpretive body text.',
  insights: [
    { title: 'Insight A', body: 'Alpha body' },
    { title: 'Insight B', body: 'Beta body' },
  ],
  dataNote: 'An honesty note about the data.',
  deepDive: 'The deep reading paragraph.',
  deepDiveLabel: 'Deep reading',
} as const;

describe('SectionNarrative collapse behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('nml_lang', 'en');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders collapsed by default: title visible, prose hidden', () => {
    render(
      <AppProvider>
        <SectionNarrative content={narrativeContent} />
      </AppProvider>,
    );

    expect(screen.getByText('Test narrative title')).toBeInTheDocument();
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
    expect(screen.queryByText('The long interpretive body text.')).not.toBeInTheDocument();
    expect(screen.queryByText('Insight A')).not.toBeInTheDocument();
    expect(screen.queryByText('An honesty note about the data.')).not.toBeInTheDocument();
  });

  it('one click reveals body, insights and the data-honesty note', () => {
    render(
      <AppProvider>
        <SectionNarrative content={narrativeContent} />
      </AppProvider>,
    );

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
    expect(screen.getByText('The long interpretive body text.')).toBeInTheDocument();
    expect(screen.getByText('Insight A')).toBeInTheDocument();
    expect(screen.getByText('Insight B')).toBeInTheDocument();
    expect(screen.getByText('An honesty note about the data.')).toBeInTheDocument();
    // deepDive stays behind its own <details> toggle but must be in the DOM
    expect(screen.getByText('The deep reading paragraph.')).toBeInTheDocument();
  });

  it('collapses back on a second click', () => {
    render(
      <AppProvider>
        <SectionNarrative content={narrativeContent} />
      </AppProvider>,
    );

    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByRole('button', { expanded: true }));

    expect(screen.queryByText('The long interpretive body text.')).not.toBeInTheDocument();
  });
});

describe('MethodologyPanel collapse behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('nml_lang', 'en');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders collapsed by default and expands stats and points on click', () => {
    render(
      <AppProvider>
        <MethodologyPanel
          eyebrow="Method eyebrow"
          title="Method title"
          subtitle="Method subtitle prose."
          points={[{ title: 'Point one', tag: 'tag-1', body: 'Point one body.' }]}
          stats={[{ label: 'Stat label', value: '42' }]}
        />
      </AppProvider>,
    );

    expect(screen.getByText('Method title')).toBeInTheDocument();
    expect(screen.queryByText('Method subtitle prose.')).not.toBeInTheDocument();
    expect(screen.queryByText('Point one body.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByText('Method subtitle prose.')).toBeInTheDocument();
    expect(screen.getByText('Stat label')).toBeInTheDocument();
    expect(screen.getByText('Point one body.')).toBeInTheDocument();
  });
});
