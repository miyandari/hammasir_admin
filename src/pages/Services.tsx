import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get, genCode } from '../lib/api';
import { useDrivers, useUniField } from '../lib/hooks';
import { DAYS_FA, GENDER_FA, STYPE_FA, type Contract, type Driver, type Vehicle, type RouteT, type Schedule, type ServiceT } from '../lib/types';
import { Err, Modal, Table, Tag } from '../components/ui';
import FormModal, { type Field } from '../components/FormModal';

const hm = (s: string | null) => (s ? s.slice(0, 5) : '—');

export default function Services() {
  const uni = useUniField(); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['/services/'], queryFn: () => get<ServiceT[]>('/services/') });
  const routes = useQuery({ queryKey: ['/routes/'], queryFn: () => get<RouteT[]>('/routes/') });
  const contracts = useQuery({ queryKey: ['/contracts/'], queryFn: () => get<Contract[]>('/contracts/') });
  const [edit, setEdit] = useState<ServiceT | 'new' | null>(null);
  const [sched, setSched] = useState<ServiceT | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['/services/'] });
  const status = useMutation({ mutationFn: (s: ServiceT) => api('PATCH', `/services/${s.id}/status`, { query: { is_active: !s.is_active } }), onSuccess: refresh });
  const rName = (id: number) => routes.data?.find((r) => r.id === id)?.name ?? id;
  const cName = (id: number | null) => (id == null ? '—' : contracts.data?.find((c) => c.id === id)?.contract_number ?? id);
  const uniOf = edit && edit !== 'new' ? edit.university_id : null;
  const fields: Field[] = [
    ...(uni.isSuper && edit === 'new' ? [{ name: 'university_id', label: 'دانشگاه', type: 'select' as const, options: uni.options, required: true }] : []),
    { name: 'name', label: 'نام سرویس', required: true },
    { name: 'route_id', label: 'مسیر', type: 'select', required: true, options: (routes.data ?? []).filter((r) => r.is_active && (uniOf == null || r.university_id === uniOf)).map((r) => ({ value: r.id, label: r.name })) },
    { name: 'contract_id', label: 'قرارداد (برای محاسبه‌ی هزینه)', type: 'select', hint: 'بدون قرارداد، سفرهای این سرویس در گزارش مالی نمی‌آیند',
      options: (contracts.data ?? []).filter((c) => c.is_active && (uniOf == null || c.university_id === uniOf)).map((c) => ({ value: c.id, label: c.contract_number })) },
    { name: 'service_type', label: 'نوع سرویس', type: 'select', required: true, options: Object.entries(STYPE_FA).map(([value, label]) => ({ value, label })) },
    { name: 'gender_restriction', label: 'جنسیت', type: 'select', required: true, options: Object.entries(GENDER_FA).map(([value, label]) => ({ value, label })) },
    { name: 'is_active', label: 'فعال', type: 'checkbox' },
  ];
  return (<>
    <div className="top"><h1>سرویس‌ها</h1><button className="btn" onClick={() => setEdit('new')}>سرویس جدید</button></div>
    <Err e={q.error ?? status.error} />
    <Table rows={q.data ?? []} cols={[
      { head: 'نام', cell: (r) => r.name }, { head: 'مسیر', cell: (r) => rName(r.route_id) },
      { head: 'قرارداد', cell: (r) => (r.contract_id == null ? <span className="tag warn">ندارد</span> : <span dir="ltr">{cName(r.contract_id)}</span>) },
      { head: 'نوع', cell: (r) => STYPE_FA[r.service_type] ?? r.service_type }, { head: 'جنسیت', cell: (r) => GENDER_FA[r.gender_restriction] ?? r.gender_restriction },
      { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> },
      { head: '', cell: (r) => <div className="row"><button className="btn ghost" onClick={() => setSched(r)}>برنامه‌ی هفتگی</button><button className="btn ghost" onClick={() => setEdit(r)}>ویرایش</button>
        <button className="btn ghost" onClick={() => { if (confirm(r.is_active ? 'سرویس غیرفعال شود؟' : 'سرویس فعال شود؟')) status.mutate(r); }}>{r.is_active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button></div> }]} />
    {edit && <FormModal title={edit === 'new' ? 'سرویس جدید' : 'ویرایش سرویس'} fields={fields} onClose={() => setEdit(null)}
      initial={edit === 'new' ? { is_active: true, university_id: uni.myUni, service_type: 'regular', gender_restriction: 'mixed' } : { ...edit }}
      onSubmit={async (v) => {
        const body = { ...v, university_id: edit === 'new' ? (v.university_id ?? uni.myUni) : edit.university_id, code: edit === 'new' ? genCode('SV') : edit.code };
        await api(edit === 'new' ? 'POST' : 'PATCH', edit === 'new' ? '/services/' : `/services/${edit.id}`, { json: body }); refresh();
      }} />}
    {sched && <ScheduleModal service={sched} onClose={() => setSched(null)} />}
  </>);
}

