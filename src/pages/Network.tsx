import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../lib/api';
import { useUniField } from '../lib/hooks';
import { DIR_FA, type RouteStation, type RouteT, type Station } from '../lib/types';
import { Err, Modal, Table, Tag } from '../components/ui';
import FormModal, { latin, type Field } from '../components/FormModal';

export default function Network() {
  const [tab, setTab] = useState<'routes' | 'stations'>('routes');
  return (<>
    <div className="top"><h1>مسیرها و ایستگاه‌ها</h1>
      <div className="row"><button className={`btn ${tab === 'routes' ? '' : 'ghost'}`} onClick={() => setTab('routes')}>مسیرها</button>
        <button className={`btn ${tab === 'stations' ? '' : 'ghost'}`} onClick={() => setTab('stations')}>ایستگاه‌ها</button></div></div>
    {tab === 'routes' ? <Routes /> : <Stations />}
  </>);
}

function Stations() {
  const uni = useUniField(); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['/stations/'], queryFn: () => get<Station[]>('/stations/') });
  const [edit, setEdit] = useState<Station | 'new' | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['/stations/'] });
  const fields: Field[] = [
    ...(uni.isSuper && edit === 'new' ? [{ name: 'university_id', label: 'دانشگاه', type: 'select' as const, options: uni.options, required: true }] : []),
    { name: 'name', label: 'نام ایستگاه', required: true }, { name: 'address', label: 'نشانی' },
    { name: 'latitude', label: 'عرض جغرافیایی (lat)', type: 'number', hint: 'مثلاً ۳۶٫۶۸۰۰ — برای زنجان حدود ۳۶٫۶۷' },
    { name: 'longitude', label: 'طول جغرافیایی (lng)', type: 'number', hint: 'مثلاً ۴۸٫۴۸۰۰ — برای زنجان حدود ۴۸٫۴۸' },
    { name: 'is_active', label: 'فعال', type: 'checkbox' },
  ];
  return (<>
    <div className="top" style={{ marginBottom: 8 }}><span className="mute">{q.data?.length ?? 0} ایستگاه</span><button className="btn" onClick={() => setEdit('new')}>ایستگاه جدید</button></div>
    <Err e={q.error} />
    <Table rows={q.data ?? []} cols={[
      { head: 'نام', cell: (r) => r.name }, { head: 'نشانی', cell: (r) => r.address ?? '—' },
      { head: 'مختصات', cell: (r) => (r.latitude != null && r.longitude != null ? <span dir="ltr">{r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</span> : <span className="tag warn">ندارد</span>) },
      { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> }, { head: '', cell: (r) => <button className="btn ghost" onClick={() => setEdit(r)}>ویرایش</button> }]} />
    <p className="mute">بدون مختصات، ایستگاه روی نقشه و در «ایستگاه نزدیک» اپ دانشجو دیده نمی‌شود.</p>
    {edit && <FormModal title={edit === 'new' ? 'ایستگاه جدید' : 'ویرایش ایستگاه'} fields={fields} onClose={() => setEdit(null)}
      initial={edit === 'new' ? { is_active: true, university_id: uni.myUni } : { ...edit }}
      onSubmit={async (v) => {
        const body = { ...v, university_id: edit === 'new' ? (v.university_id ?? uni.myUni) : edit.university_id };
        await api(edit === 'new' ? 'POST' : 'PATCH', edit === 'new' ? '/stations/' : `/stations/${edit.id}`, { json: body }); refresh();
      }} />}
  </>);
}

function Routes() {
  const uni = useUniField(); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['/routes/'], queryFn: () => get<RouteT[]>('/routes/') });
  const [edit, setEdit] = useState<RouteT | 'new' | null>(null);
  const [stops, setStops] = useState<RouteT | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['/routes/'] });
  const status = useMutation({ mutationFn: (r: RouteT) => api('PATCH', `/routes/${r.id}/status`, { query: { is_active: !r.is_active } }), onSuccess: refresh });
  const fields: Field[] = [
    ...(uni.isSuper && edit === 'new' ? [{ name: 'university_id', label: 'دانشگاه', type: 'select' as const, options: uni.options, required: true }] : []),
    { name: 'name', label: 'نام مسیر', required: true }, { name: 'code', label: 'کد یکتا (انگلیسی)', required: true, ltr: true },
    { name: 'direction', label: 'جهت', type: 'select', options: Object.entries(DIR_FA).map(([value, label]) => ({ value, label })), required: true },
    { name: 'description', label: 'توضیحات' }, { name: 'is_active', label: 'فعال', type: 'checkbox' },
  ];
  return (<>
    <div className="top" style={{ marginBottom: 8 }}><span className="mute">{q.data?.length ?? 0} مسیر</span><button className="btn" onClick={() => setEdit('new')}>مسیر جدید</button></div>
    <Err e={q.error ?? status.error} />
    <Table rows={q.data ?? []} cols={[
      { head: 'نام', cell: (r) => r.name }, { head: 'کد', cell: (r) => <span dir="ltr">{r.code}</span> }, { head: 'جهت', cell: (r) => DIR_FA[r.direction] ?? r.direction },
      { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> },
      { head: '', cell: (r) => <div className="row"><button className="btn ghost" onClick={() => setStops(r)}>ایستگاه‌های مسیر</button><button className="btn ghost" onClick={() => setEdit(r)}>ویرایش</button>
        <button className="btn ghost" onClick={() => { if (confirm(r.is_active ? 'مسیر غیرفعال شود؟' : 'مسیر فعال شود؟')) status.mutate(r); }}>{r.is_active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button></div> }]} />
    {edit && <FormModal title={edit === 'new' ? 'مسیر جدید' : 'ویرایش مسیر'} fields={fields} onClose={() => setEdit(null)}
      initial={edit === 'new' ? { is_active: true, university_id: uni.myUni, direction: 'outbound' } : { ...edit }}
      onSubmit={async (v) => {
        const body = { ...v, university_id: edit === 'new' ? (v.university_id ?? uni.myUni) : edit.university_id };
        await api(edit === 'new' ? 'POST' : 'PATCH', edit === 'new' ? '/routes/' : `/routes/${edit.id}`, { json: body }); refresh();
      }} />}
    {stops && <StopsModal route={stops} onClose={() => setStops(null)} />}
  </>);
}

