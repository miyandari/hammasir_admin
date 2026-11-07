import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { VTYPE_FA, type Contract, type Rate, type Vehicle } from '../lib/types';
import { Acts, Err, Modal, Table, Tag } from '../components/ui';
import FormModal, { type Field } from '../components/FormModal';
import { useCompanies, useUniField } from '../lib/hooks';
import ContractLinks from './ContractLinks';

const money = (n: number | null) => (n == null ? '—' : n.toLocaleString('fa-IR'));
const day = (s: string) => new Date(s).toLocaleDateString('fa-IR');

export default function Contracts() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const canEdit = me?.role !== 'company_admin';
  const uni = useUniField();
  const companies = useCompanies();
  const q = useQuery({ queryKey: ['/contracts/'], queryFn: () => get<Contract[]>('/contracts/') });
  const [sel, setSel] = useState<Contract | null>(null);
  const [links, setLinks] = useState<Contract | null>(null);
  const [edit, setEdit] = useState<Contract | 'new' | null>(null);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['/contracts/'] }); void qc.invalidateQueries({ queryKey: ['costs'] }); };
  const status = useMutation({ mutationFn: (c: Contract) => api('PATCH', `/contracts/${c.id}/status`, { query: { is_active: !c.is_active } }), onSuccess: refresh });
  const cName = (id: number) => companies.data?.find((c) => c.id === id)?.name ?? id;
  const fields: Field[] = [
    ...(uni.isSuper && edit === 'new' ? [{ name: 'university_id', label: 'دانشگاه', type: 'select' as const, options: uni.options, required: true }] : []),
    { name: 'transport_company_id', label: 'شرکت حمل‌ونقل', type: 'select', options: (companies.data ?? []).map((c) => ({ value: c.id, label: c.name })), required: true },
    { name: 'contract_number', label: 'شماره قرارداد', required: true, ltr: true },
    { name: 'start_date', label: 'تاریخ شروع', type: 'date', required: true }, { name: 'end_date', label: 'تاریخ پایان', type: 'date', required: true },
    { name: 'contract_amount', label: 'مبلغ کل قرارداد (ریال)', type: 'number', hint: 'اختیاری؛ هزینه‌ی سفرها از «نرخ‌ها» محاسبه می‌شود' },
    { name: 'description', label: 'توضیحات' }, { name: 'is_active', label: 'فعال', type: 'checkbox' },
  ];
  return (<>
    <div className="top"><h1>قراردادها</h1>{canEdit && <button className="btn" onClick={() => setEdit('new')}>قرارداد جدید</button>}</div>
    <Err e={q.error ?? status.error} />
    <Table rows={q.data ?? []} cols={[
      { head: 'شماره', cell: (r) => <span dir="ltr">{r.contract_number}</span> }, { head: 'شرکت', cell: (r) => cName(r.transport_company_id) },
      { head: 'شروع', cell: (r) => day(r.start_date) }, { head: 'پایان', cell: (r) => day(r.end_date) },
      { head: 'مبلغ کل (ریال)', cell: (r) => money(r.contract_amount) }, { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> },
      { head: '', cell: (r) => <Acts><button className="btn ghost" onClick={() => setSel(r)}>{canEdit ? 'نرخ‌ها' : 'مشاهده نرخ‌ها'}</button>
        <button className="btn ghost" onClick={() => setLinks(r)}>خودرو و راننده</button>
        {canEdit && <button className="btn ghost" onClick={() => setEdit(r)}>ویرایش</button>}
        {canEdit && <button className="btn ghost" onClick={() => { if (confirm(r.is_active ? 'قرارداد غیرفعال شود؟' : 'قرارداد فعال شود؟')) status.mutate(r); }}>{r.is_active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button>}</Acts> }]} />
    {links && <ContractLinks contract={links} canEdit={canEdit} onClose={() => setLinks(null)} />}
    {sel && <RatesModal contract={sel} canEdit={canEdit} onClose={() => setSel(null)} />}
    {edit && <FormModal title={edit === 'new' ? 'قرارداد جدید' : 'ویرایش قرارداد'} fields={fields} onClose={() => setEdit(null)}
      initial={edit === 'new' ? { is_active: true, university_id: uni.myUni } : { ...edit }}
      onSubmit={async (v) => {
        const body = { ...v, university_id: edit === 'new' ? (v.university_id ?? uni.myUni) : edit.university_id };
        await api(edit === 'new' ? 'POST' : 'PATCH', edit === 'new' ? '/contracts/' : `/contracts/${edit.id}`, { json: body }); refresh();
      }} />}
  </>);
}

function RatesModal({ contract, canEdit, onClose }: { contract: Contract; canEdit: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const key = ['rates', contract.id];
  const rates = useQuery({ queryKey: key, queryFn: () => get<Rate[]>('/contract-rates', { contract_id: contract.id }) });
  const vehicles = useQuery({ queryKey: ['/vehicles/'], queryFn: () => get<Vehicle[]>('/vehicles/') });
  const known = [...new Set([...(vehicles.data ?? []).map((v) => v.vehicle_type.toLowerCase()), ...Object.keys(VTYPE_FA)])];
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
        ...(canEdit ? [{ head: '', cell: (r: Rate) => <Acts><button className="btn ghost" onClick={() => { if (confirm('این نرخ حذف شود؟')) del.mutate(r.id); }}>حذف</button></Acts> }] : [])]} />
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

