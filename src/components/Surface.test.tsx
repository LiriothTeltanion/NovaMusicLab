import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Surface from './Surface';

describe('Surface', () => {
  afterEach(cleanup);

  it('renders a static analysis surface by default', () => {
    render(<Surface data-testid="surface">Analysis</Surface>);

    const surface = screen.getByTestId('surface');
    expect(surface).toHaveClass('nova-surface', 'nova-surface--analysis');
    expect(surface).not.toHaveClass('nova-surface--interactive');
  });

  it('supports semantic elements and explicit interaction feedback', () => {
    render(
      <Surface as="article" variant="featured" interactive data-testid="surface">
        Featured exhibit
      </Surface>,
    );

    const surface = screen.getByTestId('surface');
    expect(surface.tagName).toBe('ARTICLE');
    expect(surface).toHaveClass('nova-surface--featured', 'nova-surface--interactive');
  });
});
