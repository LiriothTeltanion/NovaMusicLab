import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingTour from './OnboardingTour';
import { AppProvider } from '../context/AppContext';

describe('OnboardingTour', () => {
  // Assertions below are Spanish copy - pin the language explicitly instead
  // of relying on whatever the app's default language happens to be.
  beforeEach(() => {
    window.localStorage.setItem('nml_lang', 'es');
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('renders nothing when closed', () => {
    render(
      <AppProvider>
        <OnboardingTour open={false} onClose={vi.fn()} />
      </AppProvider>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows step 1 of 5 when opened', () => {
    render(
      <AppProvider>
        <OnboardingTour open onClose={vi.fn()} />
      </AppProvider>
    );
    expect(screen.getByText('Paso 1 de 5')).toBeInTheDocument();
    expect(screen.getByText('Bienvenido al Museo Sonoro')).toBeInTheDocument();
  });

  it('advances through every step and finishes on the last one', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onFinish = vi.fn();
    render(
      <AppProvider>
        <OnboardingTour open onClose={onClose} onFinish={onFinish} />
      </AppProvider>
    );

    for (let step = 2; step <= 5; step++) {
      await user.click(screen.getByRole('button', { name: /Siguiente|Empezar a explorar/ }));
      expect(screen.getByText(`Paso ${step} de 5`)).toBeInTheDocument();
    }

    expect(screen.getByRole('button', { name: 'Empezar a explorar' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Empezar a explorar' }));

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lets the user go back a step', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <OnboardingTour open onClose={vi.fn()} />
      </AppProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Paso 2 de 5')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(screen.getByText('Paso 1 de 5')).toBeInTheDocument();
  });

  it('closes without calling onFinish when skipped', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onFinish = vi.fn();
    render(
      <AppProvider>
        <OnboardingTour open onClose={onClose} onFinish={onFinish} />
      </AppProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Saltar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AppProvider>
        <OnboardingTour open onClose={onClose} />
      </AppProvider>
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the modal, traps Tab and restores the opener focus', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const tree = (open: boolean) => (
      <>
        <button type="button">Abrir recorrido</button>
        <AppProvider>
          <OnboardingTour open={open} onClose={onClose} />
        </AppProvider>
      </>
    );
    const { rerender } = render(tree(false));
    const opener = screen.getByRole('button', { name: 'Abrir recorrido' });
    opener.focus();

    rerender(tree(true));
    const next = screen.getByRole('button', { name: 'Siguiente' });
    await waitFor(() => expect(next).toHaveFocus());

    await user.tab();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(next).toHaveFocus();

    rerender(tree(false));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('closes when the modal backdrop is pressed', () => {
    const onClose = vi.fn();
    render(
      <AppProvider>
        <OnboardingTour open onClose={onClose} />
      </AppProvider>
    );

    const backdrop = screen.getByRole('dialog').parentElement;
    expect(backdrop).not.toBeNull();
    fireEvent.mouseDown(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders English copy when nml_lang is "en"', () => {
    window.localStorage.setItem('nml_lang', 'en');
    render(
      <AppProvider>
        <OnboardingTour open onClose={vi.fn()} />
      </AppProvider>
    );
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the Sound Museum')).toBeInTheDocument();
  });
});
