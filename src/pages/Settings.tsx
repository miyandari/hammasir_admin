import { useState, type FormEvent } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, download, get, patch, upload } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ABOUT_TEXT, APP_VERSION, BRAND_NAME, BRAND_SLOGAN, CONTACT } from '../lib/brand';
import { useUniversities } from '../lib/hooks';
import { ROLE_FA, type University } from '../lib/types';
import { Err } from '../components/ui';
import Icon from '../components/Icon';

const TABS = [
  { tab: 'profile', label: 'پروفایل من', icon: 'user', admin: false },
  { tab: 'backup', label: 'پشتیبان‌گیری و بازگردانی', icon: 'shield', admin: true },
  { tab: 'about', label: 'درباره ما', icon: 'info', admin: false },
  { tab: 'contact', label: 'ارتباط با ما', icon: 'phone', admin: false },
] as const;

export default function Settings() {
  const { me } = useAuth();
  const { tab = 'profile' } = useParams();
  const canBackup = me?.role === 'super_admin' || me?.role === 'university_admin';
  const tabs = TABS.filter((t) => !t.admin || canBackup);
  if (!tabs.some((t) => t.tab === tab)) return <Navigate to="/settings/profile" replace />;
  return (<>
    <div className="top"><h1>تنظیمات</h1></div>
    <div className="settabs" role="tablist">
      {tabs.map((t) => <NavLink key={t.tab} to={`/settings/${t.tab}`} role="tab" className={({ isActive }) => `settab${isActive ? ' on' : ''}`}><Icon name={t.icon} size={16} />{t.label}</NavLink>)}
    </div>
    {tab === 'profile' && <Profile />}
    {tab === 'backup' && canBackup && <Backup />}
    {tab === 'about' && <About />}
    {tab === 'contact' && <Contact />}
  </>);
}

/* ───────── پروفایل ───────── */
function Profile() {
  const { me, reload } = useAuth();
  const unis = useQuery({ queryKey: ['unis-for-profile'], queryFn: () => get<University[]>('/universities/'), enabled: me?.role === 'super_admin' || me?.role === 'university_admin', retry: false });
  const [first, setFirst] = useState(me?.first_name ?? ''); const [last, setLast] = useState(me?.last_name ?? ''); const [phone, setPhone] = useState(me?.phone ?? '');
  const [pErr, setPErr] = useState<unknown>(null); const [pOk, setPOk] = useState(false); const [pBusy, setPBusy] = useState(false);
  const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [rep, setRep] = useState('');
  const [wErr, setWErr] = useState<unknown>(null); const [wOk, setWOk] = useState(false); const [wBusy, setWBusy] = useState(false);
  if (!me) return null;
  const uni = unis.data?.find((u) => u.id === me.university_id)?.name;
  const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  async function saveProfile(e: FormEvent) {
    e.preventDefault(); setPErr(null); setPOk(false); setPBusy(true);
    try { await patch('/users/me', { first_name: first.trim(), last_name: last.trim(), phone: latin(phone).trim() || null }); await reload(); setPOk(true); }
    catch (x) { setPErr(x); } finally { setPBusy(false); }
  }
  async function savePass(e: FormEvent) {
    e.preventDefault(); setWErr(null); setWOk(false);
    if (nw.length < 8) { setWErr(new Error('رمز جدید باید حداقل ۸ نویسه باشد')); return; }
    if (nw !== rep) { setWErr(new Error('تکرار رمز جدید با رمز جدید یکسان نیست')); return; }
    setWBusy(true);
    try { await patch('/users/me/password', { current_password: cur, new_password: nw }); setWOk(true); setCur(''); setNw(''); setRep(''); }
    catch (x) { setWErr(x); } finally { setWBusy(false); }
  }
  return (<div className="setgrid">
    <div className="card">
      <h3 className="sect" style={{ marginTop: 0 }}>اطلاعات حساب</h3>
      <dl className="kv">
        <dt>نام کاربری</dt><dd dir="ltr">{me.username}</dd>
        <dt>نقش</dt><dd>{ROLE_FA[me.role]}</dd>
        {me.university_id && <><dt>دانشگاه</dt><dd>{uni ?? '—'}</dd></>}
      </dl>
      <form onSubmit={saveProfile}>
        <label>نام<input value={first} onChange={(e) => setFirst(e.target.value)} required maxLength={100} /></label>
        <label>نام خانوادگی<input value={last} onChange={(e) => setLast(e.target.value)} required maxLength={100} /></label>
        <label>تلفن<input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="tel" maxLength={20} /></label>
        <Err e={pErr} />{pOk && <div className="okmsg">اطلاعات ذخیره شد.</div>}
        <button className="btn" disabled={pBusy}>ذخیره‌ی اطلاعات</button>
      </form>
    </div>
    <div className="card">
      <h3 className="sect" style={{ marginTop: 0 }}>تغییر رمز عبور</h3>
      <form onSubmit={savePass}>
        <label>رمز فعلی<input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required autoComplete="current-password" dir="ltr" /></label>
        <label>رمز جدید (حداقل ۸ نویسه)<input type="password" value={nw} onChange={(e) => setNw(e.target.value)} required minLength={8} autoComplete="new-password" dir="ltr" /></label>
        <label>تکرار رمز جدید<input type="password" value={rep} onChange={(e) => setRep(e.target.value)} required autoComplete="new-password" dir="ltr" /></label>
        <Err e={wErr} />{wOk && <div className="okmsg">رمز عبور تغییر کرد.</div>}
        <button className="btn" disabled={wBusy}>تغییر رمز</button>
      </form>
    </div>
  </div>);
}

