import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FlagArt from './FlagArt';

describe('FlagArt', () => {
  it('renders Brazil as a hand-authored flag instead of the generic fallback globe', () => {
    render(<FlagArt country="Brazil" />);

    const flag = screen.getByRole('img', { name: 'Brazil' });
    expect(flag.querySelector('rect[fill="#009B3A"]')).not.toBeNull();
    expect(flag.querySelector('path[fill="#FFDF00"]')).not.toBeNull();
    expect(flag.querySelector('circle[fill="#002776"]')).not.toBeNull();
    expect(flag.querySelector('rect[fill="#1f2937"]')).toBeNull();
  });

  it.each([
    ['India', '#FF9933'],
    ['Tunisia', '#E70013'],
    ['Wales', '#00AB39'],
  ])('renders the corrected %s origin with a hand-authored flag', (country, expectedColor) => {
    render(<FlagArt country={country} />);

    const flag = screen.getByRole('img', { name: country });
    expect(flag.querySelector(`[fill="${expectedColor}"]`)).not.toBeNull();
    expect(flag.querySelector('rect[fill="#1f2937"]')).toBeNull();
  });
});
