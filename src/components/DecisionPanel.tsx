import { useMemo } from 'react';
import { buildDecisionStatus } from '../logic/decision.js';
import { useAppStore } from '../store/useAppStore.js';

const rupiah = (value: number | null) =>
  value === null
    ? '—'
    : new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(value);

const number = (value: number | null, digits = 0) =>
  value === null
    ? '—'
    : new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);

const clock = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
};

const scoreTone = (score: number | null) => {
  if (score === null) return 'neutral';
  if (score >= 75) return 'good';
  if (score >= 50) return 'fair';
  return 'low';
};

const scoreText = (score: number | null) => {
  if (score === null) return 'Tidak berlaku';
  if (score >= 80) return 'Sangat sesuai';
  if (score >= 65) return 'Sesuai';
  if (score >= 50) return 'Cukup sesuai';
  return 'Kurang sesuai';
};

export function DecisionPanel() {
  const selection = useAppStore((state) => state.selection);
  const live = useAppStore((state) => state.live);
  const clearSelection = useAppStore((state) => state.clearSelection);

  const status = useMemo(
    () => (selection ? buildDecisionStatus(selection, live) : null),
    [selection, live],
  );

  if (!status) return null;

  const tone = scoreTone(status.fuzzyScore);

  return (
    <aside className="decision-panel" aria-live="polite" aria-label="Status keputusan">
      <button
        className="decision-panel__close"
        type="button"
        onClick={clearSelection}
        aria-label="Tutup panel"
      >
        ×
      </button>

      <p className="decision-panel__eyebrow">{status.kind}</p>
      <h2 className="decision-panel__title">{status.name}</h2>
      <p className="decision-panel__zona">{status.zona}</p>

      <div className={`decision-score decision-score--${tone}`}>
        <div className="decision-score__value">
          {status.fuzzyScore ?? '—'}
          {status.fuzzyScore !== null ? <span>/100</span> : null}
        </div>
        <p className="decision-score__label">Fuzzy score</p>
        <p className="decision-score__note">{scoreText(status.fuzzyScore)}</p>
        <div className="decision-score__track">
          <span style={{ width: `${status.fuzzyScore ?? 0}%` }} />
        </div>
      </div>

      <dl className="decision-grid">
        <div>
          <dt>Rekomendasi komoditas</dt>
          <dd>{status.recommendedKomoditas ?? '—'}</dd>
        </div>
        <div>
          <dt>pH tanah</dt>
          <dd>{number(status.soilPh, 1)}</dd>
        </div>
        <div>
          <dt>pH air</dt>
          <dd>{number(status.waterPh, 1)}</dd>
        </div>
        <div>
          <dt>Curah hujan</dt>
          <dd>
            {status.rainfallMm === null
              ? '—'
              : `${number(status.rainfallMm)} mm/thn`}
          </dd>
        </div>
        <div>
          <dt>NDVI</dt>
          <dd>{number(status.ndvi, 2)}</dd>
        </div>
      </dl>

      <section className="decision-prices" aria-label="Perbandingan harga">
        <header>
          <h3>Harga {status.hargaKomoditas ?? 'komoditas'}</h3>
          <span>Rp/kg</span>
        </header>
        <div className="decision-price-row">
          <span>Harga Desa</span>
          <strong>{rupiah(status.hargaDesaRp)}</strong>
        </div>
        <div className="decision-price-row">
          <span>HPP</span>
          <strong>{rupiah(status.hppRp)}</strong>
        </div>
        <div className="decision-price-row decision-price-row--market">
          <span>Harga Pasar Bapanas</span>
          <strong>{rupiah(status.hargaPasarBapanasRp)}</strong>
        </div>
        {status.hargaDesaRp === null &&
        status.hppRp === null &&
        status.hargaPasarBapanasRp === null ? (
          <p className="decision-prices__empty">
            Data harga belum tersedia untuk komoditas ini.
          </p>
        ) : null}
      </section>

      <p className="decision-panel__time">
        Diperbarui {clock(status.lastUpdated)} · simulasi 5 detik
      </p>
    </aside>
  );
}
