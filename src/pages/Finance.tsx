import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { VTYPE_FA, type CostReport } from '../lib/types';
import { Err } from '../components/ui';

const money = (n: number | null) => (n == null ? '—' : n.toLocaleString('fa-IR'));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const first = () => { const d = new Date(); d.setDate(1); return iso(d); };

export default function Finance() {
  const [from, setFrom] = useState(first()); const [to, setTo] = useState(iso(new Date()));
  const [open, setOpen] = useState<number | null>(null);
  const q = useQuery({ queryKey: ['costs', from, to], queryFn: () => get<CostReport>('/contract-rates/costs', { start_date: from, end_date: to }) });
  const s = q.data?.summary;
  function csv() {
    const rows = [['قرارداد', 'نوع خودرو', 'سفر انجام‌شده', 'نرخ هر سفر', 'مبلغ']];
    for (const i of q.data?.items ?? []) for (const l of i.lines) rows.push([i.contract_number, VTYPE_FA[l.vehicle_type ?? ''] ?? l.vehicle_type ?? 'نامشخص', String(l.trips), String(l.price_per_trip ?? ''), String(l.amount ?? '')]);
    const blob = new Blob(['﻿' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `گزارش-مالی-${from}_${to}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  return (<>
    <div className="top"><h1>گزارش مالی</h1>
      <div className="row">
        <label style={{ margin: 0 }}>از<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label style={{ margin: 0 }}>تا<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn ghost" onClick={csv} disabled={!q.data?.items.length}>خروجی CSV</button>
      </div></div>
    <Err e={q.error} />
    <div className="grid" style={{ marginBottom: 16 }}>
      <div className="card stat"><b>{money(s?.total_cost ?? null)}</b><span>جمع هزینه (ریال)</span></div>
      <div className="card stat"><b>{money(s?.trips ?? null)}</b><span>سفر انجام‌شده</span></div>
      <div className="card stat"><b>{money(s?.unpriced_trips ?? null)}</b><span>سفر بدون نرخ</span></div>
    </div>
    {!!s?.unpriced_trips && <div className="err" style={{ background: 'var(--warn-l)', color: 'var(--warn)' }}>برای {s.unpriced_trips.toLocaleString('fa-IR')} سفر نرخی تعریف نشده یا خودرویی ثبت نشده؛ این سفرها در جمع هزینه نیستند. نرخ را از صفحه‌ی قراردادها تعریف کنید.</div>}
    <div className="card tw" style={{ padding: 0 }}>
      <table><thead><tr><th>قرارداد</th><th>سفر</th><th>بدون نرخ</th><th>هزینه (ریال)</th><th /></tr></thead><tbody>
        {(q.data?.items ?? []).map((i) => (<Fragment key={i.contract_id}>
          <tr><td dir="ltr">{i.contract_number}</td><td>{i.trips.toLocaleString('fa-IR')}</td><td>{i.unpriced_trips ? <span className="tag warn">{i.unpriced_trips.toLocaleString('fa-IR')}</span> : '—'}</td><td>{money(i.total_cost)}</td>
            <td><button className="btn ghost" onClick={() => setOpen(open === i.contract_id ? null : i.contract_id)}>{open === i.contract_id ? 'بستن' : 'جزئیات'}</button></td></tr>
          {open === i.contract_id && i.lines.map((l, k) => <tr key={k} className="mute"><td>↳ {VTYPE_FA[l.vehicle_type ?? ''] ?? l.vehicle_type ?? 'خودرو نامشخص'}</td><td>{l.trips.toLocaleString('fa-IR')} × {money(l.price_per_trip)}</td><td /><td>{money(l.amount)}</td><td /></tr>)}
        </Fragment>))}
      </tbody></table>
      {!q.data?.items.length && <div className="mute" style={{ padding: 16 }}>در این بازه قراردادی یافت نشد.</div>}
    </div>
    <p className="mute" style={{ marginTop: 12 }}>فقط سفرهای «انجام‌شده» محاسبه می‌شوند. تاریخ‌ها فعلاً میلادی‌اند (انتخاب‌گر شمسی در نسخه‌ی بعد).</p>
  </>);
}