/* ───────── پشتیبان‌گیری ───────── */
const TABLE_FA: Record<string, string> = {
  students: 'دانشجویان', drivers: 'رانندگان', vehicles: 'خودروها', users: 'کاربران', stations: 'ایستگاه‌ها', routes: 'مسیرها', contracts: 'قراردادها',
  services: 'سرویس‌ها', schedules: 'برنامه‌ی زمانی', trips: 'سفرها', route_stations: 'ایستگاه‌های مسیر', contract_drivers: 'رانندگان قرارداد',
  contract_vehicles: 'خودروهای قرارداد', contract_rates: 'نرخ‌های قرارداد', trip_assignments: 'تخصیص سفر', trip_incidents: 'خرابی‌ها',
  trip_passengers: 'مسافران سفر', station_events: 'رویدادهای ایستگاه', vehicle_locations: 'موقعیت‌های GPS', boarding_requests: 'درخواست‌های سوار شدن',
  feedbacks: 'بازخوردها', reservations: 'رزروها',
};
interface RestoreResult { dry_run: boolean; exported_at: string | null; totals: { created: number; updated: number; unchanged: number }; tables: { table: string; created: number; updated: number; unchanged: number }[]; warnings: string[]; }
const n = (x: number) => x.toLocaleString('fa-IR');

