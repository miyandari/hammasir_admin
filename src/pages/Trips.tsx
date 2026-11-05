import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../lib/api';
import { useDrivers, useUniField } from '../lib/hooks';
import { TRIP_STATUS_FA, type Driver, type ServiceT, type Trip, type Vehicle } from '../lib/types';
import { Err, Modal, Table } from '../components/ui';
import FormModal from '../components/FormModal';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const hm = (s: string | null) => (s ? new Date(s).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '—');

export default function Trips() {
  const uni = useUniField(); const qc = useQueryClient();
  const [date, setDate] = useState(iso(new Date()));
  const [uid, setUid] = useState<string>('');
  const q = useQuery({ queryKey: ['trips', date], queryFn: () => get<Trip[]>('/trips/', { trip_date: date }), refetchInterval: 30000 });
  const services = useQuery({ queryKey: ['/services/'], queryFn: () => get<ServiceT[]>('/services/') });
  const drivers = useDrivers();
  const vehicles = useQuery({ queryKey: ['/vehicles/'], queryFn: () => get<Vehicle[]>('/vehicles/') });
  const [assign, setAssign] = useState<Trip | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['trips'] });
  const gen = useMutation({
    mutationFn: () => api<Trip[]>('POST', '/trips/generate-daily', { json: { university_id: uni.isSuper ? Number(uid) : uni.myUni, trip_date: date } }),
    onSuccess: (r) => { setMsg(r.length ? `${r.length.toLocaleString('fa-IR')} سفر برای این روز ساخته شد.` : 'سفر جدیدی ساخته نشد: یا سفرهای این روز قبلاً ساخته شده‌اند، یا برای این روز سرویس فعالِ دارای برنامه‌ی هفتگی نیست، یا تاریخ خارج از بازه‌ی قرارداد سرویس است.'); refresh(); }, onError: () => setMsg(null),
  });
  const cancel = useMutation({ mutationFn: (t: Trip) => api('PATCH', `/trips/${t.id}/status`, { json: { status: 'cancelled' } }), onSuccess: refresh });
  const sv = new Map((services.data ?? []).map((s) => [s.id, s.name]));
  const dn = new Map((drivers.data ?? []).map((d) => [d.id, `${d.first_name} ${d.last_name}`]));
  const vn = new Map((vehicles.data ?? []).map((v) => [v.id, v.plate_number]));
  const rows = [...(q.data ?? [])].sort((a, b) => a.planned_departure_time.localeCompare(b.planned_departure_time));
  const tone = (s: string) => (s === 'completed' ? 'ok' : s === 'cancelled' ? 'bad' : s === 'scheduled' ? '' : 'warn');
  return (<>
    <div className="top"><h1>سفرها</h1>
      <div className="row">
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setMsg(null); }} style={{ width: 160 }} />
        {uni.isSuper && <select value={uid} onChange={(e) => setUid(e.target.value)} style={{ width: 200 }}><option value="">دانشگاه…</option>{uni.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}
        <button className="btn" disabled={gen.isPending || (uni.isSuper && !uid)} onClick={() => { if (confirm('سفرهای این روز از روی برنامه‌ی هفتگی سرویس‌های فعال ساخته شود؟')) gen.mutate(); }}>تولید سفرهای این روز</button>
      </div></div>
    {msg && <div className="okb">{msg}</div>}
    <Err e={q.error ?? gen.error ?? cancel.error} />
    <Table rows={rows} empty="برای این روز سفری نیست. «تولید سفرهای این روز» را بزنید." cols={[
      { head: 'سرویس', cell: (r) => sv.get(r.service_id) ?? r.service_id }, { head: 'برنامه', cell: (r) => hm(r.planned_departure_time) },
      { head: 'راننده', cell: (r) => (r.driver_id ? dn.get(r.driver_id) ?? r.driver_id : <span className="tag warn">تعیین نشده</span>) },
      { head: 'خودرو', cell: (r) => (r.vehicle_id ? <span dir="ltr">{vn.get(r.vehicle_id) ?? r.vehicle_id}</span> : <span className="tag warn">تعیین نشده</span>) },
      { head: 'حرکت واقعی', cell: (r) => hm(r.actual_departure_time) }, { head: 'پایان', cell: (r) => hm(r.actual_arrival_time) },
      { head: 'وضعیت', cell: (r) => <span className={`tag ${tone(r.status)}`}>{TRIP_STATUS_FA[r.status] ?? r.status}</span> },
      { head: '', cell: (r) => r.status === 'scheduled' ? <div className="row"><button className="btn ghost" onClick={() => setAssign(r)}>تعیین راننده و خودرو</button>
        <button className="btn ghost" onClick={() => { if (confirm('این سفر لغو شود؟')) cancel.mutate(r); }}>لغو</button></div> : null }]} />
    {assign && <AssignModal trip={assign} service={services.data?.find((s) => s.id === assign.service_id)} drivers={drivers.data ?? []} vehicles={vehicles.data ?? []} onClose={() => setAssign(null)} onDone={refresh} />}
  </>);
}

