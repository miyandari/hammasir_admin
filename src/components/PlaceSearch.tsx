import { useState, type FormEvent } from 'react';
import Icon from './Icon';

export interface Place { name: string; lat: number; lng: number; src: 'local' | 'osm'; }
const GEOCODER = (import.meta.env.VITE_GEOCODE_URL as string | undefined) ?? 'https://nominatim.openstreetmap.org/search';
/** مستطیل شهر زنجان برای اولویت‌دادن نتایج (lon1,lat1,lon2,lat2) */
const VIEWBOX = '48.30,36.80,48.70,36.55';

const norm = (s: string) => s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\s]+/g, ' ').trim().toLowerCase();

/**
 * جستجوی نام مکان.
 * ۱) همیشه بین مکان‌های داخلی (ایستگاه‌های ثبت‌شده) جستجو می‌کند — آفلاین هم کار می‌کند.
 * ۲) فقط با زدن دکمه/Enter از Nominatim (OpenStreetMap) هم می‌پرسد؛ بدون اینترنت پیام مناسب نشان می‌دهد.
 */
export default function PlaceSearch({ local = [], onSelect }: { local?: { name: string; lat: number; lng: number }[]; onSelect: (p: Place) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function go(e: FormEvent) {
    e.preventDefault(); e.stopPropagation();
    const term = q.trim(); if (!term) return;
    setBusy(true); setNote('');
    const n = norm(term);
    const mine: Place[] = local.filter((p) => norm(p.name).includes(n)).slice(0, 6).map((p) => ({ ...p, src: 'local' as const }));
    let online: Place[] = [];
    try {
      const url = `${GEOCODER}?${new URLSearchParams({ q: term, format: 'jsonv2', limit: '6', 'accept-language': 'fa', countrycodes: 'ir', viewbox: VIEWBOX })}`;
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 7000);
      const r = await fetch(url, { signal: ctl.signal }); clearTimeout(t);
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { display_name: string; lat: string; lon: string }[];
      online = j.map((x) => ({ name: x.display_name, lat: Number(x.lat), lng: Number(x.lon), src: 'osm' as const })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    } catch { setNote('جستجوی آنلاین در دسترس نیست؛ فقط ایستگاه‌های ثبت‌شده جستجو شد.'); }
    const all = [...mine, ...online];
    setRes(all); if (!all.length) setNote((x) => x || 'مکانی پیدا نشد.');
    setBusy(false);
  }

  return (
    <div className="psearch">
      <form onSubmit={go} className="psrow">
        <input value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value) setRes(null); }} placeholder="جستجوی نام مکان یا ایستگاه…" aria-label="جستجوی مکان" />
        <button className="btn" disabled={busy || !q.trim()} aria-label="جستجو"><Icon name="search" size={16} /></button>
      </form>
      {note && <div className="mute psnote">{note}</div>}
      {res && res.length > 0 && (
        <ul className="pslist">
          {res.map((p, i) => (
            <li key={i}><button type="button" onClick={() => { onSelect(p); setRes(null); }}>
              <span>{p.name}</span><small className="mute">{p.src === 'local' ? 'ایستگاه ثبت‌شده' : 'OpenStreetMap'}</small></button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
