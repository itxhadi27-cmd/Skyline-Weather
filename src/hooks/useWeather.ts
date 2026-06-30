import { useState, useCallback, useRef } from 'react';
import type { WeatherData, City } from '../types';
import { weatherUrl, cacheKey } from '../utils/weather';

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes — fresher data, fewer stale-vs-Google mismatches

export function useWeatherCache() {
  const cache = useRef<Record<string, WeatherData>>({});

  const fetchWeather = useCallback(async (city: City): Promise<WeatherData> => {
    const key = cacheKey(city.lat, city.lon);
    const cached = cache.current[key];
    if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL) {
      return cached;
    }
    const res = await fetch(weatherUrl(city.lat, city.lon));
    if (!res.ok) throw new Error(`Weather fetch failed (${res.status})`);
    const data: WeatherData = await res.json();
    data.ts = Date.now();
    cache.current[key] = data;
    return data;
  }, []);

  const getCached = useCallback((lat: number, lon: number): WeatherData | null => {
    return cache.current[cacheKey(lat, lon)] ?? null;
  }, []);

  return { fetchWeather, getCached };
}

/* ─── Persistent storage helpers ───────────────────────────── */
export const STORAGE_KEYS = {
  cities: 'skyline_v2_cities',
  theme:  'skyline_v2_theme',
  unit:   'skyline_v2_unit',
} as const;
