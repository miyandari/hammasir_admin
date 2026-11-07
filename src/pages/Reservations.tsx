import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hmTehran } from '../lib/time';
import { api, get } from '../lib/api';
import { TRIP_STATUS_FA, type ServiceT, type Station, type Student, type Trip } from '../lib/types';
import { Acts, Err, Table } from '../components/ui';
import JalaliDate, { todayIso } from '../components/JalaliDate';

interface Reservation { id: number; trip_id: number; student_id: number; station_id: number | null; reservation_time: string; status: string; is_standing: boolean; }
interface Boarding { id: number; trip_id: number; student_id: number; boarding_station_id: number | null; is_standing: boolean; status: string; requested_at: string; rejection_reason: string | null; }
const dt = (s: string) => new Date(s.endsWith('Z') || /[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z').toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
const hm = hmTehran;
const RES_FA: Record<string, string> = { active: 'فعال', waitlisted: 'لیست انتظار', cancelled: 'لغو شده' };

export default function Reservations() {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayIso()); const [tid, setTid] = useState('');
  const [all, setAll] = useState(false);
  const trips = useQuery({ queryKey: ['trips', date], queryFn: () => get<Trip[]>('/trips/', { trip_date: date }) });
  const services = useQuery({ queryKey: ['/services/'], queryFn: () => get<ServiceT[]>('/services/') });
  const students = useQuery({ queryKey: ['students', ''], queryFn: () => get<Student[]>('/students/'), retry: false });
  const stations = useQuery({ queryKey: ['/stations/'], queryFn: () => get<Station[]>('/stations/') });
  const sv = new Map((services.data ?? []).map((s) => [s.id, s.name]));
  const sn = new Map((students.data ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`]));
  const st = new Map((stations.data ?? []).map((s) => [s.id, s.name]));
  const tl = [...(trips.data ?? [])].sort((a, b) => a.planned_departure_time.localeCompare(b.planned_departure_time));
  useEffect(() => { if (tid && !tl.some((t) => String(t.id) === tid)) setTid(''); }, [trips.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const res = useQuery({ queryKey: ['reservations', tid, all], queryFn: () => get<Reservation[]>('/reservations/', { trip_id: tid, only_active: !all }), enabled: !!tid });
  const req = useQuery({ queryKey: ['boarding', tid], queryFn: () => get<Boarding[]>(`/boarding-requests/trip/${tid}`), enabled: !!tid, refetchInterval: 15000 });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['boarding'] });
  const approve = useMutation({ mutationFn: (r: Boarding) => api('POST', `/boarding-requests/${r.id}/approve`), onSuccess: refresh });
  const reject = useMutation({ mutationFn: ({ r, reason }: { r: Boarding; reason: string }) => api('POST', `/boarding-requests/${r.id}/reject`, { json: { approved: false, rejection_reason: reason || null } }), onSuccess: refresh });
  const cancelRes = useMutation({ mutationFn: (r: Reservation) => api('PATCH', `/reservations/${r.id}/cancel`), onSuccess: () => void qc.invalidateQueries({ queryKey: ['reservations'] }) });
  const who = (id: number) => sn.get(id) ?? `#${id}`;
  const active = (res.data ?? []).filter((r) => r.status === 'active').length;
  return (<>
    <div className="top"><h1>رزروها و درخواست سوار شدن</h1>
      <div className="row">
        <div style={{ width: 290 }}><JalaliDate value={date} onChange={(x) => x && setDate(x)} /></div>
        <select value={tid} onChange={(e) => setTid(e.target.value)} style={{ minWidth: 240 }}><option value="">سفر را انتخاب کنید…</option>
          {tl.map((t) => <option key={t.id} value={t.id}>{hm(t.planned_departure_time)} · {sv.get(t.service_id) ?? t.service_id} ({TRIP_STATUS_FA[t.status] ?? t.status})</option>)}</select>
      </div></div>
    <Err e={trips.error ?? res.error ?? req.error ?? approve.error ?? reject.error ?? cancelRes.error} />
    {!tid ? <p className="mute">{tl.length ? 'یک سفر را انتخاب کنید تا رزروها و درخواست‌های آن دیده شود.' : 'برای این روز سفری وجود ندارد.'}</p> : (<>
      <h3>درخواست‌های سوار شدن در انتظار تأیید</h3>
      <Table rows={req.data ?? []} empty="درخواست در انتظاری نیست." cols={[
        { head: 'دانشجو', cell: (r) => who(r.student_id) }, { head: 'ایستگاه', cell: (r) => (r.boarding_station_id ? st.get(r.boarding_station_id) ?? r.boarding_station_id : '—') },
        { head: 'ایستاده', cell: (r) => (r.is_standing ? 'بله' : 'خیر') }, { head: 'زمان درخواست', cell: (r) => dt(r.requested_at) },
        { head: '', cell: (r) => <Acts><button className="btn ghost" onClick={() => approve.mutate(r)}>تأیید</button>
          <button className="btn ghost" onClick={() => { const reason = prompt('دلیل رد (اختیاری):'); if (reason !== null) reject.mutate({ r, reason }); }}>رد</button></Acts> }]} />
      <div className="top" style={{ marginTop: 24, marginBottom: 8 }}><h3 style={{ margin: 0 }}>رزروها ({active.toLocaleString('fa-IR')} فعال)</h3>
        <label className="row" style={{ margin: 0, color: 'var(--ink)' }}><input type="checkbox" style={{ width: 'auto' }} checked={all} onChange={(e) => setAll(e.target.checked)} />نمایش لغوشده‌ها و لیست انتظار</label></div>
      <Table rows={res.data ?? []} empty="رزروی برای این سفر نیست." cols={[
        { head: 'دانشجو', cell: (r) => who(r.student_id) }, { head: 'ایستگاه', cell: (r) => (r.station_id ? st.get(r.station_id) ?? r.station_id : '—') },
        { head: 'ایستاده', cell: (r) => (r.is_standing ? 'بله' : 'خیر') }, { head: 'زمان رزرو', cell: (r) => dt(r.reservation_time) },
        { head: 'وضعیت', cell: (r) => <span className={`tag ${r.status === 'active' ? 'ok' : r.status === 'cancelled' ? 'bad' : 'warn'}`}>{RES_FA[r.status] ?? r.status}</span> },
        { head: '', cell: (r) => r.status === 'cancelled' ? null : <Acts><button className="btn ghost" onClick={() => { if (confirm('این رزرو لغو شود؟')) cancelRes.mutate(r); }}>لغو رزرو</button></Acts> }]} />
    </>)}
  </>);
}
