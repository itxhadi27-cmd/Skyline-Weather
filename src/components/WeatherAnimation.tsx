import { useMemo } from 'react';
import styles from './WeatherAnimation.module.css';

interface Props {
  weatherCode: number;
  isDay: number | boolean;
}

/* Map WMO code → animation type */
function getAnimationType(code: number, isDay: boolean): string {
  if (code === 0 || code === 1) return isDay ? 'sunny' : 'clearNight';
  if (code === 2 || code === 3) return isDay ? 'cloudy' : 'cloudyNight';
  if (code === 45 || code === 48) return 'foggy';
  if (code >= 51 && code <= 67) return isDay ? 'rainyDay' : 'rainyNight';
  if (code >= 71 && code <= 77) return 'snowy';
  if (code >= 80 && code <= 82) return isDay ? 'rainyDay' : 'rainyNight';
  if (code >= 85 && code <= 86) return 'snowy';
  if (code >= 95) return 'stormy';
  return isDay ? 'sunny' : 'clearNight';
}

/* Generate raindrops */
function Raindrops({ count = 60 }: { count?: number }) {
  const drops = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 0.5 + Math.random() * 0.5,
      opacity: 0.3 + Math.random() * 0.5,
      height: 10 + Math.random() * 14,
    })), [count]);
  return (
    <>
      {drops.map(d => (
        <div
          key={d.id}
          className={styles.raindrop}
          style={{
            left: `${d.left}%`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
            opacity: d.opacity,
            height: `${d.height}px`,
          }}
        />
      ))}
    </>
  );
}

/* Generate snowflakes */
function Snowflakes({ count = 40 }: { count?: number }) {
  const flakes = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      size: 4 + Math.random() * 8,
      opacity: 0.4 + Math.random() * 0.5,
    })), [count]);
  return (
    <>
      {flakes.map(f => (
        <div
          key={f.id}
          className={styles.snowflake}
          style={{
            left: `${f.left}%`,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            opacity: f.opacity,
          }}
        >❄</div>
      ))}
    </>
  );
}

/* Clouds */
function Clouds({ count = 4, night = false }: { count?: number; night?: boolean }) {
  const clouds = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      top: 5 + (i * 18) % 45,
      duration: 18 + i * 7,
      delay: -(i * 5),
      size: 0.7 + (i % 3) * 0.25,
      opacity: night ? 0.15 + (i % 3) * 0.06 : 0.18 + (i % 3) * 0.06,
    })), [count, night]);
  return (
    <>
      {clouds.map(c => (
        <div
          key={c.id}
          className={styles.cloud}
          style={{
            top: `${c.top}%`,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
            transform: `scale(${c.size})`,
            opacity: c.opacity,
          }}
        />
      ))}
    </>
  );
}

/* Stars */
function Stars({ count = 80 }: { count?: number }) {
  const stars = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 70,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
    })), [count]);
  return (
    <>
      {stars.map(s => (
        <div
          key={s.id}
          className={styles.star}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </>
  );
}

/* Lightning */
function Lightning() {
  return (
    <>
      <div className={`${styles.lightning} ${styles.lightning1}`} />
      <div className={`${styles.lightning} ${styles.lightning2}`} />
    </>
  );
}

export default function WeatherAnimation({ weatherCode, isDay }: Props) {
  const dayBool = Boolean(isDay);
  const type = getAnimationType(weatherCode, dayBool);

  return (
    <div className={`${styles.animContainer} ${styles[type]}`} aria-hidden="true">
      {/* Sunny */}
      {type === 'sunny' && (
        <>
          <div className={styles.sun} />
          <div className={styles.sunRays} />
          <Clouds count={2} />
        </>
      )}

      {/* Clear night */}
      {type === 'clearNight' && (
        <>
          <div className={styles.moon} />
          <Stars count={90} />
        </>
      )}

      {/* Cloudy day */}
      {type === 'cloudy' && (
        <>
          <div className={styles.sunBehind} />
          <Clouds count={5} />
        </>
      )}

      {/* Cloudy night */}
      {type === 'cloudyNight' && (
        <>
          <Stars count={30} />
          <Clouds count={5} night />
        </>
      )}

      {/* Foggy */}
      {type === 'foggy' && (
        <>
          <div className={styles.fogLayer1} />
          <div className={styles.fogLayer2} />
          <div className={styles.fogLayer3} />
        </>
      )}

      {/* Rainy day */}
      {type === 'rainyDay' && (
        <>
          <Clouds count={6} />
          <Raindrops count={65} />
        </>
      )}

      {/* Rainy night */}
      {type === 'rainyNight' && (
        <>
          <Stars count={20} />
          <Clouds count={6} night />
          <Raindrops count={65} />
        </>
      )}

      {/* Snowy */}
      {type === 'snowy' && (
        <>
          <Clouds count={5} />
          <Snowflakes count={45} />
        </>
      )}

      {/* Stormy */}
      {type === 'stormy' && (
        <>
          <Clouds count={7} />
          <Raindrops count={80} />
          <Lightning />
        </>
      )}
    </div>
  );
}
