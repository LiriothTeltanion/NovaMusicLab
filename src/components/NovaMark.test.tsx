import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import NovaMark from './NovaMark';

describe('NovaMark', () => {
  afterEach(cleanup);

  it('is decorative by default and keeps its intrinsic square size', () => {
    const { container } = render(<NovaMark data-testid="mark" />);
    const mark = screen.getByTestId('mark');

    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark).toHaveAttribute('focusable', 'false');
    expect(mark).toHaveAttribute('width', '40');
    expect(mark).toHaveAttribute('height', '40');
    expect(container.querySelector('title')).not.toBeInTheDocument();
  });

  it('becomes a named image when a title is provided', () => {
    render(<NovaMark title="Nova Music Lab" size={64} />);

    expect(screen.getByRole('img', { name: 'Nova Music Lab' })).toHaveAttribute('width', '64');
  });

  it('can expose the symbol without its app-tile surface', () => {
    const { container } = render(<NovaMark data-testid="mark" surface={false} />);

    expect(container.querySelectorAll('rect')).toHaveLength(1);
    expect(screen.getByTestId('mark').querySelector('g')).not.toHaveAttribute('clip-path');
  });

  it('uses unique paint references when several marks share a document', () => {
    const { container } = render(
      <>
        <NovaMark />
        <NovaMark />
      </>,
    );
    const ids = [...container.querySelectorAll('linearGradient')].map(gradient => gradient.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
