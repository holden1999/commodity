import { PERIODS, PSIIDN_METEOROLOGY } from '../logic/environment.js';
import { useAppStore } from '../store/useAppStore.js';

const validTime = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
});
const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

const climates = ['Otomatis', 'Cerah', 'Hujan', 'Kemarau'] as const;

export function ViewControls() {
  const environment = useAppStore((state) => state.live.environment);
  const growth = useAppStore((state) => state.growth);
  const theme = useAppStore((state) => state.theme);
  const cutaway = useAppStore((state) => state.cutaway);
  const setClimate = useAppStore((state) => state.setClimate);
  const setPeriod = useAppStore((state) => state.setPeriod);
  const setGrowth = useAppStore((state) => state.setGrowth);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const toggleCutaway = useAppStore((state) => state.toggleCutaway);
  const selectedClimate = environment.dryOverride ? 'Kemarau' :
    environment.weatherOverride ?? 'Otomatis';
  const forecast = environment.forecast;
  return (
    <section className="live-dock" aria-label="Simulasi cuaca dan pertumbuhan">
      <div role="group" aria-label="Cuaca">
        {climates.map((mode) => (
          <button key={mode} type="button" aria-pressed={selectedClimate === mode}
            onClick={() => setClimate(mode)}>{mode}</button>
        ))}
      </div>
      <div className="weather-source">
        <a href={PSIIDN_METEOROLOGY} target="_blank" rel="noreferrer">BMKG PSIIDN · InaNWP</a>
        <span>
          {environment.weatherOverride ? 'Simulasi manual' : forecast
            ? `${validTime.format(new Date(forecast.validAt))} WIB · ${number.format(forecast.temperatureC)} °C · ${number.format(forecast.rainRateMmH)} mm/jam`
            : 'Prakiraan belum tersedia'}
        </span>
      </div>
      <div role="group" aria-label="Waktu">
        {PERIODS.map((period) => (
          <button key={period} type="button"
            aria-pressed={theme === 'day' && (environment.period ?? 'Siang') === period}
            onClick={() => setPeriod(period)}>{period}</button>
        ))}
        <button type="button" aria-pressed={theme === 'night'} onClick={toggleTheme}>Malam</button>
      </div>
      <label className="growth-control">
        Pertumbuhan <input type="range" min={0} max={100} value={growth}
          onChange={(event) => setGrowth(event.currentTarget.valueAsNumber)} />
        <output>{growth}%</output>
      </label>
      <button type="button" aria-pressed={cutaway} onClick={toggleCutaway}>
        {cutaway ? 'Tutup atap' : 'Cutaway'}
      </button>
    </section>
  );
}
