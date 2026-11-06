import { useMemo } from 'react';
import { jalaaliMonthLength, toGregorian, toJalaali } from 'jalaali-js';

export const MONTHS_FA = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const pad = (n: number) => String(n).padStart(2, '0');

/** تاریخ میلادی ISO (YYYY-MM-DD) → اجزای شمسی؛ مقدار خالی یا نامعتبر → null */
export function isoToJalali(iso: string | null | undefined): { jy: number; jm: number; jd: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  const { jy, jm, jd } = toJalaali(+m[1], +m[2], +m[3]);
  return { jy, jm, jd };
}
export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}
/** امروز به‌صورت ISO میلادی، بر اساس ساعت محلی مرورگر */
export function todayIso(): string { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
/** نمایش شمسی مثل ۱۴۰۵/۰۸/۱۵ */
export function showJalali(iso: string | null | undefined): string {
  const j = isoToJalali(iso); if (!j) return '—';
  return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

/** انتخاب‌گر تاریخ شمسی (سال/ماه/روز). مقدار و خروجی همیشه ISO میلادی‌اند، پس بک‌اند تغییری نمی‌کند. */
export default function JalaliDate({ value, onChange, allowEmpty = false, width }: { value: string; onChange: (iso: string) => void; allowEmpty?: boolean; width?: number | string }) {
  const cur = isoToJalali(value);
  const nowY = toJalaali(new Date()).jy;
  const years = useMemo(() => {
    const ys = new Set<number>(); for (let y = nowY - 8; y <= nowY + 6; y++) ys.add(y);
    if (cur) ys.add(cur.jy);
    return [...ys].sort((a, b) => a - b);
  }, [nowY, cur?.jy]); // eslint-disable-line react-hooks/exhaustive-deps
  const fa = (n: number) => n.toLocaleString('fa-IR', { useGrouping: false });

  function set(part: 'y' | 'm' | 'd', v: string) {
    if (v === '') { if (allowEmpty) onChange(''); return; }
    const base = cur ?? { jy: nowY, jm: 1, jd: 1 };
    const n = { ...base, [part === 'y' ? 'jy' : part === 'm' ? 'jm' : 'jd']: +v };
    n.jd = Math.min(n.jd, jalaaliMonthLength(n.jy, n.jm)); // مثلاً ۳۱ شهریور ← ۳۰ مهر
    onChange(jalaliToIso(n.jy, n.jm, n.jd));
  }
  const days = cur ? jalaaliMonthLength(cur.jy, cur.jm) : 31;
  const sel = { width: 'auto', flex: 1, minWidth: 0 } as const;
  return (
    <div className="row" style={{ flexWrap: 'nowrap', gap: 6, width }} dir="rtl">
      <select aria-label="روز" style={sel} value={cur?.jd ?? ''} onChange={(e) => set('d', e.target.value)}>
        <option value="">روز</option>{Array.from({ length: days }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{fa(d)}</option>)}</select>
      <select aria-label="ماه" style={{ ...sel, flex: 2 }} value={cur?.jm ?? ''} onChange={(e) => set('m', e.target.value)}>
        <option value="">ماه</option>{MONTHS_FA.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
      <select aria-label="سال" style={{ ...sel, flex: 1.4 }} value={cur?.jy ?? ''} onChange={(e) => set('y', e.target.value)}>
        <option value="">سال</option>{years.map((y) => <option key={y} value={y}>{fa(y)}</option>)}</select>
    </div>
  );
}
