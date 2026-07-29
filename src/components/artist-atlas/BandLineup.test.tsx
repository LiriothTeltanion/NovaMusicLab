import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AppProvider } from '../../context/AppContext';
import BandLineup from './BandLineup';
import { ARTIST_ATLAS_COPY } from './atlasCopy';
import type { OfflineArtistBandMember } from '../../utils/offlineArtistKnowledge';

const copy = ARTIST_ATLAS_COPY.en;

const members: OfflineArtistBandMember[] = [
  { name: 'Oliver Sykes', roles: ['lead vocals'], begin: '2004', end: null, current: true },
  { name: 'Lee Malia', roles: ['guitar'], begin: '2004', end: null, current: true },
  { name: 'Curtis Ward', roles: ['guitar'], begin: '2004', end: '2009', current: false },
];

function renderLineup(lineup = members) {
  return render(
    <AppProvider>
      <BandLineup band="Bring Me the Horizon" members={lineup} copy={copy} accent="#22d3ee" />
    </AppProvider>,
  );
}

describe('BandLineup', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders current members with roles and hides former ones behind a disclosure', () => {
    renderLineup();

    expect(screen.getByRole('heading', { name: copy.lineupTitle, level: 4 })).toBeInTheDocument();
    expect(screen.getByText('Oliver Sykes')).toBeInTheDocument();
    expect(screen.getByText('Lee Malia')).toBeInTheDocument();

    // Former members are present but collapsed, not promoted next to the
    // current lineup - they are history, not the band as it stands.
    expect(screen.getByText(copy.lineupFormerCount(1))).toBeInTheDocument();
  });

  it('renders nothing when the artist has no documented lineup', () => {
    const { container } = renderLineup([]);
    // A solo act legitimately has no members. Showing an empty "Lineup" shell
    // would read as missing data rather than an accurate absence.
    expect(container).toBeEmptyDOMElement();
  });

  it('opens a member card on click and closes it again', async () => {
    const user = userEvent.setup();
    renderLineup();

    const trigger = screen.getByRole('button', { name: `${copy.memberOpenHint}: Oliver Sykes` });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const card = screen.getByRole('group', { name: 'Oliver Sykes' });
    expect(within(card).getByText(copy.memberAlsoIn)).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: copy.memberClose }));
    expect(screen.queryByRole('group', { name: 'Oliver Sykes' })).not.toBeInTheDocument();
  });

  it('states plainly when no free portrait is on record instead of inventing one', async () => {
    const user = userEvent.setup();
    // A name that cannot appear in member_enrichment.json, so the honest
    // "no portrait" note is the only correct output.
    renderLineup([
      { name: 'Zzz Unphotographed Person', roles: ['drums'], begin: '2015', end: null, current: true },
    ]);

    await user.click(
      screen.getByRole('button', { name: `${copy.memberOpenHint}: Zzz Unphotographed Person` }),
    );

    const card = screen.getByRole('group', { name: 'Zzz Unphotographed Person' });
    expect(within(card).getByText(copy.lineupNoPhoto)).toBeInTheDocument();
  });
});
