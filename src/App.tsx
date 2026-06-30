import { useState, useEffect, useCallback, useRef } from 'react';
import type { City, WeatherData, Unit, Theme } from './types';
import { useWeatherCache, STORAGE_KEYS } from './hooks/useWeather';
import { revGeoUrl, applyStationOverride } from './utils/weather';
import SearchBar from './components/SearchBar';
import CityTags from './components/CityTags';
import CityGrid from './components/CityGrid';
import MainWeatherCard from './components/MainWeatherCard';
import WeatherAnimation from './components/WeatherAnimation';
import Toast from './components/Toast';
import styles from './App.module.css';

/* ── Loading skeleton ── */
function LoadingSkeleton({ name }: { name: string }) {
  return (
    <div className={styles.emptyBox}>
      <div className={styles.spinner} />
      <p className={styles.emptyText}>Loading {name}…</p>
    </div>
  );
}

/* ── Error box ── */
function ErrorBox({ name, msg }: { name: string; msg: string }) {
  return (
    <div className={styles.emptyBox}>
      <div className={styles.emptyIcon}>⚠️</div>
      <h3 className={styles.emptyTitle}>Couldn't load {name}</h3>
      <p className={styles.emptyText}>{msg}</p>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div className={styles.emptyBox}>
      <div className={styles.emptyIcon}>🌤</div>
      <h3 className={styles.emptyTitle}>Your weather, at a glance</h3>
      <p className={styles.emptyText}>
        Search for any city above to see live weather conditions.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

export default function App() {
  /* ── Persisted state ── */
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEYS.theme) as Theme) ?? 'dark';
  });
  const [unit, setUnit] = useState<Unit>(() => {
    return (localStorage.getItem(STORAGE_KEYS.unit) as Unit) ?? 'C';
  });
  const [cities, setCities] = useState<City[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEYS.cities);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [activeIdx, setActiveIdx] = useState<number>(cities.length > 0 ? 0 : -1);

  /* ── Main weather data ── */
  const [mainData, setMainData] = useState<WeatherData | null>(null);
  const [mainLoading, setMainLoading] = useState(false);
  const [mainError, setMainError] = useState<string | null>(null);

  /* ── Cache & re-render trigger ── */
  const { fetchWeather, getCached } = useWeatherCache();
  const [cacheVersion, setCacheVersion] = useState(0);

  /* ── Toast ── */
  const [toast, setToast] = useState({ msg: '', vis: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast({ msg, vis: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, vis: false })), 2800);
  }, []);

  /* ── Locating state ── */
  const [isLocating, setIsLocating] = useState(false);

  /* ── Apply theme ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  /* ── Persist cities ── */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.cities, JSON.stringify(cities));
  }, [cities]);

  /* ── Persist unit ── */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.unit, unit);
  }, [unit]);

  /* ── Load weather for active city ── */
  const loadMain = useCallback(async (city: City) => {
    setMainLoading(true);
    setMainError(null);
    try {
      const d = await fetchWeather(city);
      setMainData(d);
    } catch (e: unknown) {
      setMainError(e instanceof Error ? e.message : 'Failed to load weather');
      setMainData(null);
    } finally {
      setMainLoading(false);
    }
  }, [fetchWeather]);

  /* ── Watch activeIdx + cities ── */
  useEffect(() => {
    if (activeIdx >= 0 && cities[activeIdx]) {
      loadMain(cities[activeIdx]);
    } else {
      setMainData(null);
      setMainError(null);
    }
  }, [activeIdx, cities, loadMain]);

  /* ── Background-fetch remaining cities ── */
  useEffect(() => {
    cities.forEach((c, i) => {
      if (i === activeIdx) return;
      fetchWeather(c)
        .then(() => setCacheVersion(v => v + 1))
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities.length]);

  /* ── Add city ── */
  const addCity = useCallback((city: City) => {
    setCities(prev => {
      const dup = prev.findIndex(
        c => Math.abs(c.lat - city.lat) < 0.15 && Math.abs(c.lon - city.lon) < 0.15
      );
      if (dup >= 0) {
        setActiveIdx(dup);
        return prev;
      }
      const next = [...prev, city];
      setActiveIdx(next.length - 1);
      return next;
    });
  }, []);

  /* ── Remove city ── */
  const removeCity = useCallback((idx: number) => {
    setCities(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setActiveIdx(ai => {
        if (next.length === 0) return -1;
        if (ai >= next.length) return next.length - 1;
        if (ai === idx) return Math.max(0, idx - 1);
        if (ai > idx) return ai - 1;
        return ai;
      });
      return next;
    });
  }, []);

  /* ── Geolocation ── */
  const handleLocate = useCallback(async () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const res = await fetch(revGeoUrl(lat, lon), {
            headers: { 'Accept-Language': 'en' },
          });
          const d = await res.json();
          const a = d.address ?? {};
          const name = a.city ?? a.town ?? a.village ?? a.county ?? 'My Location';
          const country = (a.country_code?.toUpperCase() ?? '') as string;
          addCity(applyStationOverride({ name, country, lat, lon }));
        } catch {
          showToast('Could not get your location name');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        showToast('Location access denied — search for a city above');
        setIsLocating(false);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }, [addCity, showToast]);

  /* ── Init: auto-locate if no saved cities ── */
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (cities.length === 0) handleLocate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Active city & animation data ── */
  const activeCity = activeIdx >= 0 ? cities[activeIdx] : null;
  const animWeatherCode = mainData?.current?.weather_code ?? 0;
  const localHour = new Date().getHours();
  const animIsDay = mainData?.current?.is_day ?? (localHour >= 6 && localHour < 20 ? 1 : 0);

  return (
    <div className={styles.appShell}>
      {/* Full-screen weather animation */}
      <WeatherAnimation weatherCode={animWeatherCode} isDay={animIsDay} />

      {/* Scrollable content layer */}
      <div className={styles.content}>
        <div className={styles.app}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.logo}>
              Sky<em className={styles.logoAccent}>line</em>
            </div>
            <div className={styles.headerRight}>
              {isLocating && (
                <div className={styles.locatingBadge}>
                  <span className={styles.spinnerSm} />
                  Detecting location…
                </div>
              )}
              <div className={styles.unitToggle}>
                <button
                  className={`${styles.unitBtn} ${unit === 'C' ? styles.unitOn : ''}`}
                  onClick={() => setUnit('C')}
                  aria-pressed={unit === 'C'}
                >
                  °C
                </button>
                <button
                  className={`${styles.unitBtn} ${unit === 'F' ? styles.unitOn : ''}`}
                  onClick={() => setUnit('F')}
                  aria-pressed={unit === 'F'}
                >
                  °F
                </button>
              </div>
              <button
                className={styles.iconBtn}
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </button>
            </div>
          </header>

          {/* Search */}
          <SearchBar onAddCity={addCity} onLocate={handleLocate} isLocating={isLocating} />

          {/* City tags */}
          <CityTags
            cities={cities}
            activeIdx={activeIdx}
            onSelect={setActiveIdx}
            onRemove={removeCity}
          />

          {/* Multi-city grid */}
          <CityGrid
            cities={cities}
            activeIdx={activeIdx}
            getCached={getCached}
            unit={unit}
            onSelect={setActiveIdx}
            key={cacheVersion}
          />

          {/* Main weather */}
          <main>
            {mainLoading && activeCity ? (
              <LoadingSkeleton name={activeCity.name} />
            ) : mainError && activeCity ? (
              <ErrorBox name={activeCity.name} msg={mainError} />
            ) : mainData && activeCity ? (
              <MainWeatherCard data={mainData} city={activeCity} unit={unit} />
            ) : (
              <EmptyState />
            )}
          </main>
        </div>
      </div>

      {/* Toast */}
      <Toast message={toast.msg} visible={toast.vis} />
    </div>
  );
}
