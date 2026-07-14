import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import SectionQuickRead from './SectionQuickRead';

describe('SectionQuickRead', () => {
  afterEach(cleanup);

  it('presents compact insights as theme-aware semantic cards', () => {
    render(
      <SectionQuickRead
        items={[
          { icon: <span aria-hidden="true">✨</span>, label: 'Signal', title: 'First insight', body: 'Useful context.', color: '#22d3ee' },
          { icon: <span aria-hidden="true">🎵</span>, label: 'Pattern', title: 'Second insight', body: 'Another detail.', color: '#f472b6' },
        ]}
      />,
    );

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'First insight', level: 3 })).toBeInTheDocument();

    const firstCard = screen.getAllByRole('listitem')[0];
    expect(firstCard).toHaveClass('nova-surface', 'nova-surface--analysis');
    expect(firstCard).not.toHaveClass('glass-panel', 'text-white');
  });
});
