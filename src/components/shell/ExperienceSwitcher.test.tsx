import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EXPERIENCE_DEPTH_STORAGE_KEY } from './museumNavigation';
import { ExperienceProvider } from '../../context/ExperienceContext';
import ExperienceSwitcher from './ExperienceSwitcher';
import type { Lang } from '../../utils/i18n';

function renderSwitcher(lang: Lang) {
  return render(
    <ExperienceProvider>
      <ExperienceSwitcher lang={lang} />
    </ExperienceProvider>,
  );
}

describe('ExperienceSwitcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('offers the three experience depths in English and starts in explore', () => {
    renderSwitcher('en');

    const guided = screen.getByRole('button', { name: 'Guided' });
    expect(screen.getByRole('group', { name: 'Choose experience depth' })).toBeInTheDocument();
    expect(guided).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Explore' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Deep Dive' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Browse every room with brief, clear context.')).toBeVisible();
  });

  it('changes the active depth and persists it', async () => {
    const user = userEvent.setup();
    renderSwitcher('en');

    const deepDive = screen.getByRole('button', { name: 'Deep Dive' });
    await user.click(deepDive);

    expect(deepDive).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Show methods, sources, limits and advanced controls.')).toBeVisible();
    expect(window.localStorage.getItem(EXPERIENCE_DEPTH_STORAGE_KEY)).toBe('deep-dive');
  });

  it('renders complete Spanish labels and descriptions', () => {
    renderSwitcher('es');

    expect(screen.getByRole('group', { name: 'Elegir nivel de experiencia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guiado' })).toHaveAttribute(
      'title',
      'Te acompaña paso a paso con explicaciones simples.',
    );
    expect(screen.getByRole('button', { name: 'Explorar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A fondo' })).toBeInTheDocument();
    expect(screen.getByText('Recorre todas las salas con contexto breve y claro.')).toBeVisible();
  });

  it('renders Hebrew in RTL with localized accessible labels', () => {
    renderSwitcher('he');

    const switcher = screen.getByTestId('experience-switcher');
    expect(switcher).toHaveAttribute('dir', 'rtl');
    expect(switcher).toHaveAccessibleName('בחירת עומק החוויה');
    expect(screen.getByRole('button', { name: 'מודרך' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'חקירה' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'צלילה לעומק' })).toBeInTheDocument();
    expect(screen.getByText('מעבר חופשי בין כל החדרים, עם הקשר קצר וברור.')).toBeVisible();
  });
});