function Backup() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const isSuper = me?.role === 'super_admin';
  const unis = useUniversities();
  const [uniId, setUniId] = useState<number | ''>(isSuper ? '' : me?.university_id ?? '');
  const [busy, setBusy] = useState<'' | 'export' | 'preview' | 'apply'>('');
  const [err, setErr] = useState<unknown>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RestoreResult | null>(null);
  const [done, setDone] = useState<RestoreResult | null>(null);
  const [sure, setSure] = useState(false);
  const base = uniId ? `/backup/university/${uniId}` : '';

  async function doExport() {
    setErr(null); setBusy('export');
    try {
      const { blob, filename } = await download(`${base}/export`);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    } catch (x) { setErr(x); } finally { setBusy(''); }
  }
  async function run(dry: boolean) {
    if (!file || !base) return;
    setErr(null); setBusy(dry ? 'preview' : 'apply'); setDone(null);
    try {
      const r = await upload<RestoreResult>(`${base}/restore`, file, { dry_run: dry });
      if (dry) { setPreview(r); setSure(false); } else { setDone(r); setPreview(null); setFile(null); setSure(false); await qc.invalidateQueries(); }
    } catch (x) { setErr(x); setPreview(null); } finally { setBusy(''); }
  }
  const errList: string[] = err instanceof ApiError && err.body && typeof err.body === 'object'
    ? ((err.body as { detail?: { errors?: string[] } }).detail?.errors ?? []) : [];

  return (<div className="setgrid">
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      {isSuper ? (
        <label style={{ maxWidth: 360 }}>دانشگاه
          <select value={uniId} onChange={(e) => { setUniId(e.target.value ? Number(e.target.value) : ''); setPreview(null); setDone(null); setFile(null); }}>
            <option value="">انتخاب کنید…</option>
            {(unis.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
      ) : <p className="mute" style={{ margin: 0 }}>پشتیبان‌گیری از داده‌های دانشگاه شما.</p>}
    </div>

    <div className="card">
      <h3 className="sect" style={{ marginTop: 0 }}>گرفتن پشتیبان</h3>
      <p className="mute">یک فایل فشرده (<span dir="ltr">.json.gz</span>) از داده‌های دانشگاه دانلود می‌شود: دانشجویان، رانندگان، خودروها، کاربران، مسیرها، ایستگاه‌ها، قراردادها، سرویس‌ها، سفرها، رزروها و موقعیت‌های GPS.</p>
      <div className="warnbox"><Icon name="alert" size={16} /><span>این فایل شامل اطلاعات شخصی و رمزهای رمزنگاری‌شده‌ی کاربران است؛ آن را در جای امن نگه دارید و برای دیگران نفرستید.</span></div>
      <button className="btn" onClick={doExport} disabled={!uniId || !!busy}><Icon name="download" size={16} /> {busy === 'export' ? 'در حال آماده‌سازی…' : 'دانلود پشتیبان'}</button>
    </div>

    <div className="card">
      <h3 className="sect" style={{ marginTop: 0 }}>بازگردانی از پشتیبان</h3>
      <p className="mute">رکوردهای فایل به داده‌ی فعلی اضافه یا جایگزین رکورد هم‌شناسه می‌شوند. <b>هیچ رکوردی حذف نمی‌شود</b>؛ داده‌ای که بعد از پشتیبان ساخته شده، می‌ماند. ابتدا پیش‌نمایش می‌بینید و چیزی ذخیره نمی‌شود.</p>
      <label>فایل پشتیبان<input type="file" accept=".gz,.json,application/gzip,application/json" disabled={!uniId || !!busy}
        onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setDone(null); setErr(null); }} /></label>
      <button className="btn ghost" onClick={() => run(true)} disabled={!file || !uniId || !!busy}><Icon name="upload" size={16} /> {busy === 'preview' ? 'در حال بررسی…' : 'پیش‌نمایش بازگردانی'}</button>
    </div>

    <div style={{ gridColumn: '1 / -1' }}>
      <Err e={err} />
      {errList.length > 0 && <ul className="errlist">{errList.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      {preview && (
        <div className="card">
          <h3 className="sect" style={{ marginTop: 0 }}>پیش‌نمایش (هنوز چیزی تغییر نکرده)</h3>
          <p>فایل مربوط به {preview.exported_at ? new Date(preview.exported_at).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'} است. در صورت تأیید: <b>{n(preview.totals.created)}</b> رکورد جدید، <b>{n(preview.totals.updated)}</b> رکورد به‌روزشده و {n(preview.totals.unchanged)} رکورد بدون تغییر.</p>
          {preview.warnings.map((w, i) => <div key={i} className="warnbox"><Icon name="info" size={16} /><span>{w}</span></div>)}
          <div className="tw"><table><thead><tr><th>بخش</th><th>جدید</th><th>به‌روزشده</th><th>بدون تغییر</th></tr></thead>
            <tbody>{preview.tables.filter((t) => t.created || t.updated || t.unchanged).map((t) => <tr key={t.table}><td>{TABLE_FA[t.table] ?? t.table}</td><td>{n(t.created)}</td><td>{n(t.updated)}</td><td>{n(t.unchanged)}</td></tr>)}</tbody></table></div>
          {preview.totals.created + preview.totals.updated === 0
            ? <p className="mute" style={{ marginTop: 12 }}>داده‌ی فعلی با این پشتیبان یکسان است و نیازی به بازگردانی نیست.</p>
            : <div style={{ marginTop: 12 }}>
                <label className="chk"><input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} style={{ width: 'auto' }} /> می‌دانم که رکوردهای فعلی هم‌شناسه با فایل بازنویسی می‌شوند.</label>
                <button className="btn" disabled={!sure || !!busy} onClick={() => run(false)}>{busy === 'apply' ? 'در حال بازگردانی…' : 'اعمال بازگردانی'}</button>
              </div>}
        </div>
      )}
      {done && <div className="card okbox"><b>بازگردانی انجام شد.</b> {n(done.totals.created)} رکورد جدید و {n(done.totals.updated)} رکورد به‌روزشد.</div>}
    </div>
  </div>);
}

/* ───────── درباره ما / ارتباط با ما ───────── */
function About() {
  return (<div className="card aboutcard">
    <div className="hero" style={{ marginBottom: 16 }}><div className="logo"><Icon name="bus" size={30} /></div><div><h2>{BRAND_NAME}</h2><p>{BRAND_SLOGAN}</p></div></div>
    <p style={{ lineHeight: 2 }}>{ABOUT_TEXT}</p>
    <dl className="kv"><dt>نسخه‌ی پنل مدیریت</dt><dd dir="ltr">{APP_VERSION}</dd></dl>
  </div>);
}

function Contact() {
  const rows: { icon: 'mail' | 'phone' | 'map' | 'info'; label: string; value: string; href?: string }[] = [];
  if (CONTACT.email) rows.push({ icon: 'mail', label: 'ایمیل', value: CONTACT.email, href: `mailto:${CONTACT.email}` });
  if (CONTACT.phone) rows.push({ icon: 'phone', label: 'تلفن', value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, '')}` });
  if (CONTACT.address) rows.push({ icon: 'map', label: 'نشانی', value: CONTACT.address });
  if (CONTACT.website) rows.push({ icon: 'info', label: 'وب‌سایت', value: CONTACT.website, href: CONTACT.website });
  if (CONTACT.hours) rows.push({ icon: 'info', label: 'ساعات پاسخگویی', value: CONTACT.hours });
  return (<div className="card aboutcard">
    <h3 className="sect" style={{ marginTop: 0 }}>ارتباط با ما</h3>
    {rows.length ? <ul className="contactlist">{rows.map((r) => (
      <li key={r.label}><Icon name={r.icon} size={18} /><span className="mute">{r.label}</span>
        {r.href ? <a href={r.href} dir="ltr" target={r.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{r.value}</a> : <span>{r.value}</span>}</li>
    ))}</ul> : <p className="mute">هنوز راه ارتباطی ثبت نشده است. اطلاعات تماس را در فایل <span dir="ltr">src/lib/brand.ts</span> (بخش <span dir="ltr">CONTACT</span>) بنویسید تا اینجا نمایش داده شود.</p>}
  </div>);
}