interface CLink { driver_id?: number; vehicle_id?: number; is_active: boolean; }
interface ApplyRes { updated: number; unchanged: number; skipped_substitute: number; invalid: number; total: number; }

function ScheduleModal({ service, onClose }: { service: ServiceT; onClose: () => void }) {
  const qc = useQueryClient(); const key = ['schedules', service.id];
  const list = useQuery({ queryKey: key, queryFn: () => get<Schedule[]>('/schedules/', { service_id: service.id }) });
  const cid = service.contract_id;
  const dl = useQuery({ queryKey: ['/contract-drivers/', cid], queryFn: () => get<CLink[]>('/contract-drivers/', { contract_id: cid! }), enabled: cid != null });
  const vl = useQuery({ queryKey: ['/contract-vehicles/', cid], queryFn: () => get<CLink[]>('/contract-vehicles/', { contract_id: cid! }), enabled: cid != null });
  const drivers = useDrivers();
  const vehicles = useQuery({ queryKey: ['/vehicles/'], queryFn: () => get<Vehicle[]>('/vehicles/') });
  const okD = new Set((dl.data ?? []).filter((l) => l.is_active).map((l) => l.driver_id));
  const okV = new Set((vl.data ?? []).filter((l) => l.is_active).map((l) => l.vehicle_id));
  const dOpts = (drivers.data ?? []).filter((d: Driver) => d.is_active && okD.has(d.id));
  const vOpts = (vehicles.data ?? []).filter((v) => v.is_active && okV.has(v.id));
  const dName = (id: number | null) => { const d = drivers.data?.find((x) => x.id === id); return d ? `${d.first_name} ${d.last_name}` : '—'; };
  const vName = (id: number | null) => vehicles.data?.find((x) => x.id === id)?.plate_number ?? '—';
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [dep, setDep] = useState(''); const [arr, setArr] = useState('');
  const [defD, setDefD] = useState(''); const [defV, setDefV] = useState('');
  const [applyFuture, setApplyFuture] = useState(true);
  const [msg, setMsg] = useState('');
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  const num = (x: string) => (x ? Number(x) : null);
  const add = useMutation({
    mutationFn: async () => { for (const d of days) await api('POST', '/schedules/', { json: { university_id: service.university_id, service_id: service.id, day_of_week: d, departure_time: dep, arrival_time: arr || null, schedule_type: 'regular', is_active: true, default_driver_id: num(defD), default_vehicle_id: num(defV) } }); },
    onSuccess: () => { refresh(); setDep(''); setArr(''); }, onError: refresh,
  });
  const toggle = useMutation({ mutationFn: (s: Schedule) => api('PATCH', `/schedules/${s.id}/status`, { query: { is_active: !s.is_active } }), onSuccess: refresh });
  /** تغییر پیش‌فرض همه‌ی برنامه‌های فعال این سرویس؛ در صورت انتخاب، روی سفرهای آینده هم اعمال می‌شود */
  const setDefaults = useMutation({
    mutationFn: async () => {
      let out = { updated: 0, invalid: 0, skipped_substitute: 0 };
      for (const s of list.data ?? []) {
        await api('PATCH', `/schedules/${s.id}`, { json: { university_id: s.university_id, service_id: s.service_id, day_of_week: s.day_of_week, departure_time: s.departure_time, arrival_time: s.arrival_time, schedule_type: s.schedule_type, is_active: s.is_active, default_driver_id: num(defD), default_vehicle_id: num(defV) } });
        if (applyFuture && (defD || defV)) {
          const r = await api<ApplyRes>('POST', `/schedules/${s.id}/apply-defaults`);
          out = { updated: out.updated + r.updated, invalid: out.invalid + r.invalid, skipped_substitute: out.skipped_substitute + r.skipped_substitute };
        }
      }
      return out;
    },
    onSuccess: (o) => { refresh(); setMsg(applyFuture ? `ثبت شد. ${o.updated} سفر آینده به‌روز شد` + (o.skipped_substitute ? `؛ ${o.skipped_substitute} سفر با جایگزین موردی دست‌نخورده ماند` : '') + (o.invalid ? `؛ ${o.invalid} سفر نامعتبر بود` : '') + '.' : 'پیش‌فرض ثبت شد؛ از شب بعد در تولید سفرها اعمال می‌شود.'); },
    onError: refresh,
  });
  const rows = [...(list.data ?? [])].sort((a, b) => a.day_of_week - b.day_of_week || a.departure_time.localeCompare(b.departure_time));
  return (
    <Modal title={`برنامه‌ی هفتگی — ${service.name}`} onClose={onClose} wide>
      <Err e={list.error ?? add.error ?? toggle.error ?? setDefaults.error} />
      <Table rows={rows} empty="هنوز زمان‌بندی ندارد." cols={[
        { head: 'روز', cell: (s) => DAYS_FA[s.day_of_week] }, { head: 'حرکت', cell: (s) => hm(s.departure_time) }, { head: 'رسیدن', cell: (s) => hm(s.arrival_time) },
        { head: 'راننده‌ی پیش‌فرض', cell: (s) => dName(s.default_driver_id) }, { head: 'خودرو', cell: (s) => <span dir="ltr">{vName(s.default_vehicle_id)}</span> },
        { head: 'وضعیت', cell: (s) => <Tag on={s.is_active} /> }, { head: '', cell: (s) => <button className="btn ghost" onClick={() => toggle.mutate(s)}>{s.is_active ? 'غیرفعال' : 'فعال'}</button> }]} />
      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14 }}>راننده و خودروی پیش‌فرض</h3>
        {cid == null ? <div className="err">برای انتخاب راننده و خودرو، ابتدا قرارداد را به سرویس وصل کنید.</div> : (<>
          <div className="row">
            <label style={{ flex: 1 }}>راننده<select value={defD} onChange={(e) => setDefD(e.target.value)}><option value="">— بدون پیش‌فرض —</option>{dOpts.map((d) => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}</select></label>
            <label style={{ flex: 1 }}>خودرو<select value={defV} onChange={(e) => setDefV(e.target.value)}><option value="">— بدون پیش‌فرض —</option>{vOpts.map((v) => <option key={v.id} value={v.id}>{v.plate_number} ({v.capacity} نفر)</option>)}</select></label>
          </div>
          <label className="row" style={{ color: 'var(--ink)' }}><input type="checkbox" style={{ width: 'auto' }} checked={applyFuture} onChange={(e) => setApplyFuture(e.target.checked)} />اعمال روی سفرهای آینده‌ی شروع‌نشده</label>
          <button className="btn ghost" disabled={!rows.length || setDefaults.isPending} onClick={() => { setMsg(''); setDefaults.mutate(); }}>ثبت برای همه‌ی برنامه‌های فعلی</button>
          {msg && <p className="mute" style={{ fontSize: 12 }}>{msg}</p>}
        </>)}
        <hr style={{ margin: '14px 0', border: 0, borderTop: '1px solid var(--line)' }} />
        <div className="row" style={{ marginBottom: 8 }}>{DAYS_FA.map((n, i) => (
          <label key={i} className="row" style={{ margin: 0, color: 'var(--ink)' }}><input type="checkbox" style={{ width: 'auto' }} checked={days.includes(i)} onChange={(e) => setDays(e.target.checked ? [...days, i] : days.filter((x) => x !== i))} />{n}</label>))}</div>
        <div className="row">
          <label style={{ flex: 1 }}>ساعت حرکت<input type="time" value={dep} onChange={(e) => setDep(e.target.value)} dir="ltr" /></label>
          <label style={{ flex: 1 }}>ساعت رسیدن (اختیاری)<input type="time" value={arr} onChange={(e) => setArr(e.target.value)} dir="ltr" /></label>
        </div>
        <button className="btn" disabled={!dep || !days.length || add.isPending} onClick={() => add.mutate()}>افزودن برای {days.length} روز</button>
        <p className="mute" style={{ fontSize: 12 }}>روزها شنبه تا جمعه‌اند. سفر روزانه هر شب از روی همین برنامه ساخته می‌شود و راننده/خودروی پیش‌فرض به آن تخصیص می‌یابد. راننده‌ی جایگزین برای یک روز خاص از صفحه‌ی «سفرها» تعیین می‌شود.</p>
      </div>
    </Modal>
  );
}
