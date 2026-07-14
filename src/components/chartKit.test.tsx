import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartCanvas, ChartFrame, csvCell } from './chartKit';

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    lang: 'en',
    tc: { c1: '#00f2fe' },
  }),
}));

afterEach(cleanup);

describe('chart CSV serialization', () => {
  it('escapes quotes and keeps numeric chart values intact', () => {
    expect(csvCell('Nova "Live"')).toBe('"Nova ""Live"""');
    expect(csvCell(-42)).toBe('"-42"');
  });

  it.each(['=1+1', '+SUM(A1:A2)', '-2+3', '@command', '  =HYPERLINK("x")'])(
    'neutralizes spreadsheet formula input %s',
    (value) => {
      expect(csvCell(value)).toMatch(/^"'/);
    },
  );
});

describe('chart accessibility boundaries', () => {
  it('keeps interactive controls outside the image role', () => {
    render(
      <ChartFrame title="Listening history" subtitle="Plays by year" summary="2025 is the peak year.">
        <button type="button">Change metric</button>
        <ChartCanvas>
          <svg aria-hidden="true" />
        </ChartCanvas>
      </ChartFrame>,
    );

    const control = screen.getByRole('button', { name: 'Change metric' });
    const graphic = screen.getByRole('img', { name: 'Listening history' });

    expect(graphic).toContainElement(graphic.querySelector('svg'));
    expect(graphic).not.toContainElement(control);
  });

  it('supports a standalone accessible label', () => {
    render(
      <ChartCanvas label="Mood distribution">
        <svg aria-hidden="true" />
      </ChartCanvas>,
    );

    expect(screen.getByRole('img', { name: 'Mood distribution' })).toBeInTheDocument();
  });
});
