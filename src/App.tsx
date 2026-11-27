import { memo, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './scene/Scene.js';
import { DecisionPanel } from './components/DecisionPanel.js';
import { FuzzyLab } from './components/FuzzyLab.js';
import { KpiPanel } from './components/KpiPanel.js';
import { RantaiPasokPanel } from './components/RantaiPasokPanel.js';
import { TopBar } from './components/TopBar.js';
import { ViewControls } from './components/ViewControls.js';
import { fetchPsiidnForecast } from './logic/api.js';
import { buildSceneVisibility, isSelectionVisible } from './logic/filters.js';
import { useAppStore } from './store/useAppStore.js';

const SceneView = memo(Scene);

export default function App() {
  const [ready, setReady] = useState(false);
  const selection = useAppStore((state) => state.selection);
  const select = useAppStore((state) => state.select);
  const clearSelection = useAppStore((state) => state.clearSelection);
  const tick = useAppStore((state) => state.tick);
  const setForecast = useAppStore((state) => state.setForecast);
  const syncSnapshot = useAppStore((state) => state.syncSnapshot);
  const live = useAppStore((state) => state.live);
  const filters = useAppStore((state) => state.filters);
  const focusZonaId = useAppStore((state) => state.focusZonaId);
  const focusNonce = useAppStore((state) => state.focusNonce);
  const theme = useAppStore((state) => state.theme);
  const cutaway = useAppStore((state) => state.cutaway);

  const visible = useMemo(() => buildSceneVisibility(filters, live), [filters, live]);

  useEffect(() => {
    void syncSnapshot();
  }, [syncSnapshot]);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      const forecast = await fetchPsiidnForecast(controller.signal);
      if (!controller.signal.aborted) setForecast(forecast);
    };
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [setForecast]);

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
          />
        ) : null}
      </Canvas>

      <TopBar />
      <KpiPanel />
      <FuzzyLab />
      <DecisionPanel />
      <RantaiPasokPanel />
      <ViewControls />

      <p className="hint">
        Click to inspect · Drag to pan · Right-drag to orbit · Scroll to zoom · {' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </p>
    </div>
  );
}