function StopsModal({ route, onClose }: { route: RouteT; onClose: () => void }) {
  const qc = useQueryClient(); const key = ['route-stations', route.id];
  const list = useQuery({ queryKey: key, queryFn: () => get<RouteStation[]>('/route-stations/', { route_id: route.id }) });
  const stations = useQuery({ queryKey: ['/stations/'], queryFn: () => get<Station[]>('/stations/') });
  const sName = new Map((stations.data ?? []).map((s) => [s.id, s.name]));
  const rows = [...(list.data ?? [])].sort((a, b) => a.stop_order - b.stop_order);
  const used = new Set(rows.map((r) => r.station_id));
  const [sid, setSid] = useState(''); const [order, setOrder] = useState(''); const [min, setMin] = useState(''); const [dur, setDur] = useState('');
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  const num = (s: string) => (s.trim() === '' ? null : Number(latin(s)));
  const add = useMutation({
    mutationFn: () => api('POST', '/route-stations/', { json: { route_id: route.id, station_id: Number(sid), stop_order: num(order) ?? (rows[rows.length - 1]?.stop_order ?? 0) + 1, estimated_minutes_from_start: num(min), stop_duration_seconds: num(dur) } }),
    onSuccess: () => { refresh(); setSid(''); setOrder(''); setMin(''); setDur(''); },
  });
  const del = useMutation({ mutationFn: (id: number) => api('DELETE', `/route-stations/${id}`), onSuccess: refresh });
  return (
    <Modal title={`ایستگاه‌های مسیر — ${route.name}`} onClose={onClose}>
      <Err e={list.error ?? add.error ?? del.error} />
      <Table rows={rows} empty="هنوز ایستگاهی به این مسیر اضافه نشده." cols={[
        { head: 'ترتیب', cell: (r) => r.stop_order }, { head: 'ایستگاه', cell: (r) => sName.get(r.station_id) ?? r.station_id },
        { head: 'دقیقه از مبدأ', cell: (r) => r.estimated_minutes_from_start ?? '—' }, { head: 'توقف (ثانیه)', cell: (r) => r.stop_duration_seconds ?? '—' },
        { head: '', cell: (r) => <button className="btn ghost" onClick={() => { if (confirm('این ایستگاه از مسیر حذف شود؟')) del.mutate(r.id); }}>حذف</button> }]} />
      <div style={{ marginTop: 16 }}>
        <label>ایستگاه<select value={sid} onChange={(e) => setSid(e.target.value)}><option value="">— انتخاب —</option>
          {(stations.data ?? []).filter((s) => s.is_active && s.university_id === route.university_id && !used.has(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <div className="row">
          <label style={{ flex: 1 }}>ترتیب<input value={order} onChange={(e) => setOrder(e.target.value)} placeholder={`${(rows[rows.length - 1]?.stop_order ?? 0) + 1}`} dir="ltr" /></label>
          <label style={{ flex: 1 }}>دقیقه از مبدأ<input value={min} onChange={(e) => setMin(e.target.value)} dir="ltr" /></label>
          <label style={{ flex: 1 }}>توقف (ثانیه)<input value={dur} onChange={(e) => setDur(e.target.value)} dir="ltr" /></label>
        </div>
        <button className="btn" disabled={!sid || add.isPending} onClick={() => add.mutate()}>افزودن به مسیر</button>
        <p className="mute" style={{ fontSize: 12 }}>ایستگاه‌ها را به ترتیب پیمایش مسیر اضافه کنید. زمان تخمینی ایستگاه‌ها برای «ایستگاه نزدیک» و ETA استفاده می‌شود.</p>
      </div>
    </Modal>
  );
}
