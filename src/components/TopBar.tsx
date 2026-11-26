import { memo } from 'react';
import { seed } from '../data/index.js';
import type { TipeTransaksi } from '../types.js';
import { useAppStore } from '../store/useAppStore.js';

const chainType = (value: string): TipeTransaksi | 'Semua' =>
  value === 'B2B' || value === 'B2C' || value === 'C2C' ? value : 'Semua';

export const TopBar = memo(function TopBar() {
  const focusZonaId = useAppStore((state) => state.focusZonaId);
  const focusZona = useAppStore((state) => state.focusZona);
  const filters = useAppStore((state) => state.filters);
  const setHighFloodRisk = useAppStore((state) => state.setHighFloodRisk);
  const setHighFuzzy = useAppStore((state) => state.setHighFuzzy);
  const setRantaiPasokType = useAppStore((state) => state.setRantaiPasokType);
  const resetFilters = useAppStore((state) => state.resetFilters);

  const activeFilters =
    Number(filters.highFloodRisk) +
    Number(filters.highFuzzy) +
    Number(filters.rantaiPasokType !== 'Semua');

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true">
          C
        </span>
        <div>
          <p>CiapusDSS</p>
          <h1>Desa Ciapus</h1>
        </div>
      </div>

      <label className="topbar__control">
        <span>Fokus zona</span>
        <select
          value={focusZonaId ?? ''}
          onChange={(event) => focusZona(event.target.value || null)}
        >
          <option value="">Semua zona</option>
          {seed.zona.map((zona) => (
            <option key={zona.id} value={zona.id}>
              {zona.nama}
            </option>
          ))}
        </select>
      </label>

      <div className="topbar__filters" aria-label="Filter peta">
        <span className="topbar__filters-label">
          Filter
          {activeFilters > 0 ? <b>{activeFilters}</b> : null}
        </span>
        <button
          type="button"
          className={filters.highFloodRisk ? 'is-active' : ''}
          aria-pressed={filters.highFloodRisk}
          title="Tampilkan hanya petak di zona risiko banjir Tinggi"
          onClick={() => setHighFloodRisk(!filters.highFloodRisk)}
        >
          Banjir tinggi
        </button>
        <button
          type="button"
          className={filters.highFuzzy ? 'is-active' : ''}
          aria-pressed={filters.highFuzzy}
          title="Tampilkan hanya komoditas dengan fuzzy score di atas 70"
          onClick={() => setHighFuzzy(!filters.highFuzzy)}
        >
          Fuzzy &gt; 70
        </button>
        <select
          aria-label="Tipe rantai pasok"
          value={filters.rantaiPasokType}
          onChange={(event) => setRantaiPasokType(chainType(event.target.value))}
        >
          <option value="Semua">Rantai: semua</option>
          <option value="B2B">Rantai: B2B</option>
          <option value="B2C">Rantai: B2C</option>
          <option value="C2C">Rantai: C2C</option>
        </select>
        {activeFilters > 0 ? (
          <button type="button" className="topbar__reset" onClick={resetFilters}>
            Reset
          </button>
        ) : null}
      </div>

      <div className="legend legend--top" aria-label="Legenda warna">
        <span>
          <i className="swatch swatch--crop" />
          Pertanian
        </span>
        <span>
          <i className="swatch swatch--livestock" />
          Peternakan
        </span>
        <span>
          <i className="swatch swatch--water" />
          Perikanan
        </span>
      </div>
    </header>
  );
});
