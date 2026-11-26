import { memo, useMemo } from 'react';
import { selectRantaiPasok } from '../logic/filters.js';
import { useAppStore } from '../store/useAppStore.js';

export const RantaiPasokPanel = memo(function RantaiPasokPanel() {
  const filters = useAppStore((state) => state.filters);
  const rows = useMemo(
    () => selectRantaiPasok(filters.rantaiPasokType),
    [filters.rantaiPasokType],
  );

  return (
    <aside className="chain-panel" aria-label="Rantai pasok">
      <header className="chain-panel__header">
        <div>
          <p>Rantai pasok</p>
          <strong>
            {filters.rantaiPasokType === 'Semua'
              ? 'Semua tipe'
              : filters.rantaiPasokType}
          </strong>
        </div>
        <span className="chain-panel__count">{rows.length}</span>
      </header>

      <ul className="chain-list">
        {rows.map((row) => (
          <li
            key={row.id}
            className={`chain-row chain-row--${row.tipe.toLowerCase()}`}
          >
            <p className="chain-row__route">
              {row.dariNama} <span aria-hidden="true">→</span> {row.keNama}
            </p>
            <p className="chain-row__meta">
              {row.komoditasNama} · {row.tipe} · Rp
              {row.marginRp.toLocaleString('id-ID')}/kg
            </p>
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <p className="chain-panel__empty">
          Tidak ada rantai pasok untuk tipe ini.
        </p>
      ) : null}
    </aside>
  );
});
