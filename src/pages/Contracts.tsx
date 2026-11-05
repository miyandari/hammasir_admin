import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { VTYPE_FA, type Contract, type Rate, type Vehicle } from '../lib/types';
import { Err, Modal, Table, Tag } from '../components/ui';

const money = (n: number | null) => (n == null ? '—' : n.toLocaleString('fa-IR'));
const day = (s: string) => new Date(s).toLocaleDateString('fa-IR');

export default function Contracts() {
  const { me } = useAuth();
  const canEdit = me?.role !== 'company_admin';
  const q = useQuery({ queryKey: ['/contracts/'], queryFn: () => get<Contract[]>('/contracts/') });
  const [sel, setSel] = useState<Contract | null>(null);
  return (<>
    <div className="top"><h1>قراردادها</h1><span className="mute">{q.data ? `${q.data.length} مورد` : ''}</span></div>
    <Err e={q.error} />
    <Table rows={q.data ?? []} cols={[
      { head: 'شماره', cell: (r) => <span dir="ltr">{r.contract_number}</span> }, { head: 'شرکت', cell: (r) => r.transport_company_id },
      { head: 'شروع', cell: (r) => day(r.start_date) }, { head: 'پایان', cell: (r) => day(r.end_date) },
      { head: 'مبلغ کل (ریال)', cell: (r) => money(r.contract_amount) }, { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> },
      { head: 'نرخ سفر', cell: (r) => <button className="btn ghost" onClick={() => setSel(r)}>{canEdit ? 'نرخ‌ها' : 'مشاهده نرخ‌ها'}</button> }]} />
    {sel && <RatesModal contract={sel} canEdit={canEdit} onClose={() => setSel(null)} />}
  </>);
}

function RatesModal({ contract, canEdit, onClose }: { contract: Contract; canEdit: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const key = ['rates', contract.id];
  const rates = useQuery({ queryKey: key, queryFn: () => get<Rate[]>('/contract-rates', { contract_id: contract.id }) });
  const vehicles = useQuery({ queryKey: ['/vehicles/'], queryFn: () => get<Vehicle[]>('/vehicles/') });
  const known = [...new Set([...(vehicles.data ?? []).map((v) => v.vehicle_type.toLowerCase()), 'bus', 'minibus'])];
  const [vt, setVt] = useState('bus'); const [price, setPrice] = useState('');
  const refresh = () => { void qc.invalidateQueries({ queryKey: key }); void qc.invalidateQueries({ queryKey: ['costs'] }); };
  const save = useMutation({
    mutationFn: () => api('PUT', '/contract-rates', { json: { contract_id: contract.id, vehicle_type: vt, price_per_trip: Number(price.replace(/[,،٬\s]/g, '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))) } }),
    onSuccess: () => { refresh(); setPrice(''); },
  });
  const del = useMutation({ mutationFn: (id: number) => api('DELETE', `/contract-rates/${id}`), onSuccess: refresh });
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(); };
  return (
    <Modal title={`نرخ هر سفر — قرارداد ${contract.contract_number}`} onClose={onClose}>
      <p className="mute" style={{ marginTop: 0 }}>هزینه = تعداد سفرهای انجام‌شده × نرخ نوع خودرو (ریال). دانشجو چیزی نمی‌پردازد.</p>
      <Err e={rates.error ?? save.error ?? del.error} />
      <Table rows={rates.data ?? []} empty="هنوز نرخی تعریف نشده؛ سفرها در گزارش مالی «بدون نرخ» می‌مانند." cols={[
        { head: 'نوع خودرو', cell: (r) => VTYPE_FA[r.vehicle_type] ?? r.vehicle_type }, { head: 'نرخ هر سفر (ریال)', cell: (r) => money(r.price_per_trip) },
        ...(canEdit ? [{ head: '', cell: (r: Rate) => <button className="btn ghost" onClick={() => { if (confirm('این نرخ حذف شود؟')) del.mutate(r.id); }}>حذف</button> }] : [])]} />
      {canEdit && <form onSubmit={submit} style={{ marginTop: 16 }}>
        <div className="row">
          <label style={{ flex: 1, margin: 0 }}>نوع خودرو<select value={vt} onChange={(e) => setVt(e.target.value)}>{known.map((k) => <option key={k} value={k}>{VTYPE_FA[k] ?? k}</option>)}</select></label>
          <label style={{ flex: 1, margin: 0 }}>نرخ هر سفر (ریال)<input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" dir="ltr" required /></label>
        </div>
        <button className="btn" style={{ marginTop: 12 }} disabled={save.isPending}>ثبت / ویرایش نرخ</button>
        <span className="mute" style={{ marginInlineStart: 8, fontSize: 12 }}>اگر برای این نوع نرخ وجود داشته باشد، جایگزین می‌شود.</span>
      </form>}
    </Modal>
  );
}
