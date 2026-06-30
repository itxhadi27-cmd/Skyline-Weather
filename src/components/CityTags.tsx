import type { City } from '../types';
import styles from './CityTags.module.css';

interface Props {
  cities: City[];
  activeIdx: number;
  onSelect: (i: number) => void;
  onRemove: (i: number) => void;
}

export default function CityTags({ cities, activeIdx, onSelect, onRemove }: Props) {
  if (!cities.length) return null;

  return (
    <div className={styles.row} role="tablist">
      {cities.map((c, i) => (
        <div
          key={`${c.lat}-${c.lon}`}
          className={`${styles.tag} ${i === activeIdx ? styles.active : ''}`}
          role="tab"
          aria-selected={i === activeIdx}
          onClick={() => onSelect(i)}
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(i); }}
        >
          <span className={styles.label}>
            {c.name}{c.country ? `, ${c.country}` : ''}
          </span>
          <button
            className={styles.remove}
            onClick={e => { e.stopPropagation(); onRemove(i); }}
            aria-label={`Remove ${c.name}`}
            tabIndex={0}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