interface Link { driver_id?: number; vehicle_id?: number; is_active: boolean; }

/** فقط راننده‌ها و خودروهایی که طبق قرارداد سرویس مجازند نمایش داده می‌شوند */
function AssignModal({ trip, service, drivers, vehicles, onClose, onDone }: { trip: Trip; service?: ServiceT; drivers: Driver[]; vehicles: Vehicle[]; onClose: () => void; onDone: () => void }) {
  const cid = service?.contract_id ?? null;
  const dl = useQuery({ queryKey: ['/contract-drivers/', cid], queryFn: () => get<Link[]>('/contract-drivers/', { contract_id: cid! }), enabled: cid != null });
  const vl = useQuery({ queryKey: ['/contract-vehicles/', cid], queryFn: () => get<Link[]>('/contract-vehicles/', { contract_id: cid! }), enabled: cid != null });
  if (cid == null) return <Modal title="تعیین راننده و خودرو" onClose={onClose}><div className="err">این سرویس قرارداد ندارد. ابتدا در صفحه‌ی «سرویس‌ها» قرارداد را به آن وصل کنید.</div></Modal>;
  if (dl.isLoading || vl.isLoading) return <Modal title="تعیین راننده و خودرو" onClose={onClose}><p className="mute">در حال بارگذاری…</p></Modal>;
  const okD = new Set((dl.data ?? []).filter((l) => l.is_active).map((l) => l.driver_id));
  const okV = new Set((vl.data ?? []).filter((l) => l.is_active).map((l) => l.vehicle_id));
  const dOpts = drivers.filter((d) => d.is_active && okD.has(d.id)).map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` }));
  const vOpts = vehicles.filter((v) => v.is_active && okV.has(v.id)).map((v) => ({ value: v.id, label: `${v.plate_number} (${v.capacity} نفر)` }));
  return <FormModal title="تعیین راننده و خودرو" onClose={onClose} submitLabel="ثبت" initial={{ driver_id: trip.driver_id, vehicle_id: trip.vehicle_id }}
    fields={[
      { name: 'driver_id', label: 'راننده', type: 'select', options: dOpts, hint: dOpts.length ? undefined : 'راننده‌ای به قرارداد این سرویس وصل نیست (صفحه‌ی قراردادها ← خودرو و راننده)' },
      { name: 'vehicle_id', label: 'خودرو', type: 'select', options: vOpts, hint: vOpts.length ? undefined : 'خودرویی به قرارداد این سرویس وصل نیست' },
    ]}
    onSubmit={async (v) => { await api('PATCH', `/trips/${trip.id}/assignment`, { json: { driver_id: v.driver_id, vehicle_id: v.vehicle_id } }); onDone(); }} />;
}
