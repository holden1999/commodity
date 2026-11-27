import type { PsiidnForecast } from './environment.js';
import type { DecisionStatus } from './decision.js';
import type { RantaiPasokView } from './filters.js';
import type { KpiSummary } from './kpi.js';
import type { CiapusFilters, LiveState, Selection } from './types.js';

export interface ServerVisibility {
  petak: string[];
  kolam: string[];
  ternak: string[];
}

export interface ServerSnapshot {
  live: LiveState;
  kpi: KpiSummary;
  visibility: ServerVisibility;
  rantaiPasok: RantaiPasokView[];
  decision: DecisionStatus | null;
}

function buildQuery(filters: CiapusFilters, selection: Selection | null): string {
  const params = new URLSearchParams({
    highFloodRisk: String(filters.highFloodRisk),
    highFuzzy: String(filters.highFuzzy),
    rantaiPasokType: filters.rantaiPasokType,
  });
  if (selection) {
    params.set('selectionKind', selection.kind);
    params.set('selectionId', selection.id);
  }
  return params.toString();
}

async function requestSnapshot(
  path: string,
  method: 'GET' | 'POST',
  filters: CiapusFilters,
  selection: Selection | null,
  signal?: AbortSignal,
): Promise<ServerSnapshot | null> {
  try {
    const response = await fetch(`${path}?${buildQuery(filters, selection)}`, {
      method,
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return null;
    return (await response.json()) as ServerSnapshot;
  } catch {
    return null;
  }
}

export const fetchSnapshot = (
  filters: CiapusFilters,
  selection: Selection | null,
  signal?: AbortSignal,
) => requestSnapshot('/api/snapshot', 'GET', filters, selection, signal);

export const postLiveTick = (
  filters: CiapusFilters,
  selection: Selection | null,
  signal?: AbortSignal,
) => requestSnapshot('/api/live/tick', 'POST', filters, selection, signal);

export async function fetchPsiidnForecast(signal?: AbortSignal): Promise<PsiidnForecast | undefined> {
  try {
    const response = await fetch('/api/weather/psiidn', { signal });
    if (!response.ok) return undefined;
    const data = await response.json() as PsiidnForecast;
    if (!Number.isFinite(Date.parse(data.validAt)) ||
        ![data.rainRateMmH, data.humidityPct, data.windMps, data.temperatureC].every(Number.isFinite)) {
      return undefined;
    }
    return data;
  } catch {
    return undefined;
  }
}
