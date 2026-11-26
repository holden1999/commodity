import { useAppStore, type SimSpeed } from '../store/useAppStore.js';

const SPEEDS: readonly SimSpeed[] = [1, 2, 5];

export function LiveControls() {
  const simPlaying = useAppStore((state) => state.simPlaying);
  const simSpeed = useAppStore((state) => state.simSpeed);
  const theme = useAppStore((state) => state.theme);
  const cutaway = useAppStore((state) => state.cutaway);
  const toggleSimPlaying = useAppStore((state) => state.toggleSimPlaying);
  const setSimSpeed = useAppStore((state) => state.setSimSpeed);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const toggleCutaway = useAppStore((state) => state.toggleCutaway);

  return (
    <section className="live-dock" aria-label="Kontrol simulasi">
      <span className={`live-dock__status${simPlaying ? ' is-live' : ''}`}>
        <i aria-hidden="true" />
        {simPlaying ? 'Live' : 'Jeda'}
      </span>
      <button type="button" onClick={toggleSimPlaying}>
        {simPlaying ? 'Jeda' : 'Main'}
      </button>
      <div className="live-dock__speeds" role="group" aria-label="Kecepatan simulasi">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={simSpeed === speed ? 'is-active' : ''}
            aria-pressed={simSpeed === speed}
            onClick={() => setSimSpeed(speed)}
          >
            {speed}×
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={theme === 'night'}
        onClick={toggleTheme}
      >
        {theme === 'night' ? 'Siang' : 'Malam'}
      </button>
      <button
        type="button"
        aria-pressed={cutaway}
        onClick={toggleCutaway}
      >
        {cutaway ? 'Tutup atap' : 'Cutaway'}
      </button>
    </section>
  );
}
