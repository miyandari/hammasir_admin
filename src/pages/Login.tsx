import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { Err } from '../components/ui';
import Icon from '../components/Icon';
import { BRAND_NAME, BRAND_SLOGAN } from '../lib/brand';

export default function Login() {
  const { login } = useAuth();
  const [u, setU] = useState(''); const [p, setP] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<unknown>(null);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await login(u.trim(), p); } catch (x) { setErr(x); } finally { setBusy(false); }
  }
  return (
    <div className="login"><form className="card" onSubmit={submit}>
      <div className="brandhead">
        <div className="logo"><Icon name="bus" size={28} /></div>
        <h1>{BRAND_NAME}</h1>
        <p className="slogan">{BRAND_SLOGAN}</p>
      </div>
      <p className="mute" style={{ marginTop: 0, textAlign: 'center' }}>ورود به پنل مدیریت</p>
      <Err e={err} />
      <label>نام کاربری<input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" dir="ltr" required /></label>
      <label>رمز عبور<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" dir="ltr" required /></label>
      <button className="btn" disabled={busy} style={{ width: '100%' }}>{busy ? 'در حال ورود…' : 'ورود'}</button>
    </form></div>
  );
}
