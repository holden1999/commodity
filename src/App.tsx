import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './scene/Scene.js';
import { DecisionPanel } from './components/DecisionPanel.js';
import { KpiPanel } from './components/KpiPanel.js';
import { RantaiPasokPanel } from './components/RantaiPasokPanel.js';
import { TopBar } from './components/TopBar.js';
import {
  buildSceneVisibility,
  isSelectionVisible,
  type SceneVisibility,
} from './logic/filters.js';
import { useCiapusStore } from './store/useCiapusStore.js';

const sameSet = (left: Set<string>, right: Set<string>) =>
  left.size === right.size && [...left].every((id) => right.has(id));

const sameVisibility = (left: SceneVisibility, right: SceneVisibility) =>
  sameSet(left.petak, right.petak) &&
  sameSet(left.kolam, right.kolam) &&
  sameSet(left.ternak, right.ternak);

const SceneView = memo(Scene);

export default function App() {
  const [ready, setReady] = useState(false);
  const selection = useCiapusStore((state) => state.selection);
  const select = useCiapusStore((state) => state.select);
  const clearSelection = useCiapusStore((state) => state.clearSelection);
  const tick = useCiapusStore((state) => state.tick);
  const live = useCiapusStore((state) => state.live);
  const filters = useCiapusStore((state) => state.filters);
  const focusZonaId = useCiapusStore((state) => state.focusZonaId);
  const focusNonce = useCiapusStore((state) => state.focusNonce);
  const visibleRef = useRef<SceneVisibility | null>(null);

  const visible = useMemo(() => {
    const next = buildSceneVisibility(filters, live);
    const previous = visibleRef.current;
    if (previous && sameVisibility(previous, next)) return previous;
    visibleRef.current = next;
    return next;
  }, [filters, live]);

  useEffect(() => {
    const timer = window.setInterval(tick, 5000);
    return () => window.clearInterval(timer);
  }, [tick]);

  useEffect(() => {
    if (selection && !isSelectionVisible(selection, visible)) {
      clearSelection();
    }
  }, [selection, visible, clearSelection]);

  return (
    <div className="app">
      <Canvas
        className="scene-canvas"
        shadows="percentage"
        dpr={1}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        aria-label="Peta 3D Desa Ciapus"
        onCreated={() => setReady(true)}
      >
        {ready ? (
          <SceneView
            selected={selection}
            onSelect={select}
            visible={visible}
            focusZonaId={focusZonaId}
            focusNonce={focusNonce}
          />
        ) : null}
      </Canvas>

      <TopBar />
      <KpiPanel />
      <DecisionPanel />
      <RantaiPasokPanel />

      <p className="hint">Click to inspect · Drag to pan · Scroll to zoom</p>
    </div>
  );
}
