import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { GeoResult, City } from '../types';
import { geoUrl, applyStationOverride } from '../utils/weather';
import styles from './SearchBar.module.css';

interface Props {
  onAddCity: (city: City) => void;
  onLocate: () => void;
  isLocating: boolean;
}

function parseGeoResult(d: GeoResult): City {
  const a = d.address ?? {};
  const name =
    a.city ?? a.town ?? a.village ?? a.county ??
    d.name ?? d.display_name.split(',')[0];
  const country = (a.country_code?.toUpperCase() ?? a.country ?? '');
  return applyStationOverride({ name, country, lat: +d.lat, lon: +d.lon });
}

export default function SearchBar({ onAddCity, onLocate: _onLocate, isLocating }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  /* ── Fetch suggestions ── */
  const fetchSuggestions = useCallback(async (q: string) => {
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(geoUrl(q), {
        headers: { 'Accept-Language': 'en' },
      });
      const data: GeoResult[] = await res.json();
      setSuggestions(data.filter(d => d.display_name));
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Input change ── */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setFocusIdx(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!v || v.length < 2) {
      setOpen(false);
      setSuggestions([]);
      return;
    }
    timerRef.current = setTimeout(() => fetchSuggestions(v), 350);
  };

  /* ── Pick suggestion ── */
  const pick = (d: GeoResult) => {
    const city = parseGeoResult(d);
    setQuery('');
    setOpen(false);
    setSuggestions([]);
    onAddCity(city);
    inputRef.current?.blur();
  };

  /* ── Search (enter / button) ── */
  const doSearch = async () => {
    const q = query.trim();
    if (!q) return;
    if (suggestions.length > 0) {
      pick(suggestions[focusIdx >= 0 ? focusIdx : 0]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(geoUrl(q), { headers: { 'Accept-Language': 'en' } });
      const data: GeoResult[] = await res.json();
      if (!data.length) { setOpen(true); setSuggestions([]); return; }
      pick(data[0]);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  /* ── Keyboard navigation ── */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') doSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIdx >= 0) pick(suggestions[focusIdx]);
      else doSearch();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  /* ── Close on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <div className={styles.inputWrap}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Search city — London, Tokyo, Dubai…"
            autoComplete="off"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
            aria-label="Search city"
            aria-autocomplete="list"
            aria-expanded={open}
          />
          {/* Dropdown */}
          {open && (
            <div ref={dropRef} className={styles.dropdown} role="listbox">
              {loading ? (
                <div className={styles.hint}>
                  <span className={styles.spinner} />
                  Searching…
                </div>
              ) : suggestions.length === 0 ? (
                <div className={styles.hint}>No results found</div>
              ) : (
                suggestions.map((d, i) => {
                  const a = d.address ?? {};
                  const city =
                    a.city ?? a.town ?? a.village ?? a.county ??
                    d.name ?? d.display_name.split(',')[0];
                  const state = a.state ?? '';
                  const country = a.country ?? '';
                  const sub = [state, country].filter(Boolean).join(', ');
                  return (
                    <div
                      key={i}
                      className={`${styles.item} ${i === focusIdx ? styles.focused : ''}`}
                      onMouseDown={() => pick(d)}
                      onMouseEnter={() => setFocusIdx(i)}
                      role="option"
                      aria-selected={i === focusIdx}
                    >
                      <span className={styles.pin}>📍</span>
                      <div>
                        <div className={styles.cityName}>{city || d.display_name.split(',')[0]}</div>
                        {sub && <div className={styles.sub}>{sub}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <button
          className={styles.addBtn}
          onClick={doSearch}
          disabled={!query.trim() || isLocating}
          aria-label="Add city"
        >
          {isLocating ? <span className={styles.spinnerSm} /> : '+ Add'}
          {isLocating ? 'Locating…' : ''}
        </button>
      </div>
    </div>
  );
}
