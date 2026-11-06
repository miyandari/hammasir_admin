import L from 'leaflet';
import { leafletLayer } from 'protomaps-leaflet';

/** فایل نقشه‌ی آفلاین (PMTiles) از محدوده‌ی شهر. در توسعه از public/tiles و در production از Nginx سرو می‌شود. */
const PMTILES_URL = (import.meta.env.VITE_PMTILES_URL as string | undefined) ?? '/tiles/zanjan.pmtiles';
const OSM_URL = (import.meta.env.VITE_TILE_URL as string | undefined) ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAX_DATA_ZOOM = 15;

/** مطمئن می‌شود فایل واقعاً PMTiles است (سرور SPA برای فایل ناموجود index.html برمی‌گرداند) و Range را پشتیبانی می‌کند */
async function pmtilesAvailable(): Promise<boolean> {
  try {
    const r = await fetch(PMTILES_URL, { headers: { Range: 'bytes=0-6' }, cache: 'no-cache' });
    if (!r.ok) return false;
    const head = new TextDecoder().decode(await r.arrayBuffer()).slice(0, 7);
    return head === 'PMTiles';
  } catch { return false; }
}

export type BaseKind = 'offline' | 'osm';

/** نقشه‌ی پایه را اضافه می‌کند: اگر فایل آفلاین بود از آن، وگرنه از OpenStreetMap. نوع انتخاب‌شده برگردانده می‌شود. */
export async function addBaseLayer(map: L.Map, alive: () => boolean = () => true): Promise<BaseKind | null> {
  const ok = await pmtilesAvailable();
  if (!alive()) return null; // نقشه در این فاصله حذف شده (مثلاً StrictMode)
  if (ok) {
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    leafletLayer({ url: PMTILES_URL, flavor: dark ? 'dark' : 'light', lang: 'fa', maxDataZoom: MAX_DATA_ZOOM, attribution: '© OpenStreetMap · Protomaps' }).addTo(map);
    return 'offline';
  }
  L.tileLayer(OSM_URL, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  return 'osm';
}
