import type { WeatherData, City, Unit } from '../types';
import {
  wmoInfo, fmtTemp, fmtTempN, windDir,
  dewPoint, comfortLabel, uvLabel, dayName,
} from '../utils/weather';
import styles from './MainWeatherCard.module.css';

interface Props {
  data: WeatherData;
  city: City;
  unit: Unit;
}

export default function MainWeatherCard({ data, city, unit }: Props) {
  const cur = data.current;
  const hrly = data.hourly;
  const daily = data.daily;

  // Use the city's actual timezone returned by the API
  const tz = data.timezone ?? 'UTC';

  const [mainIco, mainDesc] = wmoInfo(cur.weather_code, cur.is_day);

  // Display current time in the CITY's timezone
  const nowInCity = new Date();
  const timeStr = nowInCity.toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Current hour in city's timezone (for filtering hourly)
  const cityHourStr = nowInCity.toLocaleString('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  // Build a comparable ISO-like string from the city's local time
  const cityNowParts = nowInCity.toLocaleString('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).replace(', ', 'T');

  /* ── Hourly — next 24 slots from current city-local hour ── */
  const hSlice = hrly.time
    .map((t, i) => ({
      t,
      temp: hrly.temperature_2m[i],
      code: hrly.weather_code[i],
      pop: hrly.precipitation_probability[i],
      // Use the API's actual is_day for each hour — this is accurate per location
      isDay: hrly.is_day ? hrly.is_day[i] : (new Date(t).getHours() >= 6 && new Date(t).getHours() < 20 ? 1 : 0),
    }))
    .filter(h => h.t >= cityNowParts.slice(0, 13))
    .slice(0, 24);

  /* ── Today's date in city timezone ── */
  const todayISO = nowInCity.toLocaleDateString('en-CA', { timeZone: tz }); // returns YYYY-MM-DD

  /* ── Extras ── */
  const uv = Math.round(cur.uv_index ?? 0);
  const uvPct = Math.min((uv / 12) * 100, 100);
  const dp = dewPoint(cur.temperature_2m, cur.relative_humidity_2m);
  const vis = cur.visibility != null
    ? `${(cur.visibility / 1000).toFixed(1)} km`
    : '—';

  // Format sunrise/sunset in CITY timezone
  const formatCityTime = (iso: string) => {
    // API returns times like "2024-01-15T06:32" without timezone — treat as city-local
    // The API with timezone=auto returns local times already
    const parts = iso.split('T');
    if (parts.length < 2) return '—';
    const [h, m] = parts[1].split(':');
    const hour = parseInt(h, 10);
    const min = m ?? '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${min} ${ampm}`;
  };

  const sr = daily.sunrise?.[0] ? formatCityTime(daily.sunrise[0]) : '—';
  const ss = daily.sunset?.[0]  ? formatCityTime(daily.sunset[0])  : '—';

  const formatHourLabel = (isoLocal: string) => {
    // API returns local times already (no Z suffix), just parse the time part
    const parts = isoLocal.split('T');
    if (parts.length < 2) return isoLocal;
    const [h, m] = parts[1].split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m ?? '00'} ${ampm}`;
  };

  return (
    <div className="fadeUp">
      {/* ── Hero card ── */}
      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroTop}>
          <div className={styles.heroLeft}>
            <div className={styles.mainIcon}>{mainIco}</div>
            <h2 className={styles.cityName}>
              {city.name}{city.country ? `, ${city.country}` : ''}
            </h2>
            <div className={styles.time}>{timeStr}</div>
            <div className={styles.desc}>{mainDesc}</div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.bigTemp}>
              {fmtTempN(cur.temperature_2m, unit)}
              <sup className={styles.unit}>°{unit}</sup>
            </div>
            <div className={styles.feelsLike}>
              Feels like {fmtTemp(cur.apparent_temperature, unit)}
            </div>
            <div className={styles.hiLo}>
              ↑ {fmtTemp(daily.temperature_2m_max[0], unit)}
              &nbsp;·&nbsp;
              ↓ {fmtTemp(daily.temperature_2m_min[0], unit)}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className={styles.stats}>
          {[
            { icon: '💧', val: `${cur.relative_humidity_2m}%`, label: 'Humidity' },
            { icon: '💨', val: `${Math.round(cur.wind_speed_10m)} km/h`, label: `Wind ${windDir(cur.wind_direction_10m ?? 0)}` },
            { icon: '👁', val: vis, label: 'Visibility' },
            { icon: '🌡', val: `${Math.round(cur.pressure_msl ?? 0)} hPa`, label: 'Pressure' },
            { icon: '🌅', val: sr, label: 'Sunrise' },
            { icon: '🌇', val: ss, label: 'Sunset' },
          ].map(s => (
            <div key={s.label} className={styles.stat}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div className={styles.statVal}>{s.val}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hourly + 7-day ── */}
      <div className={styles.twoCol}>
        {/* Hourly */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>24-hour forecast</div>
          <div className={styles.hourlyList}>
            {hSlice.map((h, i) => {
              const lbl = i === 0 ? 'Now' : formatHourLabel(h.t);
              const [hIco] = wmoInfo(h.code, h.isDay);
              return (
                <div key={h.t} className={`${styles.hourRow} ${i === 0 ? styles.nowRow : ''}`}>
                  <div className={styles.hourRowTime}>{lbl}</div>
                  <div className={styles.hourRowIcon}>{hIco}</div>
                  <div className={styles.hourRowPop}>{h.pop > 20 ? `${h.pop}%` : ''}</div>
                  <div className={styles.hourRowTemp}>{fmtTempN(h.temp, unit)}°</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7-day */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>7-day forecast</div>
          <div className={styles.weekList}>
            {daily.time.map((t, i) => {
              const isToday = t === todayISO;
              const [dIco, dDesc] = wmoInfo(daily.weather_code[i], 1);
              return (
                <div key={t} className={`${styles.dayRow} ${isToday ? styles.todayRow : ''}`}>
                  <div className={styles.dayName}>{dayName(t, isToday)}</div>
                  <div className={styles.dayIcon}>{dIco}</div>
                  <div className={styles.dayDesc}>{dDesc}</div>
                  <div className={styles.dayTemps}>
                    <span className={styles.tempLo}>{fmtTempN(daily.temperature_2m_min[i], unit)}°</span>
                    <span className={styles.tempHi}>{fmtTempN(daily.temperature_2m_max[i], unit)}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Atmosphere panel ── */}
      <div className={styles.card} style={{ marginBottom: 0 }}>
        <div className={styles.cardLabel}>Atmosphere & air</div>
        <div className={styles.atmoGrid}>
          {/* UV */}
          <div className={styles.atmoItem}>
            <div className={styles.atmoLabel}>UV Index</div>
            <div className={styles.atmoVal}>{uv} — {uvLabel(uv)}</div>
            <div className={styles.uvBar}>
              <div
                className={styles.uvDot}
                style={{ left: `calc(${uvPct.toFixed(1)}% - 6px)` }}
              />
            </div>
          </div>

          {/* Dew point */}
          <div className={styles.atmoItem}>
            <div className={styles.atmoLabel}>Dew point</div>
            <div className={styles.atmoVal}>{fmtTemp(dp, unit)}</div>
            <div className={styles.atmoSub}>{comfortLabel(cur.relative_humidity_2m)}</div>
          </div>

          {/* Cloud cover */}
          <div className={styles.atmoItem}>
            <div className={styles.atmoLabel}>Cloud cover</div>
            <div className={styles.atmoVal}>{cur.cloud_cover}%</div>
            <div className={styles.progBar}>
              <div className={styles.progFill} style={{ width: `${cur.cloud_cover}%` }} />
            </div>
          </div>

          {/* Wind gusts */}
          <div className={styles.atmoItem}>
            <div className={styles.atmoLabel}>Wind gusts</div>
            <div className={styles.atmoVal}>{Math.round(cur.wind_gusts_10m ?? 0)} km/h</div>
            <div className={styles.atmoSub}>{windDir(cur.wind_direction_10m ?? 0)} direction</div>
          </div>

          {/* Precipitation */}
          <div className={styles.atmoItem}>
            <div className={styles.atmoLabel}>Precipitation</div>
            <div className={styles.atmoVal}>{(cur.precipitation ?? 0).toFixed(1)} mm</div>
            <div className={styles.atmoSub}>last hour</div>
          </div>

          {/* Rain chance */}
          <div className={styles.atmoItem}>
            <div className={styles.atmoLabel}>Rain chance today</div>
            <div className={styles.atmoVal}>{daily.precipitation_probability_max?.[0] ?? 0}%</div>
            <div className={styles.progBar}>
              <div
                className={styles.progFill}
                style={{ width: `${daily.precipitation_probability_max?.[0] ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
