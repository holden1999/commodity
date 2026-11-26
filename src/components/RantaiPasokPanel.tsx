import { memo, useMemo } from 'react';
import { selectRantaiPasok } from '../logic/filters.js';
import { useAppStore } from '../store/useAppStore.js';

export const RantaiPasokPanel = memo(function RantaiPasokPanel() {
  const filters = useAppStore((state) => state.filters);
  const serverRows = useAppStore((state) => state.rantaiPasok);
  const selectedRantaiId = useAppStore((state) => state.selectedRantaiId);
  const selectRantai = useAppStore((state) => state.selectRantai);
  const rows = useMemo(
    () => serverRows ?? selectRantaiPasok(filters.rantaiPasokType),
    [serverRows, filters.rantaiPasokType],
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
            className={`chain-row chain-row--${row.tipe.toLowerCase()}${
              selectedRantaiId === row.id ? ' is-selected' : ''
            }`}
            role="button"
            tabIndex={0}
            aria-pressed={selectedRantaiId === row.id}
            onClick={() => selectRantai(row.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectRantai(row.id);
              }
            }}
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
