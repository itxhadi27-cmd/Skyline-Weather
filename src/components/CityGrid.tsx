import type { City, WeatherData, Unit } from '../types';
import { wmoInfo, fmtTempN } from '../utils/weather';
import styles from './CityGrid.module.css';

interface Props {
  cities: City[];
  activeIdx: number;
  getCached: (lat: number, lon: number) => WeatherData | null;
  unit: Unit;
  onSelect: (i: number) => void;
}

export default function CityGrid({ cities, activeIdx, getCached, unit, onSelect }: Props) {
  if (cities.length < 2) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>All cities</div>
      <div className={styles.grid}>
        {cities.map((city, i) => {
          const d = getCached(city.lat, city.lon);
          const cur = d?.current;
          const [ico, desc] = cur ? wmoInfo(cur.weather_code, cur.is_day) : ['—', ''];
          return (
            <div
              key={`${city.lat}-${city.lon}`}
              className={`${styles.card} ${i === activeIdx ? styles.selected : ''}`}
              onClick={() => onSelect(i)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(i); }}
            >
              <div className={styles.cardGlow} />
              <div className={styles.ico}>{ico}</div>
              <div className={styles.name}>{city.name}</div>
              <div className={styles.country}>{city.country}</div>
              {cur ? (
                <>
                  <div className={styles.temp}>{fmtTempN(cur.temperature_2m, unit)}°</div>
                  <div className={styles.desc}>{desc}</div>
                </>
              ) : (
                <div className={styles.temp}>…</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
