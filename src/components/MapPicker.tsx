import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addBaseLayer, type BaseKind } from '../lib/basemap';
import { Modal } from './ui';

const ZANJAN: [number, number] = [36.68, 48.49];
const pin = L.divIcon({ className: '', iconSize: [28, 36], iconAnchor: [14, 34],
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0f766e;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45)"></div>' });

/** انتخاب نقطه روی نقشه: با کلیک نشانگر جابه‌جا می‌شود؛ با کشیدن هم می‌شود تنظیم کرد. */
export default function MapPicker({ lat, lng, others = [], onPick, onClose }: {
  lat: number | null; lng: number | null; others?: { name: string; lat: number; lng: number }[];
  onPick: (lat: number, lng: number) => void; onClose: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [pt, setPt] = useState<[number, number] | null>(lat != null && lng != null ? [lat, lng] : null);
  const [base, setBase] = useState<BaseKind | null>(null);
  const marker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!el.current) return;
    let cancelled = false;
    const m = L.map(el.current, { center: pt ?? ZANJAN, zoom: pt ? 16 : 13 });
    void addBaseLayer(m, () => !cancelled).then((k) => { if (k) setBase(k); });
    for (const o of others) L.circleMarker([o.lat, o.lng], { radius: 4, color: '#667085', weight: 1, fillOpacity: 0.6 }).bindTooltip(o.name).addTo(m);
    const put = (p: [number, number]) => {
      setPt(p);
      if (!marker.current) {
        marker.current = L.marker(p, { icon: pin, draggable: true }).addTo(m);
        marker.current.on('dragend', () => { const q = marker.current!.getLatLng(); setPt([q.lat, q.lng]); });
      } else marker.current.setLatLng(p);
    };
    if (pt) put(pt);
    m.on('click', (e: L.LeafletMouseEvent) => put([e.latlng.lat, e.latlng.lng]));
    return () => { cancelled = true; marker.current = null; m.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title="انتخاب موقعیت روی نقشه" onClose={onClose} wide>
      <div>
        <div ref={el} style={{ height: 'clamp(220px, calc(100dvh - 250px), 460px)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }} />
        <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
          <span className="mute" dir="ltr">{pt ? `${pt[0].toFixed(6)}, ${pt[1].toFixed(6)}` : 'روی نقشه کلیک کنید'}</span>
          <span className="mute" style={{ fontSize: 12 }}>{base === 'offline' ? 'نقشه‌ی آفلاین' : base === 'osm' ? 'نقشه‌ی آنلاین' : ''}</span>
          <button className="btn" disabled={!pt} onClick={() => { if (pt) { onPick(pt[0], pt[1]); onClose(); } }}>تأیید موقعیت</button>
        </div>
      </div>
    </Modal>
  );
}
