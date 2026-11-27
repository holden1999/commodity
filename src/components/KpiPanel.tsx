import { useMemo } from 'react';
import { buildKpi } from '../logic/kpi.js';
import { useAppStore } from '../store/useAppStore.js';

const signedPct = (value: number | null) =>
  value === null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

export function KpiPanel() {
  const live = useAppStore((state) => state.live);
  const kpi = useMemo(() => buildKpi(live), [live]);

  const cards = [
    {
      label: 'Rata-rata fuzzy',
      value:
        kpi.averageFuzzyScore === null
          ? '—'
          : kpi.averageFuzzyScore.toFixed(1),
      unit: '/100',
      tone: 'sawah',
      title: 'Rata-rata fuzzy score petak, kolam, dan ternak',
    },
    {
      label: 'Margin Harga Desa',
      value: signedPct(kpi.hargaDesaMarginPct),
      unit: 'di atas HPP',
      tone: 'earth',
      title: 'Rata-rata selisih Harga Desa terhadap HPP',
    },
    {
      label: 'Risiko banjir tinggi',
      value:
        kpi.highFloodRiskPct === null ? '—' : `${kpi.highFloodRiskPct}%`,
      unit: 'petak',
      tone: 'water',
      title: 'Persentase petak di zona dengan risiko banjir Tinggi',
    },
    {
      label: 'Kolam aktif',
      value: String(kpi.activeKolam),
      unit: 'kolam',
      tone: 'water',
      title: 'Kolam dengan nilai dissolved oxygen positif',
    },
    {
      label: 'Total ternak',
      value: kpi.totalTernak.toLocaleString('id-ID'),
      unit: 'ekor',
      tone: 'earth',
      title: 'Jumlah seluruh ternak pada empat kandang',
    },
    {
      label: 'Air rendah',
      value: String(kpi.lowWaterAlerts),
      unit: 'petak',
      tone: 'water',
      title: 'Petak dengan curah hujan live di bawah 90% baseline',
      alert: kpi.lowWaterAlerts > 0,
    },
  ];

  return (
    <section className="kpi-panel" aria-label="Indikator utama">
      {cards.map((card) => (
        <article
          key={card.label}
          className={`kpi-card kpi-card--${card.tone}${card.alert ? ' is-alert' : ''}`}
          title={card.title}
        >
          <span className="kpi-card__dot" aria-hidden="true" />
          <div>
            <p className="kpi-card__label">{card.label}</p>
            <p className="kpi-card__value">
              {card.value}
              <small>{card.unit}</small>
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
