import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { AppProvider } from '../context/AppContext';

function ThrowingChild(): never {
  throw new Error('boom');
}

function Fine() {
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  it('renders children normally when there is no error', () => {
    render(
      <AppProvider>
        <ErrorBoundary>
          <Fine />
        </ErrorBoundary>
      </AppProvider>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders a fallback instead of crashing when a child throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AppProvider>
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      </AppProvider>
    );
    expect(screen.getByText(/algo salió mal|something went wrong/i)).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
