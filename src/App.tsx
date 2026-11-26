import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './scene/Scene.js';
import { DecisionPanel } from './components/DecisionPanel.js';
import { KpiPanel } from './components/KpiPanel.js';
import { LiveControls } from './components/LiveControls.js';
import { RantaiPasokPanel } from './components/RantaiPasokPanel.js';
import { TopBar } from './components/TopBar.js';
import {
  buildSceneVisibility,
  isSelectionVisible,
  type SceneVisibility,
} from './logic/filters.js';
import { useAppStore } from './store/useAppStore.js';

const sameSet = (left: Set<string>, right: Set<string>) =>
  left.size === right.size && [...left].every((id) => right.has(id));

const sameVisibility = (left: SceneVisibility, right: SceneVisibility) =>
  sameSet(left.petak, right.petak) &&
  sameSet(left.kolam, right.kolam) &&
  sameSet(left.ternak, right.ternak);

const SceneView = memo(Scene);

export default function App() {
  const [ready, setReady] = useState(false);
  const selection = useAppStore((state) => state.selection);
  const select = useAppStore((state) => state.select);
  const clearSelection = useAppStore((state) => state.clearSelection);
  const tick = useAppStore((state) => state.tick);
  const syncSnapshot = useAppStore((state) => state.syncSnapshot);
  const live = useAppStore((state) => state.live);
  const serverVisibility = useAppStore((state) => state.visibility);
  const filters = useAppStore((state) => state.filters);
  const focusZonaId = useAppStore((state) => state.focusZonaId);
  const focusNonce = useAppStore((state) => state.focusNonce);
  const theme = useAppStore((state) => state.theme);
  const cutaway = useAppStore((state) => state.cutaway);
  const simPlaying = useAppStore((state) => state.simPlaying);
  const simSpeed = useAppStore((state) => state.simSpeed);
  const selectedRantaiId = useAppStore((state) => state.selectedRantaiId);
  const visibleRef = useRef<SceneVisibility | null>(null);

  const visible = useMemo(() => {
    const next = serverVisibility ?? buildSceneVisibility(filters, live);
    const previous = visibleRef.current;
    if (previous && sameVisibility(previous, next)) return previous;
    visibleRef.current = next;
    return next;
  }, [serverVisibility, filters, live]);

  useEffect(() => {
    void syncSnapshot();
  }, [syncSnapshot]);

  useEffect(() => {
    if (!simPlaying) return;
    const timer = window.setInterval(tick, 5000 / simSpeed);
    return () => window.clearInterval(timer);
  }, [tick, simPlaying, simSpeed]);

  useEffect(() => {
    if (selection && !isSelectionVisible(selection, visible)) {
      clearSelection();
    }
  }, [selection, visible, clearSelection]);

  return (
    <div className={`app${theme === 'night' ? ' app--night' : ''}`}>
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
            live={live}
            focusZonaId={focusZonaId}
            focusNonce={focusNonce}
            night={theme === 'night'}
            cutaway={cutaway}
            simPlaying={simPlaying}
            simSpeed={simSpeed}
            rantaiPasokType={filters.rantaiPasokType}
            selectedRantaiId={selectedRantaiId}
          />
        ) : null}
      </Canvas>

      <TopBar />
      <KpiPanel />
      <DecisionPanel />
      <RantaiPasokPanel />
      <LiveControls />

      <p className="hint">
        Click to inspect · Drag to pan · Right-drag to orbit · Scroll to zoom
      </p>
    </div>
  );
}
