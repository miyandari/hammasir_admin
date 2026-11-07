import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { Err, Modal, Table } from '../components/ui';
import JalaliDate, { isoToJalali, jalaliToIso, todayIso } from '../components/JalaliDate';

interface Log { id: number; user_id: number | null; university_id: number | null; action: string; entity_type: string; entity_id: number | null; description: string | null; old_values: Record<string, unknown> | null; new_values: Record<string, unknown> | null; ip_address: string | null; created_at: string; }
const ACT_FA: Record<string, string> = { CREATE: 'ایجاد', UPDATE: 'ویرایش', DELETE: 'حذف', ACTIVATE: 'فعال‌سازی', DEACTIVATE: 'غیرفعال‌سازی', ASSIGN: 'تخصیص', REPLACE: 'جایگزینی', LOGIN: 'ورود', LOGOUT: 'خروج', APPROVE: 'تأیید', REJECT: 'رد', CANCEL: 'لغو', COMPLETE: 'تکمیل', VIEW: 'مشاهده', backup_export: 'دریافت پشتیبان', backup_restore: 'بازگردانی پشتیبان', no_show_penalty: 'جریمه‌ی غیبت' };
const dt = (s: string) => new Date(s.endsWith('Z') || /[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z').toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'medium' });
const PAGE = 100;
const monthAgo = () => { const j = isoToJalali(todayIso())!; return jalaliToIso(j.jy, j.jm, 1); };

export default function Audit() {
  const [from, setFrom] = useState(monthAgo()); const [to, setTo] = useState(todayIso());
  const [action, setAction] = useState(''); const [entity, setEntity] = useState('');
  const [page, setPage] = useState(0); const [sel, setSel] = useState<Log | null>(null);
  const q = useQuery({
    queryKey: ['audit', from, to, action, entity, page],
    queryFn: () => get<Log[]>('/audit-logs/', { start_date: `${from}T00:00:00`, end_date: `${to}T23:59:59`, action: action || undefined, entity_type: entity || undefined, skip: page * PAGE, limit: PAGE }),
  });
  const rows = q.data ?? [];
  const reset = <T,>(f: (v: T) => void) => (v: T) => { f(v); setPage(0); };
  return (<>
    <div className="top"><h1>گزارش فعالیت‌ها</h1></div>
    <div className="row" style={{ marginBottom: 12 }}>
      <div style={{ width: 280 }}><span className="mute" style={{ fontSize: 12 }}>از</span><JalaliDate value={from} onChange={(x) => x && reset(setFrom)(x)} /></div>
      <div style={{ width: 280 }}><span className="mute" style={{ fontSize: 12 }}>تا</span><JalaliDate value={to} onChange={(x) => x && reset(setTo)(x)} /></div>
      <label style={{ minWidth: 150 }}><span className="mute" style={{ fontSize: 12 }}>عملیات</span><select value={action} onChange={(e) => reset(setAction)(e.target.value)}><option value="">همه</option>{Object.entries(ACT_FA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label style={{ minWidth: 150 }}><span className="mute" style={{ fontSize: 12 }}>موجودیت</span><input value={entity} onChange={(e) => reset(setEntity)(e.target.value)} placeholder="مثلاً Contract" dir="ltr" /></label>
    </div>
    <Err e={q.error} />
    <Table rows={rows} empty="در این بازه فعالیتی ثبت نشده." cols={[
      { head: 'زمان', cell: (r) => dt(r.created_at) }, { head: 'عملیات', cell: (r) => ACT_FA[r.action] ?? r.action },
      { head: 'موجودیت', cell: (r) => <span dir="ltr">{r.entity_type}{r.entity_id != null ? ` #${r.entity_id}` : ''}</span> },
      { head: 'کاربر', cell: (r) => (r.user_id == null ? 'سیستم' : `#${r.user_id}`) }, { head: 'توضیح', cell: (r) => r.description ?? '—' },
      { head: '', cell: (r) => (r.old_values || r.new_values ? <button className="btn ghost" onClick={() => setSel(r)}>جزئیات</button> : null) }]} />
    <div className="row" style={{ marginTop: 12 }}>
      <button className="btn ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>قبلی</button>
      <span className="mute">صفحه‌ی {(page + 1).toLocaleString('fa-IR')}</span>
      <button className="btn ghost" disabled={rows.length < PAGE} onClick={() => setPage(page + 1)}>بعدی</button>
    </div>
    {sel && <Modal title={`${ACT_FA[sel.action] ?? sel.action} — ${sel.entity_type}`} onClose={() => setSel(null)} wide>
      <p className="mute">{sel.description}{sel.ip_address ? ` · IP: ${sel.ip_address}` : ''}</p>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 220 }}><b>قبل</b><pre dir="ltr" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{sel.old_values ? JSON.stringify(sel.old_values, null, 2) : '—'}</pre></div>
        <div style={{ flex: 1, minWidth: 220 }}><b>بعد</b><pre dir="ltr" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{sel.new_values ? JSON.stringify(sel.new_values, null, 2) : '—'}</pre></div>
      </div>
    </Modal>}
  </>);
}
