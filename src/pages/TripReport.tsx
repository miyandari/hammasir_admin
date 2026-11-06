import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useDrivers, useUniField } from '../lib/hooks';
import { TRIP_STATUS_FA, type AnalyticsReport, type ServiceT, type Trip, type TripSummary, type Vehicle } from '../lib/types';
import { Err, Table } from '../components/ui';
import JalaliDate, { isoToJalali, jalaliToIso, showJalali, todayIso } from '../components/JalaliDate';

const n = (x: number | null | undefined) => (x == null ? '—' : x.toLocaleString('fa-IR'));
const firstOfMonth = () => { const j = isoToJalali(todayIso())!; return jalaliToIso(j.jy, j.jm, 1); };
const tone = (s: string) => (s === 'completed' ? 'ok' : s === 'cancelled' ? 'bad' : s === 'scheduled' ? '' : 'warn');
const hhmm = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '—');
const ACTIVE = ['in_progress', 'boarding'];

/** گزارش مدیریتی سفرها: انجام‌شده، در حال انجام، لغوشده، به تفکیک سرویس و فهرست کامل، با خروجی CSV */
export default function TripReport() {
  const { me } = useAuth();
  const uf = useUniField();
  const [from, setFrom] = useState(firstOfMonth()); const [to, setTo] = useState(todayIso());
  const [uni, setUni] = useState(''); const [svc, setSvc] = useState(''); const [st, setSt] = useState('');
  const uniParam = uf.isSuper && uni ? { university_id: uni } : {};
  const staff = me?.role !== 'company_admin'; // گزارش مصرف مسیر برای شرکت در دسترس نیست

  const trips = useQuery({ queryKey: ['trip-report', from, to, uni, svc, st], queryFn: () => get<Trip[]>('/trips/', { from_date: from, to_date: to, ...uniParam, ...(svc ? { service_id: svc } : {}), ...(st ? { status: st } : {}) }) });
  const needUni = uf.isSuper && !uni; // API خلاصه برای مدیر ارشد دانشگاه را الزامی می‌داند
  const summary = useQuery({ queryKey: ['trip-summary', from, to, uni], enabled: !needUni, queryFn: () => get<TripSummary>('/reports/summary', { from_date: from, to_date: to, ...uniParam }) });
  const usage = useQuery({ queryKey: ['route-usage', from, to, uni, svc], enabled: staff, retry: false, queryFn: () => get<AnalyticsReport>('/analytics-reports/', { start_date: from, end_date: to, ...uniParam, ...(svc ? { service_id: svc } : {}) }) });
  const services = useQuery({ queryKey: ['/services/'], queryFn: () => get<ServiceT[]>('/services/') });
  const vehicles = useQuery({ queryKey: ['/vehicles/'], queryFn: () => get<Vehicle[]>('/vehicles/') });
  const drivers = useDrivers();

  const sName = useMemo(() => new Map((services.data ?? []).map((s) => [s.id, s.name])), [services.data]);
  const plate = useMemo(() => new Map((vehicles.data ?? []).map((v) => [v.id, v.plate_number])), [vehicles.data]);
  const dName = useMemo(() => new Map((drivers.data ?? []).map((d) => [d.id, `${d.first_name} ${d.last_name}`])), [drivers.data]);

  const rows = trips.data ?? [];
  const cnt = (f: (t: Trip) => boolean) => rows.filter(f).length;
  const bySvc = useMemo(() => {
    const m = new Map<number, { total: number; done: number; live: number; cancelled: number }>();
    for (const t of rows) {
      const x = m.get(t.service_id) ?? { total: 0, done: 0, live: 0, cancelled: 0 };
      x.total++; if (t.status === 'completed') x.done++; else if (ACTIVE.includes(t.status)) x.live++; else if (t.status === 'cancelled') x.cancelled++;
      m.set(t.service_id, x);
    }
    return [...m.entries()].map(([id, v]) => ({ id, name: sName.get(id) ?? `سرویس ${id}`, ...v })).sort((a, b) => b.total - a.total);
  }, [rows, sName]);

  function csv() {
    const head = ['تاریخ', 'سرویس', 'راننده', 'خودرو', 'ساعت برنامه', 'حرکت واقعی', 'رسیدن واقعی', 'وضعیت'];
    const body = rows.map((t) => [showJalali(t.trip_date), sName.get(t.service_id) ?? String(t.service_id), t.driver_id ? dName.get(t.driver_id) ?? '' : '', t.vehicle_id ? plate.get(t.vehicle_id) ?? '' : '', hhmm(t.planned_departure_time), hhmm(t.actual_departure_time), hhmm(t.actual_arrival_time), TRIP_STATUS_FA[t.status] ?? t.status]);
    const blob = new Blob(['﻿' + [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `trip-report_${from}_${to}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  }

  const s = summary.data;
  return (<>
    <div className="top"><h1>گزارش سفرها</h1>
      <button className="btn ghost" onClick={csv} disabled={!rows.length}>خروجی CSV</button></div>
    <div className="card filters">
      <div><span className="mute fl">از</span><JalaliDate value={from} onChange={(x) => x && setFrom(x)} /></div>
      <div><span className="mute fl">تا</span><JalaliDate value={to} onChange={(x) => x && setTo(x)} /></div>
      <div className="frow">
        {uf.isSuper && <label>دانشگاه<select value={uni} onChange={(e) => { setUni(e.target.value); setSvc(''); }}><option value="">همه</option>{uf.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}
        <label>سرویس<select value={svc} onChange={(e) => setSvc(e.target.value)}><option value="">همه</option>{(services.data ?? []).filter((x) => !uni || x.university_id === Number(uni)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>وضعیت<select value={st} onChange={(e) => setSt(e.target.value)}><option value="">همه</option>{Object.entries(TRIP_STATUS_FA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      </div>
    </div>
    <Err e={trips.error ?? (needUni ? null : summary.error)} />
    <div className="grid" style={{ margin: '16px 0', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
      <div className="card stat"><b>{n(rows.length)}</b><span>کل سفرها</span></div>
      <div className="card stat"><b>{n(cnt((t) => t.status === 'completed'))}</b><span>انجام‌شده</span></div>
      <div className="card stat"><b>{n(cnt((t) => ACTIVE.includes(t.status)))}</b><span>در حال انجام</span></div>
      <div className="card stat"><b>{n(cnt((t) => t.status === 'scheduled'))}</b><span>برنامه‌ریزی‌شده</span></div>
      <div className="card stat"><b>{n(cnt((t) => t.status === 'cancelled'))}</b><span>لغوشده</span></div>
    </div>
    {needUni && <p className="mute">برای دیدن آمار مسافران و رزروها یک دانشگاه انتخاب کنید.</p>}
    {s && !needUni && <div className="grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
      <div className="card stat"><b>{n(s.total_boarded_passengers)}</b><span>مسافر سوارشده</span></div>
      <div className="card stat"><b>{n(s.active_reservations)}</b><span>رزرو فعال</span></div>
      <div className="card stat"><b>{n(s.no_show_students)}</b><span>رزرو بدون حضور</span></div>
      <div className="card stat"><b>{n(s.boarding_without_reservation)}</b><span>سوار شده بدون رزرو</span></div>
    </div>}
    <h3 className="sect">به تفکیک سرویس</h3>
    <Table rows={bySvc} cols={[
      { head: 'سرویس', cell: (r) => r.name }, { head: 'کل', cell: (r) => n(r.total) }, { head: 'انجام‌شده', cell: (r) => n(r.done) },
      { head: 'در حال انجام', cell: (r) => n(r.live) }, { head: 'لغوشده', cell: (r) => n(r.cancelled) },
    ]} />
    {staff && !!usage.data?.route_usage.length && <>
      <h3 className="sect">میزان استفاده از مسیرها (سفرهای انجام‌شده)</h3>
      <Table rows={usage.data.route_usage} cols={[
        { head: 'مسیر', cell: (r) => r.route_name }, { head: 'سفر انجام‌شده', cell: (r) => n(r.completed_trip_count) },
        { head: 'ظرفیت کل', cell: (r) => n(r.total_capacity) }, { head: 'رزرو', cell: (r) => n(r.reservation_count) },
        { head: 'درصد استفاده', cell: (r) => <span className={`tag ${r.usage_percent >= 60 ? 'ok' : r.usage_percent >= 25 ? 'warn' : 'bad'}`}>{r.usage_percent.toLocaleString('fa-IR')}٪</span> },
      ]} />
    </>}
    <h3 className="sect">فهرست سفرها</h3>
    <Table rows={rows} empty="در این بازه سفری یافت نشد" cols={[
      { head: 'تاریخ', cell: (r) => showJalali(r.trip_date) }, { head: 'سرویس', cell: (r) => sName.get(r.service_id) ?? r.service_id },
      { head: 'راننده', cell: (r) => (r.driver_id ? dName.get(r.driver_id) ?? r.driver_id : '—') },
      { head: 'خودرو', cell: (r) => (r.vehicle_id ? <span dir="ltr">{plate.get(r.vehicle_id) ?? r.vehicle_id}</span> : '—') },
      { head: 'برنامه', cell: (r) => hhmm(r.planned_departure_time) }, { head: 'حرکت', cell: (r) => hhmm(r.actual_departure_time) }, { head: 'رسیدن', cell: (r) => hhmm(r.actual_arrival_time) },
      { head: 'وضعیت', cell: (r) => <span className={`tag ${tone(r.status)}`}>{TRIP_STATUS_FA[r.status] ?? r.status}</span> },
    ]} />
    <p className="mute" style={{ marginTop: 12 }}>بازه بر اساس تاریخ شمسی است. آمار مسافران و رزروها از گزارش خلاصه‌ی سامانه می‌آید.{!staff && ' (گزارش میزان استفاده از مسیرها برای کاربران شرکت نمایش داده نمی‌شود.)'}</p>
  </>);
}
