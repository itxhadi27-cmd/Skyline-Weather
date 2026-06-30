import type { Unit } from '../types';

/* ─── WMO weather code → emoji + label ─────────────────────── */
const WMO_MAP: Record<number, [string, string]> = {
  0:  ['☀️',  'Clear sky'],
  1:  ['🌤',  'Mainly clear'],
  2:  ['⛅',  'Partly cloudy'],
  3:  ['☁️',  'Overcast'],
  45: ['🌫',  'Foggy'],
  48: ['🌫',  'Icy fog'],
  51: ['🌦',  'Light drizzle'],
  53: ['🌦',  'Drizzle'],
  55: ['🌧',  'Heavy drizzle'],
  61: ['🌧',  'Light rain'],
  63: ['🌧',  'Rain'],
  65: ['🌧',  'Heavy rain'],
  66: ['🌨',  'Freezing rain'],
  67: ['🌨',  'Heavy freezing rain'],
  71: ['❄️',  'Light snow'],
  73: ['❄️',  'Snow'],
  75: ['❄️',  'Heavy snow'],
  77: ['🌨',  'Snow grains'],
  80: ['🌦',  'Showers'],
  81: ['🌧',  'Heavy showers'],
  82: ['⛈',  'Violent showers'],
  85: ['🌨',  'Snow showers'],
  86: ['🌨',  'Heavy snow showers'],
  95: ['⛈',  'Thunderstorm'],
  96: ['⛈',  'Thunderstorm & hail'],
  99: ['⛈',  'Thunderstorm & hail'],
};

export function wmoInfo(code: number, isDay: number | boolean): [string, string] {
  const entry = WMO_MAP[code] ?? ['🌡', 'Unknown'];
  if (code === 0 || code === 1) {
    return isDay ? entry : ['🌙', code === 0 ? 'Clear night' : 'Mainly clear night'];
  }
  return entry;
}

/* ─── Temperature formatting ───────────────────────────────── */
export const toF = (c: number) => Math.round(c * 9 / 5 + 32);
export const fmtTemp = (c: number, unit: Unit) =>
  unit === 'C' ? `${Math.round(c)}°C` : `${toF(c)}°F`;
export const fmtTempN = (c: number, unit: Unit) =>
  unit === 'C' ? Math.round(c) : toF(c);

/* ─── Wind direction ────────────────────────────────────────── */
export const windDir = (deg: number): string =>
  ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8] ?? 'N';

/* ─── Dew point ─────────────────────────────────────────────── */
export const dewPoint = (temp: number, humidity: number) =>
  Math.round(temp - (100 - humidity) / 5);

/* ─── Comfort label ─────────────────────────────────────────── */
export const comfortLabel = (humidity: number): string => {
  if (humidity > 70) return 'Humid';
  if (humidity > 50) return 'Comfortable';
  return 'Dry';
};

/* ─── UV label ──────────────────────────────────────────────── */
export const uvLabel = (v: number): string => {
  if (v <= 2) return 'Low';
  if (v <= 5) return 'Moderate';
  if (v <= 7) return 'High';
  if (v <= 10) return 'Very high';
  return 'Extreme';
};

/* ─── Day name ──────────────────────────────────────────────── */
export const dayName = (iso: string, isToday: boolean): string => {
  if (isToday) return 'Today';
  // Parse as local date by appending T00:00:00
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
};

/* ─── Known-station coordinate overrides ───────────────────────
   Nominatim returns a city's *geographic centroid*, which can sit
   a few km from the official met station that aggregators like
   Google Weather actually report against. For cities where this
   gap is large enough to shift the reading, we override with the
   real station coordinates (usually the primary airport). This is
   the single biggest fixable source of city-vs-city mismatch. */
const STATION_OVERRIDES: Record<string, { lat: number; lon: number }> = {
  'karachi|pk':    { lat: 24.9056, lon: 67.1608 }, // Jinnah Intl Airport
  'lahore|pk':     { lat: 31.5216, lon: 74.4036 }, // Allama Iqbal Intl Airport
  'islamabad|pk':  { lat: 33.6167, lon: 73.0991 }, // Islamabad Intl Airport
  'larkana|pk':    { lat: 27.5350, lon: 68.2170 }, // Larkana Airport
  'multan|pk':     { lat: 30.2030, lon: 71.4191 }, // Multan Intl Airport
  'peshawar|pk':   { lat: 33.9939, lon: 71.5145 }, // Peshawar Intl Airport
  'quetta|pk':     { lat: 30.2514, lon: 66.9378 }, // Quetta Airport
  'faisalabad|pk': { lat: 31.3650, lon: 72.9947 }, // Faisalabad Intl Airport
  'hyderabad|pk':  { lat: 25.2231, lon: 68.3736 }, // Hyderabad Airport
  'sukkur|pk':     { lat: 27.7220, lon: 68.7940 }, // Sukkur Airport
};

export function applyStationOverride<T extends { name: string; country: string; lat: number; lon: number }>(
  city: T
): T {
  const key = `${city.name.trim().toLowerCase()}|${city.country.trim().toLowerCase()}`;
  const o = STATION_OVERRIDES[key];
  return o ? { ...city, lat: o.lat, lon: o.lon } : city;
}

/* ─── City cache key ────────────────────────────────────────── */
export const cacheKey = (lat: number, lon: number) =>
  `${(+lat).toFixed(3)},${(+lon).toFixed(3)}`;

/* ─── API URLs ──────────────────────────────────────────────── */
export const geoUrl = (q: string) =>
  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`;

export const revGeoUrl = (lat: number, lon: number) =>
  `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

export const weatherUrl = (lat: number, lon: number) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
  `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,` +
  `precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility` +
  `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,is_day` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max` +
  `&timezone=auto&forecast_days=7`;
