import { useCallback, useRef, useState } from 'react';
import L from 'leaflet';
import { leafletLayer } from 'protomaps-leaflet';

/** فایل نقشه‌ی آفلاین (PMTiles) از محدوده‌ی شهر. در توسعه از public/tiles و در production از Nginx سرو می‌شود. */
const PMTILES_URL = (import.meta.env.VITE_PMTILES_URL as string | undefined) ?? '/tiles/zanjan.pmtiles';
const OSM_URL = (import.meta.env.VITE_TILE_URL as string | undefined) ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const KEY = 'hm_basemap';

export type BaseMode = 'offline' | 'online';
/** سازگاری با کد قبلی */
export type BaseKind = 'offline' | 'osm';

/**
 * مطمئن می‌شود فایل واقعاً PMTiles است (سرور SPA برای فایل ناموجود index.html برمی‌گرداند) و Range را پشتیبانی می‌کند.
 * بیشینه‌ی زوم داده‌ی فایل از هدر (بایت ۱۰۱) خوانده می‌شود تا نقشه در زوم‌های بالاتر از داده خالی نشود.
 */
let availability: Promise<{ ok: boolean; maxZoom: number }> | null = null;
function probe() {
  availability ??= (async () => {
    try {
      const r = await fetch(PMTILES_URL, { headers: { Range: 'bytes=0-101' }, cache: 'no-cache' });
      if (!r.ok) return { ok: false, maxZoom: 15 };
      const buf = new Uint8Array(await r.arrayBuffer());
      const magic = new TextDecoder().decode(buf.slice(0, 7));
      return { ok: magic === 'PMTiles', maxZoom: buf.length > 101 && buf[101] > 0 && buf[101] < 23 ? buf[101] : 15 };
    } catch { return { ok: false, maxZoom: 15 }; }
  })();
  return availability;
}
export async function offlineAvailable(): Promise<boolean> { return (await probe()).ok; }
let dataZoom = 15;

export function savedMode(): BaseMode | null {
  try { const v = localStorage.getItem(KEY); return v === 'offline' || v === 'online' ? v : null; } catch { return null; }
}
function saveMode(m: BaseMode) { try { localStorage.setItem(KEY, m); } catch { /* ذخیره‌سازی در دسترس نیست */ } }

function makeLayer(mode: BaseMode): L.Layer {
  if (mode === 'offline') {
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return leafletLayer({ url: PMTILES_URL, flavor: dark ? 'dark' : 'light', lang: 'fa', maxDataZoom: dataZoom, attribution: '© OpenStreetMap · Protomaps' }) as unknown as L.Layer;
  }
  return L.tileLayer(OSM_URL, { maxZoom: 19, attribution: '© OpenStreetMap' });
}

/**
 * نقشه‌ی پایه با امکان تعویض آفلاین/آنلاین.
 * انتخاب کاربر در مرورگر ذخیره می‌شود؛ اگر هنوز انتخابی نشده باشد و فایل آفلاین موجود باشد از آن استفاده می‌شود.
 */
export function useBase() {
  const [mode, setModeState] = useState<BaseMode | null>(null);
  const [offlineOk, setOfflineOk] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.Layer | null>(null);

  const apply = useCallback((m: L.Map, next: BaseMode) => {
    if (layerRef.current) m.removeLayer(layerRef.current);
    const layer = makeLayer(next);
    layer.addTo(m); layerRef.current = layer;
    setModeState(next);
  }, []);

  /** پس از ساخت نقشه صدا زده شود. alive() اگر false باشد (نقشه حذف شده) کاری نمی‌کند. */
  const attach = useCallback(async (m: L.Map, alive: () => boolean = () => true) => {
    mapRef.current = m; layerRef.current = null;
    const info = await probe();
    const ok = info.ok; dataZoom = info.maxZoom;
    if (!alive()) return;
    setOfflineOk(ok);
    const want = savedMode();
    apply(m, want === 'online' || !ok ? 'online' : 'offline');
  }, [apply]);

  const choose = useCallback((next: BaseMode) => {
    const m = mapRef.current; if (!m) return;
    saveMode(next); apply(m, next);
  }, [apply]);

  return { mode, offlineOk, attach, choose };
}
