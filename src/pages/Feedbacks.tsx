import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../lib/api';
import { type ServiceT, type Student, type Trip } from '../lib/types';
import { Acts, Err, Table } from '../components/ui';
import { showJalali } from '../components/JalaliDate';

interface Feedback { id: number; trip_id: number; student_id: number; rating: number | null; feedback_type: string; title: string | null; message: string | null; created_at: string; is_resolved: boolean; }
const dt = (s: string) => new Date(s.endsWith('Z') || /[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z').toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
const TYPE_FA: Record<string, string> = { complaint: 'شکایت', suggestion: 'پیشنهاد', praise: 'تشکر', delay: 'تأخیر', driver: 'رفتار راننده', vehicle: 'وضعیت خودرو', trip_rating: 'امتیاز سفر', other: 'سایر' };

export default function Feedbacks() {
  const qc = useQueryClient();
  const [show, setShow] = useState<'open' | 'all'>('open');
  const [type, setType] = useState('');
  const q = useQuery({ queryKey: ['feedbacks', show], queryFn: () => get<Feedback[]>('/feedbacks/', show === 'open' ? { is_resolved: false } : {}) });
  const students = useQuery({ queryKey: ['students', ''], queryFn: () => get<Student[]>('/students/') , retry: false });
  const trips = useQuery({ queryKey: ['/trips/', 'all'], queryFn: () => get<Trip[]>('/trips/') });
  const services = useQuery({ queryKey: ['/services/'], queryFn: () => get<ServiceT[]>('/services/') });
  const resolve = useMutation({ mutationFn: (f: Feedback) => api('PATCH', `/feedbacks/${f.id}/resolve`), onSuccess: () => void qc.invalidateQueries({ queryKey: ['feedbacks'] }) });
  const sn = new Map((students.data ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`]));
  const tripOf = new Map((trips.data ?? []).map((t) => [t.id, t]));
  const sv = new Map((services.data ?? []).map((s) => [s.id, s.name]));
  const all = q.data ?? [];
  const types = [...new Set(all.map((f) => f.feedback_type))];
  const rows = all.filter((f) => !type || f.feedback_type === type).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const avg = rows.filter((f) => f.rating != null);
  return (<>
    <div className="top"><h1>بازخورد دانشجویان</h1>
      <div className="row">
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 160 }}><option value="">همه‌ی نوع‌ها</option>{types.map((t) => <option key={t} value={t}>{TYPE_FA[t] ?? t}</option>)}</select>
        <button className={`btn ${show === 'open' ? '' : 'ghost'}`} onClick={() => setShow('open')}>رسیدگی‌نشده</button>
        <button className={`btn ${show === 'all' ? '' : 'ghost'}`} onClick={() => setShow('all')}>همه</button>
      </div></div>
    <Err e={q.error ?? resolve.error} />
    <div className="grid" style={{ marginBottom: 16 }}>
      <div className="card stat"><b>{rows.length.toLocaleString('fa-IR')}</b><span>تعداد بازخورد</span></div>
      <div className="card stat"><b>{avg.length ? (avg.reduce((a, f) => a + (f.rating ?? 0), 0) / avg.length).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) : '—'}</b><span>میانگین امتیاز (از ۵)</span></div>
    </div>
    <Table rows={rows} empty={show === 'open' ? 'بازخورد رسیدگی‌نشده‌ای نیست.' : 'بازخوردی ثبت نشده.'} cols={[
      { head: 'زمان', cell: (r) => dt(r.created_at) },
      { head: 'دانشجو', cell: (r) => sn.get(r.student_id) ?? `#${r.student_id}` },
      { head: 'سفر', cell: (r) => { const t = tripOf.get(r.trip_id); return t ? `${sv.get(t.service_id) ?? t.service_id} · ${showJalali(t.trip_date)}` : `سفر ${r.trip_id}`; } },
      { head: 'امتیاز', cell: (r) => (r.rating == null ? '—' : <span title={`${r.rating} از ۵`}>{'★'.repeat(r.rating)}{'☆'.repeat(Math.max(0, 5 - r.rating))}</span>) },
      { head: 'نوع', cell: (r) => TYPE_FA[r.feedback_type] ?? r.feedback_type },
      { head: 'متن', cell: (r) => <div style={{ minWidth: 180 }}>{r.title && <b>{r.title}</b>}{r.title && r.message ? ' — ' : ''}{r.message ?? (r.title ? '' : '—')}</div> },
      { head: 'وضعیت', cell: (r) => (r.is_resolved ? <span className="tag ok">رسیدگی شد</span> : <span className="tag warn">جدید</span>) },
      { head: '', cell: (r) => r.is_resolved ? null : <Acts><button className="btn ghost" onClick={() => { if (confirm('این بازخورد رسیدگی‌شده ثبت شود؟')) resolve.mutate(r); }}>رسیدگی شد</button></Acts> }]} />
  </>);
}
