import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import readXlsxFile from 'read-excel-file';
import writeXlsxFile from 'write-excel-file';
import { get, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Student, University } from '../lib/types';
import { Err, Modal, Table, Tag } from '../components/ui';

interface Row { student_number: string; first_name: string; last_name: string; gender: string; national_id: string; phone: string; }
interface Res { row: number; student_number: string; ok: boolean; errors: string[]; }
interface Preview { total: number; valid: number; invalid: number; results: Res[]; }

const HEAD = ['شماره دانشجویی', 'نام', 'نام خانوادگی', 'جنسیت (مرد/زن)', 'کد ملی', 'تلفن'];
const cell = (v: unknown) => (v == null ? '' : String(v).trim());

async function downloadTemplate() {
  const header = HEAD.map((value) => ({ value, fontWeight: 'bold' as const }));
  const sample = ['4021001', 'علی', 'رضایی', 'مرد', '', '09120000000'].map((value) => ({ value, type: String }));
  await writeXlsxFile([header, sample], { fileName: 'قالب-دانشجویان.xlsx', rightToLeft: true } as never);
}

export default function Students() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const isSuper = me?.role === 'super_admin';
  const unis = useQuery({ queryKey: ['universities'], queryFn: () => get<University[]>('/universities/'), enabled: isSuper });
  const [uniId, setUniId] = useState<number | ''>('');
  const uid = isSuper ? uniId : (me?.university_id ?? '');
  const list = useQuery({ queryKey: ['students', uid], queryFn: () => get<Student[]>('/students/', { university_id: uid === '' ? undefined : uid }) });
  const [filter, setFilter] = useState('');
  const rows = (list.data ?? []).filter((s) => !filter || `${s.student_number} ${s.first_name} ${s.last_name}`.includes(filter.trim()));
  const [imp, setImp] = useState(false);
  return (<>
    <div className="top"><h1>دانشجویان</h1>
      <div className="row">
        {isSuper && <select value={uniId} onChange={(e) => setUniId(e.target.value ? Number(e.target.value) : '')} style={{ width: 220 }}>
          <option value="">همه‌ی دانشگاه‌ها</option>{unis.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
        <input placeholder="جستجو: شماره یا نام" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 200 }} />
        <button className="btn" onClick={() => setImp(true)} disabled={isSuper && uid === ''} title={isSuper && uid === '' ? 'ابتدا دانشگاه را انتخاب کنید' : ''}>بارگذاری گروهی</button>
      </div></div>
    <Err e={list.error} />
    <Table rows={rows.slice(0, 500)} cols={[
      { head: 'شماره دانشجویی', cell: (r) => <span dir="ltr">{r.student_number}</span> }, { head: 'نام', cell: (r) => `${r.first_name} ${r.last_name}` },
      { head: 'جنسیت', cell: (r) => (r.gender === 'male' ? 'مرد' : 'زن') }, { head: 'تلفن', cell: (r) => <span dir="ltr">{r.phone ?? '—'}</span> },
      { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> }]} />
    {rows.length > 500 && <p className="mute">۵۰۰ مورد اول از {rows.length} نمایش داده شد؛ برای دیدن بقیه جستجو کنید.</p>}
    {imp && uid !== '' && <ImportModal universityId={Number(uid)} onClose={() => setImp(false)} onDone={() => qc.invalidateQueries({ queryKey: ['students'] })} />}
  </>);
}

function ImportModal({ universityId, onClose, onDone }: { universityId: number; onClose: () => void; onDone: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [pw, setPw] = useState('');
  const [prev, setPrev] = useState<Preview | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<number | null>(null);

  async function pick(f: File) {
    setErr(null); setPrev(null); setCreated(null);
    try {
      const sheet = await readXlsxFile(f);
      const body = sheet.slice(1).filter((r) => r.some((c) => cell(c)));
      if (!body.length) throw new Error('فایل خالی است یا فقط سطر عنوان دارد');
      setRows(body.map((r) => ({ student_number: cell(r[0]), first_name: cell(r[1]), last_name: cell(r[2]), gender: cell(r[3]), national_id: cell(r[4]), phone: cell(r[5]) })));
    } catch (e) { setRows([]); setErr(e instanceof Error ? e : new Error('خواندن فایل ممکن نشد؛ فقط فایل Excel (xlsx) پشتیبانی می‌شود')); }
  }
  async function run(dry: boolean) {
    setBusy(true); setErr(null);
    try {
      const r = await post<Preview & { created?: number }>('/student-import', { university_id: universityId, rows, initial_password: pw, dry_run: dry });
      if (dry) setPrev(r); else { setCreated(r.created ?? 0); onDone(); }
    } catch (e) { setErr(e); } finally { setBusy(false); }
  }
  const bad = prev?.results.filter((r) => !r.ok) ?? [];
  return (
    <Modal title="بارگذاری گروهی دانشجویان" onClose={onClose}>
      {created !== null ? <><div className="okb">{created.toLocaleString('fa-IR')} دانشجو ثبت شد. نام کاربری هر دانشجو شماره دانشجویی او و رمز، رمز اولیه‌ای است که وارد کردید.</div><button className="btn" onClick={onClose}>بستن</button></> : <>
        <p className="mute" style={{ marginTop: 0 }}>ستون‌ها: {HEAD.join(' | ')} — ردیف اول عنوان است. <a href="#" onClick={(e) => { e.preventDefault(); void downloadTemplate(); }}>دانلود قالب</a></p>
        <Err e={err} />
        <label>فایل Excel (xlsx)<input ref={file} type="file" accept=".xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); }} /></label>
        <label>رمز اولیه‌ی دانشجویان (حداقل ۸ کاراکتر)<input value={pw} onChange={(e) => { setPw(e.target.value); setPrev(null); }} dir="ltr" minLength={8} /></label>
        {rows.length > 0 && <p>{rows.length.toLocaleString('fa-IR')} ردیف خوانده شد.</p>}
        {prev && <>
          <p><span className="tag ok">{prev.valid} معتبر</span> <span className={`tag ${prev.invalid ? 'bad' : ''}`}>{prev.invalid} خطادار</span></p>
          {bad.length > 0 && <div className="tw" style={{ maxHeight: 220 }}><table><tbody>{bad.slice(0, 50).map((r) => <tr key={r.row}><td>ردیف {r.row}</td><td dir="ltr">{r.student_number}</td><td>{r.errors.join('، ')}</td></tr>)}</tbody></table></div>}
          {prev.invalid > 0 && <p className="mute">تا اصلاح همه‌ی خطاها ثبت انجام نمی‌شود (یا همه یا هیچ‌کدام).</p>}
        </>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn ghost" disabled={busy || !rows.length || pw.length < 8} onClick={() => void run(true)}>{busy && !prev ? '…' : 'بررسی فایل'}</button>
          <button className="btn" disabled={busy || !prev || prev.invalid > 0 || prev.valid === 0} onClick={() => void run(false)}>ثبت نهایی</button>
        </div>
      </>}
    </Modal>
  );
}
