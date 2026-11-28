import { useAppStore } from '../store/useAppStore.js';

/**
 * Map compass. The dial shows where world north (-Z) sits on screen.
 * The needle rotates with the camera azimuth, so it follows drag orbit
 * and the 90-degree turn buttons.
 */
export function Compass() {
  const azimuth = useAppStore((state) => state.viewAzimuth);
  const bearing = Math.round(((azimuth % 360) + 360) % 360);
  return (
    <div
      className="compass"
      role="img"
      aria-label={`Kompas: utara ${bearing} derajat searah jarum jam dari atas layar`}
      title={`Utara ${bearing}° dari atas`}
    >
      <div className="compass__dial" style={{ transform: `rotate(${azimuth}deg)` }}>
        <span className="compass__needle" aria-hidden="true" />
        <span
          className="compass__north"
          aria-hidden="true"
          style={{ transform: `translateX(-50%) rotate(${-azimuth}deg)` }}
        >
          U
        </span>
      </div>
      <span className="compass__pivot" aria-hidden="true" />
    </div>
  );
}
