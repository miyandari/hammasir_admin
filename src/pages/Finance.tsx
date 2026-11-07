import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { VTYPE_FA, type CostReport } from '../lib/types';
import { Err } from '../components/ui';
import JalaliDate, { isoToJalali, jalaliToIso, todayIso } from '../components/JalaliDate';

const money = (n: number | null) => (n == null ? '—' : n.toLocaleString('fa-IR'));
const first = () => { const j = isoToJalali(todayIso())!; return jalaliToIso(j.jy, j.jm, 1); }; // اول ماه شمسی جاری

export default function Finance() {
  const [from, setFrom] = useState(first()); const [to, setTo] = useState(todayIso());
  const [open, setOpen] = useState<number | 'all' | null>(null);
  const [svc, setSvc] = useState('');
  const q = useQuery({ queryKey: ['costs', from, to], queryFn: () => get<CostReport>('/contract-rates/costs', { start_date: from, end_date: to }) });
  // سرویس‌های موجود در گزارش (برای لیست کشویی) و فیلتر سمت کاربر
  const svcOpts = useMemo(() => {
    const m = new Map<number, string>();
    for (const i of q.data?.items ?? []) for (const l of i.lines) if (l.service_id != null) m.set(l.service_id, l.service_name ?? `سرویس ${l.service_id}`);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fa'));
  }, [q.data]);
  const items = useMemo(() => (q.data?.items ?? []).map((i) => {
    const lines = svc ? i.lines.filter((l) => String(l.service_id) === svc) : i.lines;
    const trips = lines.reduce((a, l) => a + l.trips, 0);
    const priced = lines.reduce((a, l) => a + (l.price_per_trip != null ? l.trips : 0), 0);
    return { ...i, lines, trips, unpriced_trips: trips - priced, total_cost: lines.reduce((a, l) => a + (l.amount ?? 0), 0) };
  }).filter((i) => !svc || i.lines.length), [q.data, svc]);
  const s = { trips: items.reduce((a, i) => a + i.trips, 0), unpriced_trips: items.reduce((a, i) => a + i.unpriced_trips, 0), total_cost: items.reduce((a, i) => a + i.total_cost, 0) };
  function csv() {
    const rows = [['قرارداد', 'سرویس', 'نوع خودرو', 'سفر انجام‌شده', 'نرخ هر سفر', 'مبلغ']];
    for (const i of items) for (const l of i.lines) rows.push([i.contract_number, l.service_name ?? '', VTYPE_FA[l.vehicle_type ?? ''] ?? l.vehicle_type ?? 'نامشخص', String(l.trips), String(l.price_per_trip ?? ''), String(l.amount ?? '')]);
    const blob = new Blob(['\ufeff' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `finance-report_${from}_${to}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  }
  return (<>
    <div className="top"><h1>گزارش مالی</h1>
      <div className="row">
        <div style={{ width: 290 }}><span className="mute" style={{ fontSize: 12 }}>از</span><JalaliDate value={from} onChange={(x) => x && setFrom(x)} /></div>
        <div style={{ width: 290 }}><span className="mute" style={{ fontSize: 12 }}>تا</span><JalaliDate value={to} onChange={(x) => x && setTo(x)} /></div>
        <label style={{ minWidth: 180 }}><span className="mute" style={{ fontSize: 12 }}>سرویس</span><select value={svc} onChange={(e) => setSvc(e.target.value)}><option value="">همه‌ی سرویس‌ها</option>{svcOpts.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
        <button className="btn ghost" onClick={csv} disabled={!items.length}>خروجی CSV</button>
        <button className="btn ghost" onClick={() => setOpen(open === 'all' ? null : 'all')} disabled={!items.length}>{open === 'all' ? 'بستن همه‌ی جزئیات' : 'نمایش همه‌ی جزئیات'}</button>
      </div></div>
    <Err e={q.error} />
    <div className="grid" style={{ marginBottom: 16 }}>
      <div className="card stat"><b>{money(s.total_cost)}</b><span>جمع هزینه (ریال)</span></div>
      <div className="card stat"><b>{money(s.trips)}</b><span>سفر انجام‌شده</span></div>
      <div className="card stat"><b>{money(s.unpriced_trips)}</b><span>سفر بدون نرخ</span></div>
    </div>
    {!!s.unpriced_trips && <div className="err" style={{ background: 'var(--warn-l)', color: 'var(--warn)' }}>برای {s.unpriced_trips.toLocaleString('fa-IR')} سفر نرخی تعریف نشده یا خودرویی ثبت نشده؛ این سفرها در جمع هزینه نیستند. نرخ را از صفحه‌ی قراردادها تعریف کنید.</div>}
    <div className="card tw" style={{ padding: 0 }}>
      <table><thead><tr><th>قرارداد</th><th>سفر</th><th>بدون نرخ</th><th>هزینه (ریال)</th><th /></tr></thead><tbody>
        {items.map((i) => (<Fragment key={i.contract_id}>
          <tr><td dir="ltr">{i.contract_number}</td><td>{i.trips.toLocaleString('fa-IR')}</td><td>{i.unpriced_trips ? <span className="tag warn">{i.unpriced_trips.toLocaleString('fa-IR')}</span> : '—'}</td><td>{money(i.total_cost)}</td>
            <td><button className="btn ghost" onClick={() => setOpen(open === i.contract_id ? null : i.contract_id)}>{open === 'all' || open === i.contract_id ? 'بستن' : 'جزئیات'}</button></td></tr>
          {(open === 'all' || open === i.contract_id) && i.lines.map((l, k) => <tr key={k} className="mute"><td>↳ {l.service_name ?? '—'} · {VTYPE_FA[l.vehicle_type ?? ''] ?? l.vehicle_type ?? 'خودرو نامشخص'}</td><td>{l.trips.toLocaleString('fa-IR')} × {money(l.price_per_trip)}</td><td /><td>{money(l.amount)}</td><td /></tr>)}
        </Fragment>))}
      </tbody></table>
      {!items.length && <div className="mute" style={{ padding: 16 }}>در این بازه قراردادی یافت نشد.</div>}
    </div>
    <p className="mute" style={{ marginTop: 12 }}>فقط سفرهای «انجام‌شده» محاسبه می‌شوند. بازه بر اساس تاریخ شمسی انتخاب می‌شود.</p>
  </>);
}
