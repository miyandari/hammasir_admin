import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../lib/api';
import { useDrivers } from '../lib/hooks';
import { incidentLabel, type Incident, type ServiceT, type Trip, type Vehicle } from '../lib/types';
import { Acts, Err, Table } from '../components/ui';
import FormModal from '../components/FormModal';

const dt = (s: string | null) => (s ? new Date(s.endsWith('Z') || /[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z').toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export default function Incidents() {
  const qc = useQueryClient();
  const [show, setShow] = useState<'open' | 'all'>('open');
  const q = useQuery({ queryKey: ['incidents', show], queryFn: () => get<Incident[]>('/trip-incidents/', show === 'open' ? { is_resolved: false } : {}), refetchInterval: 20000 });
  const trips = useQuery({ queryKey: ['/trips/', 'all'], queryFn: () => get<Trip[]>('/trips/') });
  const services = useQuery({ queryKey: ['/services/'], queryFn: () => get<ServiceT[]>('/services/') });
  const vehicles = useQuery({ queryKey: ['/vehicles/'], queryFn: () => get<Vehicle[]>('/vehicles/') });
  const drivers = useDrivers();
  const [rep, setRep] = useState<Incident | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['incidents'] });
  const resolve = useMutation({ mutationFn: (i: Incident) => api('PATCH', `/trip-incidents/${i.id}/resolve`), onSuccess: refresh });
  const tripOf = new Map((trips.data ?? []).map((t) => [t.id, t]));
  const sName = new Map((services.data ?? []).map((s) => [s.id, s.name]));
  const plate = new Map((vehicles.data ?? []).map((v) => [v.id, v.plate_number]));
  const dName = new Map((drivers.data ?? []).map((d) => [d.id, `${d.first_name} ${d.last_name}`]));
  const rows = [...(q.data ?? [])].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  return (<>
    <div className="top"><h1>خرابی‌ها و حوادث</h1>
      <div className="row"><button className={`btn ${show === 'open' ? '' : 'ghost'}`} onClick={() => setShow('open')}>باز</button><button className={`btn ${show === 'all' ? '' : 'ghost'}`} onClick={() => setShow('all')}>همه</button></div></div>
    <Err e={q.error ?? resolve.error} />
    <Table rows={rows} empty={show === 'open' ? 'خرابی بازی وجود ندارد.' : 'موردی ثبت نشده.'} cols={[
      { head: 'زمان', cell: (r) => dt(r.occurred_at) }, { head: 'نوع', cell: (r) => incidentLabel(r.incident_type) },
      { head: 'سرویس', cell: (r) => { const t = tripOf.get(r.trip_id); return t ? sName.get(t.service_id) ?? t.service_id : `سفر ${r.trip_id}`; } },
      { head: 'خودرو / راننده', cell: (r) => { const t = tripOf.get(r.trip_id); return t ? <>{t.vehicle_id ? <span dir="ltr">{plate.get(t.vehicle_id)}</span> : '—'} · {t.driver_id ? dName.get(t.driver_id) : '—'}</> : '—'; } },
      { head: 'توضیح راننده', cell: (r) => r.description ?? '—' },
      { head: 'وضعیت', cell: (r) => (r.is_resolved ? <span className="tag ok">رفع شد {dt(r.resolved_at)}</span> : <span className="tag bad">باز</span>) },
      { head: '', cell: (r) => r.is_resolved ? null : <Acts><button className="btn ghost" onClick={() => setRep(r)}>جایگزین</button>
        <button className="btn ghost" onClick={() => { if (confirm('این مورد رفع‌شده ثبت شود؟')) resolve.mutate(r); }}>رفع شد</button></Acts> }]} />
    {rep && (() => { const t = tripOf.get(rep.trip_id); const uid = t?.university_id;
      return <FormModal title="تعیین راننده یا خودروی جایگزین" onClose={() => setRep(null)} submitLabel="ثبت جایگزین" initial={{}}
        fields={[
          { name: 'vehicle_id', label: 'خودروی جایگزین', type: 'select', options: (vehicles.data ?? []).filter((v) => v.is_active && v.university_id === uid && v.id !== t?.vehicle_id).map((v) => ({ value: v.id, label: `${v.plate_number} (${v.capacity} نفر)` })) },
          { name: 'driver_id', label: 'راننده‌ی جایگزین (اختیاری)', type: 'select', options: (drivers.data ?? []).filter((d) => d.is_active && d.university_id === uid && d.id !== t?.driver_id).map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` })) },
          { name: 'reason', label: 'دلیل', hint: 'جایگزین باید طبق قرارداد سرویس مجاز باشد؛ در غیر این صورت سامانه پیام خطا می‌دهد' },
        ]}
        onSubmit={async (v) => { await api('POST', `/trip-incidents/${rep.id}/replacement`, { json: { vehicle_id: v.vehicle_id, driver_id: v.driver_id, reason: v.reason } }); refresh(); void qc.invalidateQueries({ queryKey: ['trips'] }); }} />; })()}
  </>);
}
