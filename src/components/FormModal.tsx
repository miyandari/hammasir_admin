import { useState, type FormEvent } from 'react';
import { Err, Modal } from './ui';

export interface Field {
  name: string; label: string; type?: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'password' | 'tel';
  options?: { value: string | number; label: string }[]; required?: boolean; ltr?: boolean; hint?: string; placeholder?: string; min?: number; max?: number;
}
export type Values = Record<string, string | number | boolean | null | undefined>;

const FA = '۰۱۲۳۴۵۶۷۸۹';
export const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export default function FormModal({ title, fields, initial, submitLabel = 'ثبت', onSubmit, onClose }: {
  title: string; fields: Field[]; initial: Values; submitLabel?: string;
  onSubmit: (v: Values) => Promise<unknown>; onClose: () => void;
}) {
  const [v, setV] = useState<Values>(initial);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, x: Values[string]) => setV((p) => ({ ...p, [k]: x }));

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const out: Values = {};
    for (const f of fields) {
      const raw = v[f.name];
      if (f.type === 'number') out[f.name] = raw === '' || raw == null ? null : Number(latin(String(raw)).replace(/[,٬،\s]/g, ''));
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
        {fields.map((f) => f.type === 'checkbox' ? (
          <label key={f.name} className="row" style={{ color: 'var(--ink)' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={!!v[f.name]} onChange={(e) => set(f.name, e.target.checked)} />{f.label}
          </label>
        ) : (
          <label key={f.name}>{f.label}{f.required ? ' *' : ''}
            {f.type === 'select' ? (
              <select value={String(v[f.name] ?? '')} onChange={(e) => set(f.name, e.target.value)} required={f.required}>
                <option value="">— انتخاب —</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type={f.type === 'number' ? 'text' : f.type ?? 'text'} inputMode={f.type === 'number' ? 'numeric' : undefined}
                value={String(v[f.name] ?? '')} onChange={(e) => set(f.name, e.target.value)} required={f.required}
                dir={f.ltr || f.type === 'number' || f.type === 'password' || f.type === 'tel' || f.type === 'date' ? 'ltr' : undefined}
                placeholder={f.placeholder} autoComplete={f.type === 'password' ? 'new-password' : 'off'} />
            )}
            {f.hint && <span className="mute" style={{ fontSize: 12 }}>{f.hint}</span>}
          </label>
        ))}
        <button className="btn" disabled={busy}>{busy ? 'در حال ثبت…' : submitLabel}</button>
      </form>
    </Modal>
  );
}
