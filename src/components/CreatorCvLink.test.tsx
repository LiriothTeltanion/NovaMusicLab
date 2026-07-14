import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import CreatorCvLink, { CREATOR_CV_PATHS } from './CreatorCvLink';

describe('CreatorCvLink', () => {
  afterEach(cleanup);

  it('opens the English CV safely from the Hero', () => {
    render(<CreatorCvLink lang="en" variant="hero" />);

    const link = screen.getByRole('link', { name: /open kevin cusnir's cv in a new tab/i });
    expect(link).toHaveAttribute('href', CREATOR_CV_PATHS.en);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('View my CV');
  });

  it('selects the Spanish PDF when the interface is Spanish', () => {
    render(<CreatorCvLink lang="es" variant="menu" />);

    const link = screen.getByRole('link', { name: /abrir el cv de kevin cusnir/i });
    expect(link).toHaveAttribute('href', CREATOR_CV_PATHS.es);
    expect(link).toHaveTextContent('Ver mi CV');
  });

  it('uses Hebrew copy and transparently falls back to the English PDF', () => {
    render(<CreatorCvLink lang="he" variant="hero" />);

    const link = screen.getByRole('link', { name: /קורות החיים של קווין קוסניר באנגלית/i });
    expect(link).toHaveAttribute('href', CREATOR_CV_PATHS.en);
    expect(CREATOR_CV_PATHS.he).toBe(CREATOR_CV_PATHS.en);
    expect(link).toHaveTextContent('לצפייה בקורות החיים (באנגלית)');
  });
});
