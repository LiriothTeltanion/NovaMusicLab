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
});
