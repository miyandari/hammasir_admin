import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ApiError, get } from '../lib/api';
import { useDrivers } from '../lib/hooks';
import { type Loc, type ServiceT, type Station, type Trip, type Vehicle, TRIP_STATUS_FA } from '../lib/types';
import { Err } from '../components/ui';
import { useBase } from '../lib/basemap';
import BaseSwitch from '../components/BaseSwitch';
import PlaceSearch from '../components/PlaceSearch';

const ZANJAN: [number, number] = [36.68, 48.49];
const STALE_MS = 2 * 60 * 1000;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

interface Live { trip: Trip; loc: Loc | null; }

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso.endsWith('Z') || /[+-]\d\d:\d\d$/.test(iso) ? iso : iso + 'Z').getTime()) / 1000));
  if (s < 60) return `${s.toLocaleString('fa-IR')} ثانیه پیش`;
  if (s < 3600) return `${Math.round(s / 60).toLocaleString('fa-IR')} دقیقه پیش`;
  return `${Math.round(s / 3600).toLocaleString('fa-IR')} ساعت پیش`;
}
const ts = (iso: string) => new Date(iso.endsWith('Z') || /[+-]\d\d:\d\d$/.test(iso) ? iso : iso + 'Z').getTime();

export default function LiveMap() {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const stLayer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);
  const [focus, setFocus] = useState<number | null>(null);
  const base = useBase();
  const drivers = useDrivers();
  const services = useQuery({ queryKey: ['/services/'], queryFn: () => get<ServiceT[]>('/services/') });
  const vehicles = useQuery({ queryKey: ['/vehicles/'], queryFn: () => get<Vehicle[]>('/vehicles/') });
  const stations = useQuery({ queryKey: ['/stations/'], queryFn: () => get<Station[]>('/stations/') });

  const live = useQuery({
    queryKey: ['live'], refetchInterval: 10000,
    queryFn: async (): Promise<Live[]> => {
      const trips = (await get<Trip[]>('/trips/', { trip_date: today() })).filter((t) => t.status === 'in_progress' || t.status === 'boarding');
      return Promise.all(trips.map(async (trip) => {
        try { return { trip, loc: await get<Loc>(`/vehicle-locations/latest/${trip.id}`) }; }
        catch (e) { if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return { trip, loc: null }; throw e; }
      }));
    },
  });

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center: ZANJAN, zoom: 13 });
    void base.attach(m, () => map.current === m);
    layer.current = L.layerGroup().addTo(m); stLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = stLayer.current; if (!g) return; g.clearLayers();
    for (const s of stations.data ?? []) if (s.latitude != null && s.longitude != null && s.is_active)
      L.circleMarker([s.latitude, s.longitude], { radius: 4, color: '#667085', weight: 1, fillOpacity: 0.6 }).bindTooltip(s.name).addTo(g);
  }, [stations.data]);

  const sName = new Map((services.data ?? []).map((s) => [s.id, s.name]));
  const dName = new Map((drivers.data ?? []).map((d) => [d.id, `${d.first_name} ${d.last_name}`]));
  const plate = new Map((vehicles.data ?? []).map((v) => [v.id, v.plate_number]));
  const items = live.data ?? [];
  const located = items.filter((x) => x.loc);

  useEffect(() => {
    const g = layer.current, m = map.current; if (!g || !m) return; g.clearLayers();
    const pts: L.LatLngTuple[] = [];
    for (const { trip, loc } of items) {
      if (!loc) continue;
      const stale = Date.now() - ts(loc.recorded_at) > STALE_MS;
      const col = stale ? '#b54708' : trip.status === 'boarding' ? '#2563eb' : '#0f766e';
      const icon = L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17],
        html: `<div style="width:34px;height:34px;border-radius:50%;background:${col};color:#fff;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4);font-size:16px;transform:rotate(${loc.heading ?? 0}deg)">▲</div>` });
      L.marker([loc.latitude, loc.longitude], { icon }).bindPopup(
        `<b>${sName.get(trip.service_id) ?? ''}</b><br/>خودرو: ${plate.get(loc.vehicle_id) ?? loc.vehicle_id}<br/>راننده: ${trip.driver_id ? dName.get(trip.driver_id) ?? '' : '—'}<br/>سرعت: ${loc.speed != null ? Math.round(loc.speed) : '—'} km/h<br/>آخرین موقعیت: ${ago(loc.recorded_at)}`,
      ).addTo(g);
      pts.push([loc.latitude, loc.longitude]);
    }
    if (!fitted.current && pts.length) { m.fitBounds(L.latLngBounds(pts).pad(0.3), { maxZoom: 15 }); fitted.current = true; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.data, services.data, drivers.data, vehicles.data]);

  useEffect(() => {
    if (focus == null) return;
    const x = items.find((i) => i.trip.id === focus);
    if (x?.loc) map.current?.setView([x.loc.latitude, x.loc.longitude], 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  return (<>
    <div className="top"><h1>نقشه‌ی زنده</h1>
      <span className="mute">{live.isFetching ? 'در حال به‌روزرسانی…' : `${located.length.toLocaleString('fa-IR')} خودرو روی نقشه — هر ۱۰ ثانیه تازه می‌شود`}</span></div>
    <div className="maptools">
      <PlaceSearch local={(stations.data ?? []).filter((s) => s.latitude != null && s.longitude != null).map((s) => ({ name: s.name, lat: s.latitude as number, lng: s.longitude as number }))}
        onSelect={(pl) => map.current?.setView([pl.lat, pl.lng], 17)} />
      <BaseSwitch mode={base.mode} offlineOk={base.offlineOk} onChange={base.choose} />
    </div>
    <Err e={live.error} />
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 12 }} className="mapgrid">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}><div ref={el} style={{ height: 'calc(100vh - 170px)', minHeight: 420 }} /></div>
      <div className="card" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 170px)' }}>
        <b>سفرهای فعال ({items.length.toLocaleString('fa-IR')})</b>
        {!items.length && <p className="mute">اکنون سفر فعالی نیست.</p>}
        {items.map(({ trip, loc }) => {
          const stale = loc ? Date.now() - ts(loc.recorded_at) > STALE_MS : false;
          return (
            <div key={trip.id} onClick={() => loc && setFocus(trip.id)} style={{ padding: '10px 0', borderTop: '1px solid var(--line)', cursor: loc ? 'pointer' : 'default' }}>
              <div>{sName.get(trip.service_id) ?? trip.service_id}</div>
              <div className="mute" style={{ fontSize: 12 }}>{trip.driver_id ? dName.get(trip.driver_id) : 'راننده نامشخص'} · <span dir="ltr">{trip.vehicle_id ? plate.get(trip.vehicle_id) : '—'}</span></div>
              <div style={{ marginTop: 4 }}>
                <span className={`tag ${trip.status === 'boarding' ? '' : 'ok'}`}>{TRIP_STATUS_FA[trip.status]}</span>{' '}
                {!loc ? <span className="tag warn">موقعیتی دریافت نشده</span> : stale ? <span className="tag warn">قطع — {ago(loc.recorded_at)}</span> : <span className="mute" style={{ fontSize: 12 }}>{ago(loc.recorded_at)}</span>}
              </div>
            </div>);
        })}
        <p className="mute" style={{ fontSize: 12, marginTop: 12 }}>نقطه‌های خاکستری ایستگاه‌ها هستند. اگر پس‌زمینه‌ی نقشه خالی است، فایل نقشه‌ی آفلاین (tiles/zanjan.pmtiles) نیست و دسترسی به OpenStreetMap هم قطع است؛ فهرست کنار صفحه همچنان درست کار می‌کند.</p>
      </div>
    </div>
  </>);
}
