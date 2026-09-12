import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import InterpretiveBoundaryNotice from './InterpretiveBoundaryNotice';

describe('InterpretiveBoundaryNotice', () => {
  afterEach(cleanup);

  it.each([
    ['en', 'Creative archive reading · not a psychological assessment', 'deterministic local rules', 'ltr'],
    ['es', 'Lectura creativa del archivo · no es una evaluación psicológica', 'reglas locales deterministas', 'ltr'],
    ['he', 'קריאה יצירתית בארכיון · לא הערכה פסיכולוגית', 'כללים מקומיים דטרמיניסטיים', 'rtl'],
  ] as const)('states the evidence boundary in %s', (lang, title, body, direction) => {
    render(<InterpretiveBoundaryNotice lang={lang} />);

    const notice = screen.getByRole('note');
    expect(notice).toHaveAttribute('dir', direction);
    expect(notice).toHaveAccessibleName(title);
    expect(notice).toHaveTextContent(body);
    expect(notice).toHaveTextContent(/personality|personalidad|אישיות/);
    expect(notice).toHaveTextContent(/mental health|salud mental|בריאות נפשית/);
  });
});
