import { useMemo } from 'react';
import { seed } from '../data/index.js';

export function ZoneMix({ zonaId }: { zonaId: string }) {
  const rows = useMemo(() => {
    const petak = seed.petak.filter((row) => row.zonaId === zonaId);
    const total = petak.reduce((sum, row) => sum + row.luasHa, 0);
    const groups = new Map<string, { nama: string; ha: number }>();

    for (const row of petak) {
      const komoditas = row.komoditasId
        ? seed.komoditas.find((item) => item.id === row.komoditasId)
        : undefined;
      const key = komoditas?.id ?? 'produksi-lain';
      const current = groups.get(key) ?? {
        nama: komoditas?.nama ?? 'Tambak / kandang',
        ha: 0,
      };
      current.ha += row.luasHa;
      groups.set(key, current);
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        pct: total === 0 ? 0 : (group.ha / total) * 100,
      }))
      .sort((left, right) => right.ha - left.ha);
  }, [zonaId]);

  return (
    <section className="zone-mix" aria-label="Komposisi petak per zona">
      <p>Komposisi petak</p>
      {rows.map((row) => (
        <div key={row.nama} className="zone-mix__row">
          <span>{row.nama}</span>
          <i>
            <b style={{ width: `${row.pct}%` }} />
          </i>
          <strong>{row.pct.toFixed(0)}%</strong>
        </div>
      ))}
    </section>
  );
}
