import type { ReactNode } from 'react';
import { Html } from '@react-three/drei';

type LabelTone = 'zone' | 'water' | 'livestock' | 'market' | 'crop';
export type ObjectIconKind =
  | 'zone'
  | 'crop'
  | 'fish'
  | 'water'
  | 'livestock'
  | 'market'
  | 'tree';

function ObjectIcon({ kind }: { kind: ObjectIconKind }) {
  const common = {
    width: 12,
    height: 12,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'map-label__icon',
    'aria-hidden': true as const,
  };

  switch (kind) {
    case 'zone':
      return (
        <svg {...common}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 12 12 17 22 12" />
          <polyline points="2 17 12 22 22 17" />
        </svg>
      );
    case 'crop':
      return (
        <svg {...common}>
          <path d="M7 20h10" />
          <path d="M12 20V10" />
          <path d="M12 10c0-4 3-6 7-6 0 4-2 6-7 6z" />
          <path d="M12 13c0-3.5-2.5-5.5-6-5.5 0 3.5 2 5.5 6 5.5z" />
        </svg>
      );
    case 'fish':
      return (
        <svg {...common}>
          <path d="M6.5 12c2.5-4 7.5-4.5 11.5-1.5L21 8v8l-3-2.5c-4 3-9 2.5-11.5-1.5z" />
          <circle cx="9.5" cy="11.5" r="0.8" fill="currentColor" />
        </svg>
      );
    case 'water':
      return (
        <svg {...common}>
          <path d="M2 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
          <path d="M2 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
        </svg>
      );
    case 'livestock':
      return (
        <svg {...common}>
          <path d="M3 10L12 4l9 6" />
          <path d="M5 10v9h14v-9" />
          <path d="M9 19v-5h6v5" />
        </svg>
      );
    case 'market':
      return (
        <svg {...common}>
          <path d="M3 9l1-4h16l1 4" />
          <path d="M4 9a3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 4 0" />
          <path d="M5 11v9h14v-9" />
        </svg>
      );
    case 'tree':
      return (
        <svg {...common}>
          <polygon points="12 3 5 14 19 14" />
          <line x1="12" y1="14" x2="12" y2="21" />
        </svg>
      );
  }
}

interface MapLabelProps {
  position: readonly [number, number, number];
  tone: LabelTone;
  icon?: ObjectIconKind;
  children: ReactNode;
}

/** Screen-sized map label with a general category icon that ignores pointer events. */
export function MapLabel({ position, tone, icon, children }: MapLabelProps) {
  return (
    <Html
      position={position}
      center
      wrapperClass="map-label-wrapper"
      style={{ pointerEvents: 'none' }}
      zIndexRange={[5, 0]}
    >
      <div className={`map-label map-label--${tone}`}>
        {icon ? <ObjectIcon kind={icon} /> : null}
        <div className="map-label__text">{children}</div>
      </div>
    </Html>
  );
}
