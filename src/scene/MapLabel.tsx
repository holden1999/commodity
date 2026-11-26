import type { ReactNode } from 'react';
import { Html } from '@react-three/drei';

type LabelTone = 'zone' | 'water' | 'livestock' | 'market';

interface MapLabelProps {
  position: readonly [number, number, number];
  tone: LabelTone;
  children: ReactNode;
}

/** Screen-sized map label that does not receive pointer events. */
export function MapLabel({ position, tone, children }: MapLabelProps) {
  return (
    <Html
      position={position}
      center
      wrapperClass="map-label-wrapper"
      style={{ pointerEvents: 'none' }}
      zIndexRange={[5, 0]}
    >
      <div className={`map-label map-label--${tone}`}>{children}</div>
    </Html>
  );
}
