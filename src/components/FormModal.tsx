import { useState, type FormEvent } from 'react';
import { Err, Modal } from './ui';
import JalaliDate from './JalaliDate';
import MapPicker from './MapPicker';

export interface Field {
  name: string; label: string; type?: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'password' | 'tel' | 'latlng';
  options?: { value: string | number; label: string }[]; required?: boolean; ltr?: boolean; hint?: string; placeholder?: string; min?: number; max?: number;
}
export type Values = Record<string, string | number | boolean | null | undefined>;

const FA = '۰۱۲۳۴۵۶۷۸۹';
const toNum = (x: unknown): number | null => { const n = Number(String(x ?? '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace('٫', '.')); return String(x ?? '').trim() === '' || !Number.isFinite(n) ? null : n; };
export const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export default function FormModal({ title, fields, initial, submitLabel = 'ثبت', onSubmit, onClose, mapOthers }: {
  title: string; fields: Field[]; initial: Values; submitLabel?: string; mapOthers?: { name: string; lat: number; lng: number }[];
  onSubmit: (v: Values) => Promise<unknown>; onClose: () => void;
}) {
  const [v, setV] = useState<Values>(initial);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const set = (k: string, x: Values[string]) => setV((p) => ({ ...p, [k]: x }));

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null);
    const missing = fields.find((f) => f.type === 'date' && f.required && !v[f.name]);
    if (missing) { setErr(new Error(`«${missing.label}» را انتخاب کنید`)); return; }
    setBusy(true);
    const out: Values = {};
    for (const f of fields) {
      if (f.type === 'latlng') {
        const num = (x: unknown) => { const n = Number(latin(String(x ?? '')).replace('٫', '.').replace(/[,٬،\s]/g, '')); return String(x ?? '').trim() === '' || !Number.isFinite(n) ? null : n; };
        const la = num(v.latitude), lo = num(v.longitude);
        if ((la == null) !== (lo == null)) { setErr(new Error('عرض و طول جغرافیایی را هر دو وارد کنید یا هر دو را خالی بگذارید')); setBusy(false); return; }
        if (la != null && (la < -90 || la > 90 || lo! < -180 || lo! > 180)) { setErr(new Error('مختصات خارج از بازه‌ی معتبر است')); setBusy(false); return; }
        out.latitude = la; out.longitude = lo; continue;
      }
      const raw = v[f.name];
      if (f.type === 'number') { const n = raw === '' || raw == null ? NaN : Number(latin(String(raw)).replace(/[,٬،\s]/g, '').replace('٫', '.')); out[f.name] = Number.isFinite(n) ? n : null; }
      else if (f.type === 'select') out[f.name] = raw === '' || raw == null ? null : (typeof f.options?.[0]?.value === 'number' ? Number(raw) : String(raw));
      else if (f.type === 'checkbox') out[f.name] = !!raw;
      else { const s = latin(String(raw ?? '')).trim(); out[f.name] = f.type === 'password' ? String(raw ?? '') : s === '' ? null : s; }
    }
    try { await onSubmit(out); onClose(); } catch (x) { setErr(x); } finally { setBusy(false); }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <Err e={err} />
        {fields.map((f) => f.type === 'latlng' ? (
          <div key="latlng" style={{ marginBottom: 12 }}>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <label style={{ flex: 1, margin: 0 }}>{f.label ?? 'عرض (lat)'}<input dir="ltr" value={String(v.latitude ?? '')} onChange={(e) => set('latitude', e.target.value)} inputMode="decimal" /></label>
              <label style={{ flex: 1, margin: 0 }}>طول (lng)<input dir="ltr" value={String(v.longitude ?? '')} onChange={(e) => set('longitude', e.target.value)} inputMode="decimal" /></label>
              <button type="button" className="btn ghost" onClick={() => setPicking(true)}>انتخاب روی نقشه</button>
            </div>
            {f.hint && <span className="mute" style={{ fontSize: 12 }}>{f.hint}</span>}
          </div>
        ) : f.type === 'checkbox' ? (
          <label key={f.name} className="row" style={{ color: 'var(--ink)' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={!!v[f.name]} onChange={(e) => set(f.name, e.target.checked)} />{f.label}
          </label>
        ) : (
          <label key={f.name}>{f.label}{f.required ? ' *' : ''}
            {f.type === 'date' ? <JalaliDate value={String(v[f.name] ?? '')} onChange={(x) => set(f.name, x)} allowEmpty={!f.required} />
            : f.type === 'select' ? (
              <select value={String(v[f.name] ?? '')} onChange={(e) => set(f.name, e.target.value)} required={f.required}>
                <option value="">— انتخاب —</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type={f.type === 'number' ? 'text' : f.type ?? 'text'} inputMode={f.type === 'number' ? 'numeric' : undefined}
                value={String(v[f.name] ?? '')} onChange={(e) => set(f.name, e.target.value)} required={f.required}
                dir={f.ltr || f.type === 'number' || f.type === 'password' || f.type === 'tel' ? 'ltr' : undefined}
                placeholder={f.placeholder} autoComplete={f.type === 'password' ? 'new-password' : 'off'} />
            )}
            {f.hint && <span className="mute" style={{ fontSize: 12 }}>{f.hint}</span>}
          </label>
        ))}
        <button className="btn" disabled={busy}>{busy ? 'در حال ثبت…' : submitLabel}</button>
      </form>
      {picking && <MapPicker lat={toNum(v.latitude)} lng={toNum(v.longitude)} others={mapOthers} onClose={() => setPicking(false)}
        onPick={(la, lo) => { set('latitude', la.toFixed(6)); set('longitude', lo.toFixed(6)); }} />}
    </Modal>
  );
}
