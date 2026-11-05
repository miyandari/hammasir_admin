import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../lib/api';
import { useUniField } from '../lib/hooks';
import { DAYS_FA, GENDER_FA, STYPE_FA, type Contract, type RouteT, type Schedule, type ServiceT } from '../lib/types';
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
    { name: 'name', label: 'نام سرویس', required: true }, { name: 'code', label: 'کد یکتا (انگلیسی)', required: true, ltr: true },
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
      { head: 'نام', cell: (r) => r.name }, { head: 'کد', cell: (r) => <span dir="ltr">{r.code}</span> }, { head: 'مسیر', cell: (r) => rName(r.route_id) },
      { head: 'قرارداد', cell: (r) => (r.contract_id == null ? <span className="tag warn">ندارد</span> : <span dir="ltr">{cName(r.contract_id)}</span>) },
      { head: 'نوع', cell: (r) => STYPE_FA[r.service_type] ?? r.service_type }, { head: 'جنسیت', cell: (r) => GENDER_FA[r.gender_restriction] ?? r.gender_restriction },
      { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> },
      { head: '', cell: (r) => <div className="row"><button className="btn ghost" onClick={() => setSched(r)}>برنامه‌ی هفتگی</button><button className="btn ghost" onClick={() => setEdit(r)}>ویرایش</button>
        <button className="btn ghost" onClick={() => { if (confirm(r.is_active ? 'سرویس غیرفعال شود؟' : 'سرویس فعال شود؟')) status.mutate(r); }}>{r.is_active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button></div> }]} />
    {edit && <FormModal title={edit === 'new' ? 'سرویس جدید' : 'ویرایش سرویس'} fields={fields} onClose={() => setEdit(null)}
      initial={edit === 'new' ? { is_active: true, university_id: uni.myUni, service_type: 'regular', gender_restriction: 'mixed' } : { ...edit }}
      onSubmit={async (v) => {
        const body = { ...v, university_id: edit === 'new' ? (v.university_id ?? uni.myUni) : edit.university_id };
        await api(edit === 'new' ? 'POST' : 'PATCH', edit === 'new' ? '/services/' : `/services/${edit.id}`, { json: body }); refresh();
      }} />}
    {sched && <ScheduleModal service={sched} onClose={() => setSched(null)} />}
  </>);
}

function ScheduleModal({ service, onClose }: { service: ServiceT; onClose: () => void }) {
  const qc = useQueryClient(); const key = ['schedules', service.id];
  const list = useQuery({ queryKey: key, queryFn: () => get<Schedule[]>('/schedules/', { service_id: service.id }) });
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [dep, setDep] = useState(''); const [arr, setArr] = useState('');
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  const add = useMutation({
    mutationFn: async () => { for (const d of days) await api('POST', '/schedules/', { json: { university_id: service.university_id, service_id: service.id, day_of_week: d, departure_time: dep, arrival_time: arr || null, schedule_type: 'regular', is_active: true } }); },
    onSuccess: () => { refresh(); setDep(''); setArr(''); }, onError: refresh,
  });
  const toggle = useMutation({ mutationFn: (s: Schedule) => api('PATCH', `/schedules/${s.id}/status`, { query: { is_active: !s.is_active } }), onSuccess: refresh });
  const rows = [...(list.data ?? [])].sort((a, b) => a.day_of_week - b.day_of_week || a.departure_time.localeCompare(b.departure_time));
  return (
    <Modal title={`برنامه‌ی هفتگی — ${service.name}`} onClose={onClose}>
      <Err e={list.error ?? add.error ?? toggle.error} />
      <Table rows={rows} empty="هنوز زمان‌بندی ندارد." cols={[
        { head: 'روز', cell: (s) => DAYS_FA[s.day_of_week] }, { head: 'حرکت', cell: (s) => hm(s.departure_time) }, { head: 'رسیدن', cell: (s) => hm(s.arrival_time) },
        { head: 'وضعیت', cell: (s) => <Tag on={s.is_active} /> }, { head: '', cell: (s) => <button className="btn ghost" onClick={() => toggle.mutate(s)}>{s.is_active ? 'غیرفعال' : 'فعال'}</button> }]} />
      <div style={{ marginTop: 16 }}>
        <div className="row" style={{ marginBottom: 8 }}>{DAYS_FA.map((n, i) => (
          <label key={i} className="row" style={{ margin: 0, color: 'var(--ink)' }}><input type="checkbox" style={{ width: 'auto' }} checked={days.includes(i)} onChange={(e) => setDays(e.target.checked ? [...days, i] : days.filter((x) => x !== i))} />{n}</label>))}</div>
        <div className="row">
          <label style={{ flex: 1 }}>ساعت حرکت<input type="time" value={dep} onChange={(e) => setDep(e.target.value)} dir="ltr" /></label>
          <label style={{ flex: 1 }}>ساعت رسیدن (اختیاری)<input type="time" value={arr} onChange={(e) => setArr(e.target.value)} dir="ltr" /></label>
        </div>
        <button className="btn" disabled={!dep || !days.length || add.isPending} onClick={() => add.mutate()}>افزودن برای {days.length} روز</button>
        <p className="mute" style={{ fontSize: 12 }}>روزها شنبه تا جمعه‌اند. سفر روزانه از روی همین برنامه در صفحه‌ی «سفرها» تولید می‌شود.</p>
      </div>
    </Modal>
  );
}
