import { desa } from '../data/desa.js';

export type Season = 'Kemarau' | 'Hujan';
export type Weather = 'Cerah' | 'Berawan' | 'Hujan';
export type DayPeriod = 'Pagi' | 'Siang' | 'Sore';

export interface PsiidnForecast {
  validAt: string;
  rainRateMmH: number;
  humidityPct: number;
  windMps: number;
  temperatureC: number;
}

export const PSIIDN_METEOROLOGY = 'https://psimkg.bmkg.go.id/psiidn/meteorology';

export interface Environment {
  forecast?: PsiidnForecast;
  season: Season;
  weather: Weather;
  weatherOverride?: Weather;
  period?: DayPeriod;
  dryOverride?: boolean;
}

export const DEFAULT_ENVIRONMENT: Environment = { season: 'Kemarau', weather: 'Cerah' };
export const SEASONS: readonly Season[] = ['Kemarau', 'Hujan'];
export const WEATHERS: readonly Weather[] = ['Cerah', 'Berawan', 'Hujan'];
export const PERIODS: readonly DayPeriod[] = ['Pagi', 'Siang', 'Sore'];

const HOURS: Record<DayPeriod, number> = { Pagi: 7.5, Siang: 12, Sore: 16.5 };
const radians = Math.PI / 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function weatherConditions(environment: Environment, annualRain: number) {
  const monthlyRain = annualRain / 12;
  const forecast = environment.weatherOverride ? undefined : environment.forecast;
  const weather = environment.weatherOverride ??
    (forecast && forecast.rainRateMmH >= .1 ? 'Hujan' : 'Cerah');
  const rain = weather === 'Hujan';
  const dry = !rain && (environment.dryOverride === true ||
    (Boolean(environment.weatherOverride) && environment.season === 'Kemarau' && monthlyRain <= 250));
  return {
    weather,
    rain,
    dry,
    heavy: forecast ? forecast.rainRateMmH >= 5 : environment.weatherOverride === 'Hujan',
    humidity: forecast?.humidityPct ?? (environment.weatherOverride ? rain ? 91 : 55 : 0),
    wind: forecast?.windMps ?? (environment.weatherOverride ? rain ? 5 : 2 : 0),
  };
}

/** Approximate solar position using the site's coordinates and the simulated WIB clock. */
export function sunDirection(environment: Environment, date = new Date()) {
  const wib = new Date(date.getTime() + 7 * 3_600_000);
  const day = (Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) -
    Date.UTC(wib.getUTCFullYear(), 0, 0)) / 86_400_000;
  const declination = 23.5 * radians * Math.sin(2 * Math.PI * (day - 81) / 365.25);
  const hour = (HOURS[environment.period ?? 'Siang'] - 12) * 15 + desa.lon - 105;
  const angle = hour * radians;
  const latitude = desa.lat * radians;
  const north = Math.cos(latitude) * Math.sin(declination) -
    Math.sin(latitude) * Math.cos(declination) * Math.cos(angle);
  const up = Math.sin(latitude) * Math.sin(declination) +
    Math.cos(latitude) * Math.cos(declination) * Math.cos(angle);
  return {
    x: -Math.cos(declination) * Math.sin(angle),
    y: up,
    z: -north,
    altitude: Math.asin(up) / radians,
  };
}

export function sunExposure(mdpl: number, environment: Environment, rainfallMm = 3000, date?: Date) {
  const weather = weatherConditions(environment, rainfallMm).weather;
  const clarity = weather === 'Cerah' ? 1 : weather === 'Berawan' ? 0.72 : 0.42;
  const elevation = clamp((mdpl - 200) / 125, 0, 1);
  const sunlight = Math.max(0, sunDirection(environment, date).y);
  return Math.round(100 * (0.45 + 0.55 * sunlight) * clarity * (1 - elevation * 0.35));
}

export function waterflow(slope: number, rainfallMm: number, environment: Environment) {
  const slopeFactor = clamp(slope / 25, 0, 1);
  const rainFactor = clamp((rainfallMm - 2600) / 2000, 0, 1);
  const seasonFactor = environment.season === 'Hujan' ? 1 : 0.65;
  const weather = weatherConditions(environment, rainfallMm).weather;
  const weatherFactor = weather === 'Hujan' ? 1.3 : weather === 'Berawan' ? 1 : 0.8;
  return Math.round(clamp((0.2 + slopeFactor * 0.6 + rainFactor * 0.2) * seasonFactor * weatherFactor * 100, 0, 100));
}
