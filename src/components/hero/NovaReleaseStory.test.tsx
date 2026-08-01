import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import NovaReleaseStory from './NovaReleaseStory';

afterEach(cleanup);

describe('NovaReleaseStory', () => {
  it('explains the current candidate in human Spanish', () => {
    render(<NovaReleaseStory lang="es" />);

    expect(screen.getByRole('heading', { name: 'La historia de Nova' })).toBeInTheDocument();
    expect(screen.getByText('v1.5.0')).toBeInTheDocument();
    expect(screen.getByText('El archivo vivo cobra rostro')).toBeInTheDocument();
    expect(screen.getByText(/placeholders rotos/)).toBeInTheDocument();
  });

  it('reveals earlier releases without creating another route', async () => {
    render(<NovaReleaseStory lang="en" />);

    await userEvent.click(screen.getByText('Explore earlier chapters'));
    expect(screen.getByText('v1.2.0')).toBeInTheDocument();
    expect(screen.getByText('Five Hubs, Three Depths')).toBeInTheDocument();
  });

  it('keeps Hebrew content in RTL', () => {
    const { container } = render(<NovaReleaseStory lang="he" />);
    expect(container.firstElementChild).toHaveAttribute('dir', 'rtl');
  });
});
