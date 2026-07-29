import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareFeedbackHub, { buildWhatsAppUrl, normalizeShareUrl } from './ShareFeedbackHub';

const SHARE_URL = 'https://liriothteltanion.github.io/NovaMusicLab/#/artist-identity';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ShareFeedbackHub', () => {
  it('builds safe share URLs and an encoded WhatsApp handoff', () => {
    expect(normalizeShareUrl(SHARE_URL)).toBe(SHARE_URL);
    expect(normalizeShareUrl('javascript:alert(1)')).toBeNull();
    expect(buildWhatsAppUrl('Nova & music')).toBe('https://wa.me/?text=Nova%20%26%20music');
  });

  it('renders a trilingual, local-only Spanish feedback flow', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <ShareFeedbackHub
        lang="es"
        shareUrl={SHARE_URL}
        inviterName="Kevin"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Invita a alguien al museo' })).toBeInTheDocument();
    expect(screen.getByText('Nada se envía automáticamente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir WhatsApp' })).toHaveAttribute('href', expect.stringContaining('wa.me'));

    await user.selectOptions(screen.getByLabelText('Perspectiva'), 'musician');
    await user.type(screen.getByLabelText('Notas'), 'La navegación es clara y quiero más créditos de músicos.');
    await user.click(screen.getByRole('button', { name: 'Copiar feedback' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Perspectiva: Músico'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('más créditos de músicos'));
    expect(screen.getByRole('status')).toHaveTextContent('Feedback copiado.');
  });

  it('uses the native share sheet when the browser exposes it', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });

    render(<ShareFeedbackHub lang="en" shareUrl={SHARE_URL} title="Nova Music Lab" />);
    await user.click(screen.getByRole('button', { name: 'Share' }));

    expect(share).toHaveBeenCalledWith({
      title: 'Nova Music Lab',
      text: expect.stringContaining('living personal music museum'),
      url: SHARE_URL,
    });
    expect(screen.getByRole('status')).toHaveTextContent('Share sheet opened.');
  });

  it('preserves Hebrew direction and rejects non-web links', () => {
    render(<ShareFeedbackHub lang="he" shareUrl="file:///private/archive.json" />);

    expect(screen.getByRole('region')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('alert')).toHaveTextContent('http');
    expect(screen.queryByRole('link', { name: 'פתיחה ב־WhatsApp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'שליחת משוב ב־WhatsApp' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'העתקת המשוב' })).toBeDisabled();
  });
});
