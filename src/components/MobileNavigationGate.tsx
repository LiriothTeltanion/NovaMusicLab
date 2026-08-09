import { lazy, Suspense } from 'react';

import { useMediaQuery } from '../hooks/useMediaQuery';
import type { RoomNavigatorProps } from './MuseumRoomNavigator';

const MobileRoomDock = lazy(() => import('./MobileRoomDock'));

/**
 * A tiny lazy boundary that keeps the real mobile navigator out of desktop
 * downloads while still reacting when a browser crosses the md breakpoint.
 */
export default function MobileNavigationGate(props: RoomNavigatorProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (!isMobile) return null;

  return (
    <Suspense fallback={null}>
      <MobileRoomDock {...props} />
    </Suspense>
  );
}
