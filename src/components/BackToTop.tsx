import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

import { useApp } from '../context/AppContext';
import { pickLanguage } from '../utils/i18n';

/**
 * Fixed "back to the top of the room" control.
 *
 * The rooms are long - the museum reaches roughly 13,000 px in the deeper ones -
 * so reaching the navigation again meant a long scroll back. This appears once
 * the visitor is far enough down that the header is out of reach, and is mounted
 * once in the shell so every room gets the same control in the same place.
 *
 * Positioned with logical properties, so it sits bottom-right in English and
 * Spanish and bottom-left in Hebrew without a second rule.
 */

/**
 * Reveal once the header has scrolled out of reach. Low on purpose.
 *
 * Two earlier attempts were wrong in the same direction. 700 px, and then two
 * thirds of the viewport height, both looked reasonable on a tall desktop
 * window and then failed on the case that matters: a 1,373 px room on an 844 px
 * phone can only scroll 529 px in total, so neither trigger ever fired no
 * matter how far down the visitor had gone.
 *
 * A short absolute threshold works on both. It clears the header, it cannot
 * out-run a page's own scroll range, and the control is small enough that
 * showing it early costs nothing.
 */
const REVEAL_AFTER_PX = 280;

export default function BackToTop() {
  const { lang } = useApp();
  const [visible, setVisible] = useState(false);

  const copy = pickLanguage(lang, {
    en: { label: 'Back to the top of this room' },
    es: { label: 'Volver al principio de esta sala' },
    he: { label: 'חזרה לראש החדר' },
  });

  useEffect(() => {
    const update = () => setVisible(window.scrollY > REVEAL_AFTER_PX);
    update();
    window.addEventListener('scroll', update, { passive: true });
    // Rotating a phone changes the threshold, so recompute on resize too.
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const scrollToTop = () => {
    // Respect the OS setting directly rather than the app's motion mode: someone
    // who asked for reduced motion should not be flung up the page.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`nova-back-to-top ${visible ? 'is-visible' : ''}`}
      aria-label={copy.label}
      title={copy.label}
      // Hidden from the tab order while off-screen, so keyboard users do not
      // land on a control they cannot see.
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
