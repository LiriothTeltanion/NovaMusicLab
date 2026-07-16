import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import CreatorCvLink from './CreatorCvLink';

describe('CreatorCvLink', () => {
  afterEach(cleanup);

  it('does not render a broken CTA when no reviewed public CV URL exists', () => {
    const { container } = render(<CreatorCvLink lang="en" variant="hero" />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('opens an explicitly configured HTTPS CV safely', () => {
    render(
      <CreatorCvLink
        lang="en"
        variant="hero"
        href="https://example.com/kevin-cusnir-public-cv.pdf"
      />,
    );

    const link = screen.getByRole('link', { name: /open kevin cusnir's public cv/i });
    expect(link).toHaveAttribute('href', 'https://example.com/kevin-cusnir-public-cv.pdf');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('View my CV');
  });

  it('rejects local, relative and insecure destinations', () => {
    const { rerender } = render(
      <CreatorCvLink lang="es" variant="menu" href="/cv/private.pdf" />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    rerender(<CreatorCvLink lang="es" variant="menu" href="http://example.com/cv.pdf" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps Hebrew CTA copy localized when a reviewed URL is supplied', () => {
    render(
      <CreatorCvLink
        lang="he"
        variant="hero"
        href="https://example.com/kevin-cusnir-public-cv-he.pdf"
      />,
    );

    const link = screen.getByRole('link', { name: /קורות החיים הציבוריים של קווין קוסניר/i });
    expect(link).toHaveTextContent('לצפייה בקורות החיים');
  });
});
