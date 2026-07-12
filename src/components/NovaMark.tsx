import { useId } from 'react';
import type { SVGProps } from 'react';

export interface NovaMarkProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'title'> {
  /** Accessible name. Omit it when nearby text already names the product. */
  title?: string;
  /** Width and height of the square mark. */
  size?: number | string;
  /** Removes the app-tile surface while preserving the orbit and sonic N. */
  surface?: boolean;
}

/**
 * Nova Music Lab's reusable app mark: a sonic N, pulse point and open orbit.
 * Its essential silhouette stays inside the maskable icon safe zone and uses
 * unique paint IDs so multiple instances can share the same page safely.
 */
export default function NovaMark({
  title,
  size = 40,
  surface = true,
  focusable = false,
  ...svgProps
}: NovaMarkProps) {
  const instanceId = useId().replaceAll(':', '');
  const titleId = `nova-mark-title-${instanceId}`;
  const surfaceId = `nova-mark-surface-${instanceId}`;
  const orbitId = `nova-mark-orbit-${instanceId}`;
  const signalId = `nova-mark-signal-${instanceId}`;
  const clipId = `nova-mark-clip-${instanceId}`;

  const accessibilityProps = title
    ? { role: 'img', 'aria-labelledby': titleId }
    : { 'aria-hidden': true };

  return (
    <svg
      {...svgProps}
      {...accessibilityProps}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      focusable={focusable}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <defs>
        <radialGradient
          id={surfaceId}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(19 12) rotate(48) scale(62)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#123454" />
          <stop offset=".43" stopColor="#0b1028" />
          <stop offset="1" stopColor="#050713" />
        </radialGradient>
        <linearGradient id={orbitId} x1="11" y1="13" x2="54" y2="49" gradientUnits="userSpaceOnUse">
          <stop stopColor="#83f3ff" />
          <stop offset=".55" stopColor="#6878ff" />
          <stop offset="1" stopColor="#b867ff" />
        </linearGradient>
        <linearGradient id={signalId} x1="18" y1="21" x2="47" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f8fdff" />
          <stop offset=".48" stopColor="#8cecff" />
          <stop offset="1" stopColor="#d9c1ff" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="64" height="64" rx="15" />
        </clipPath>
      </defs>

      <g clipPath={surface ? `url(#${clipId})` : undefined}>
        {surface ? (
          <>
            <rect width="64" height="64" fill="#050713" />
            <rect width="64" height="64" fill={`url(#${surfaceId})`} />
            <circle cx="32" cy="32" r="18" fill="#080b1d" opacity=".42" />
          </>
        ) : null}
        <path
          d="M15.03 15.03A24 24 0 1 1 9.45 40.21"
          stroke={`url(#${orbitId})`}
          strokeWidth="3.25"
          strokeLinecap="round"
        />
        <circle cx="15.03" cy="15.03" r="2.45" fill="#a8f7ff" />
        <path
          d="M18 43V21l13 14 6-8 9 16V21"
          stroke="#02040d"
          strokeOpacity=".82"
          strokeWidth="9.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 43V21l13 14 6-8 9 16V21"
          stroke={`url(#${signalId})`}
          strokeWidth="5.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="37" cy="27" r="2.35" fill="#ffc857" />
        {surface ? (
          <rect
            x=".75"
            y=".75"
            width="62.5"
            height="62.5"
            rx="14.25"
            stroke="#fff"
            strokeOpacity=".13"
            strokeWidth="1.5"
          />
        ) : null}
      </g>
    </svg>
  );
}
