import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCompanies, useDrivers, useUniField } from '../lib/hooks';
import type { Company, Driver, Vehicle } from '../lib/types';
import { VTYPE_FA } from '../lib/types';
import { Acts, Err, Table, Tag } from '../components/ui';
import FormModal, { type Field } from '../components/FormModal';

const VT_OPTS = Object.entries(VTYPE_FA).map(([value, label]) => ({ value, label }));

function useRefresh(...keys: string[]) {
  const qc = useQueryClient();
  return () => { for (const k of keys) void qc.invalidateQueries({ queryKey: [k] }); };
}

function StatusBtn({ on, run, disabled }: { on: boolean; run: () => void; disabled?: boolean }) {
  return <button className="btn ghost" disabled={disabled} onClick={() => { if (confirm(on ? 'غیرفعال شود؟' : 'فعال شود؟')) run(); }}>{on ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button>;
}

// ---------------------------------------------------------------- شرکت‌ها
export function Companies() {
  const { me } = useAuth();
  const canWrite = me?.role === 'super_admin';
  const q = useCompanies();
  const refresh = useRefresh('/transport-companies/');
  const [edit, setEdit] = useState<Company | 'new' | null>(null);
  const status = useMutation({ mutationFn: (c: Company) => api('PATCH', `/transport-companies/${c.id}/status`, { json: { is_active: !c.is_active } }), onSuccess: refresh });
  const fields: Field[] = [
    { name: 'name', label: 'نام شرکت', required: true }, { name: 'registration_number', label: 'شماره ثبت', ltr: true },
    { name: 'phone', label: 'تلفن', type: 'tel' }, { name: 'address', label: 'نشانی' }, { name: 'is_active', label: 'فعال', type: 'checkbox' },
  ];
  return (<>
    <div className="top"><h1>شرکت‌های حمل‌ونقل</h1>{canWrite && <button className="btn" onClick={() => setEdit('new')}>شرکت جدید</button>}</div>
    <Err e={q.error ?? status.error} />
    <Table rows={q.data ?? []} cols={[
      { head: 'نام', cell: (r) => r.name }, { head: 'شماره ثبت', cell: (r) => r.registration_number ?? '—' },
      { head: 'تلفن', cell: (r) => <span dir="ltr">{r.phone ?? '—'}</span> }, { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> },
      ...(canWrite ? [{ head: '', cell: (r: Company) => <Acts><button className="btn ghost" onClick={() => setEdit(r)}>ویرایش</button><StatusBtn on={r.is_active} run={() => status.mutate(r)} /></Acts> }] : [])]} />
    {edit && <FormModal title={edit === 'new' ? 'شرکت جدید' : 'ویرایش شرکت'} fields={fields} onClose={() => setEdit(null)}
      initial={edit === 'new' ? { is_active: true } : { ...edit }}
      onSubmit={async (v) => { await api(edit === 'new' ? 'POST' : 'PATCH', edit === 'new' ? '/transport-companies/' : `/transport-companies/${edit.id}`, { json: v }); refresh(); }} />}
    {!canWrite && <p className="mute">تعریف شرکت فقط توسط مدیر ارشد سامانه انجام می‌شود.</p>}
  </>);
}

// ---------------------------------------------------------------- خودروها
export function Vehicles() {
  const { me } = useAuth();
  const isCompany = me?.role === 'company_admin';
  const uni = useUniField();
  const q = useQuery({ queryKey: ['/vehicles/'], queryFn: () => get<Vehicle[]>('/vehicles/') });
  const drivers = useDrivers();
  const refresh = useRefresh('/vehicles/');
  const [edit, setEdit] = useState<Vehicle | 'new' | null>(null);
  const status = useMutation({ mutationFn: (r: Vehicle) => api('PATCH', `/vehicles/${r.id}/status`, { query: { is_active: !r.is_active } }), onSuccess: refresh });
  const dName = (id: number | null) => { const d = drivers.data?.find((x) => x.id === id); return d ? `${d.first_name} ${d.last_name}` : id ?? '—'; };
  const fields: Field[] = [
    ...(uni.isSuper && edit === 'new' ? [{ name: 'university_id', label: 'دانشگاه', type: 'select' as const, options: uni.options, required: true }] : []),
    { name: 'plate_number', label: 'پلاک', required: true, ltr: true }, { name: 'vehicle_type', label: 'نوع خودرو', type: 'select', options: VT_OPTS, required: true },
    { name: 'capacity', label: 'ظرفیت کل (نفر)', type: 'number', required: true },
    { name: 'driver_id', label: 'راننده‌ی اصلی', hint: 'شرکتِ خودرو از روی شرکت این راننده تعیین می‌شود و برای اتصال به قرارداد لازم است', type: 'select', options: (drivers.data ?? []).map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` })) },
    ...(!isCompany ? [{ name: 'is_active', label: 'فعال', type: 'checkbox' as const }] : []),
  ];
  return (<>
    <div className="top"><h1>خودروها</h1>{!isCompany && <button className="btn" onClick={() => setEdit('new')}>خودروی جدید</button>}</div>
    <Err e={q.error ?? status.error} />
    <Table rows={q.data ?? []} cols={[
      { head: 'پلاک', cell: (r) => <span dir="ltr">{r.plate_number}</span> }, { head: 'نوع', cell: (r) => VTYPE_FA[r.vehicle_type] ?? r.vehicle_type },
      { head: 'ظرفیت', cell: (r) => r.capacity }, { head: 'راننده', cell: (r) => dName(r.driver_id) }, { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> },
      { head: '', cell: (r) => <Acts><button className="btn ghost" onClick={() => setEdit(r)}>ویرایش</button>{!isCompany && <StatusBtn on={r.is_active} run={() => status.mutate(r)} />}</Acts> }]} />
    {edit && <FormModal title={edit === 'new' ? 'خودروی جدید' : 'ویرایش خودرو'} fields={fields} onClose={() => setEdit(null)}
      initial={edit === 'new' ? { is_active: true, university_id: uni.myUni } : { ...edit }}
      onSubmit={async (v) => {
        const body = { ...v, university_id: edit === 'new' ? (v.university_id ?? uni.myUni) : edit.university_id, is_active: isCompany && edit !== 'new' ? edit.is_active : v.is_active ?? true };
        await api(edit === 'new' ? 'POST' : 'PATCH', edit === 'new' ? '/vehicles/' : `/vehicles/${edit.id}`, { json: body }); refresh();
      }} />}
    {isCompany && <p className="mute">کاربر شرکت می‌تواند خودروهای شرکت خودش را ویرایش کند؛ ثبت خودروی جدید توسط مدیر دانشگاه انجام می‌شود.</p>}
  </>);
}

// ---------------------------------------------------------------- رانندگان
export function Drivers() {
  const { me } = useAuth();
  const isCompany = me?.role === 'company_admin';
  const uni = useUniField();
  const companies = useCompanies();
  const q = useDrivers();
  const refresh = useRefresh('/drivers/');
  const [edit, setEdit] = useState<Driver | 'new' | null>(null);
  const status = useMutation({ mutationFn: (r: Driver) => api('PATCH', `/drivers/${r.id}/status`, { query: { is_active: !r.is_active } }), onSuccess: refresh });
  const cName = (id: number | null) => companies.data?.find((c) => c.id === id)?.name ?? (id ?? '—');
  const fields: Field[] = [
    ...(uni.isSuper && edit === 'new' ? [{ name: 'university_id', label: 'دانشگاه', type: 'select' as const, options: uni.options, required: true }] : []),
    ...(!isCompany ? [{ name: 'transport_company_id', label: 'شرکت حمل‌ونقل', type: 'select' as const, options: (companies.data ?? []).map((c) => ({ value: c.id, label: c.name })) }] : []),
    { name: 'first_name', label: 'نام', required: true }, { name: 'last_name', label: 'نام خانوادگی', required: true },
    { name: 'phone', label: 'تلفن همراه', type: 'tel', required: true }, { name: 'national_id', label: 'کد ملی', ltr: true }, { name: 'license_number', label: 'شماره گواهینامه', ltr: true },
    ...(!isCompany ? [{ name: 'is_active', label: 'فعال', type: 'checkbox' as const }] : []),
  ];
  return (<>
    <div className="top"><h1>رانندگان</h1>{!isCompany && <button className="btn" onClick={() => setEdit('new')}>راننده‌ی جدید</button>}</div>
    <Err e={q.error ?? status.error} />
    <Table rows={q.data ?? []} cols={[
      { head: 'نام', cell: (r) => `${r.first_name} ${r.last_name}` }, { head: 'تلفن', cell: (r) => <span dir="ltr">{r.phone}</span> },
      { head: 'شرکت', cell: (r) => cName(r.transport_company_id) }, { head: 'گواهینامه', cell: (r) => r.license_number ?? '—' }, { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> },
      { head: '', cell: (r) => <Acts><button className="btn ghost" onClick={() => setEdit(r)}>ویرایش</button>{!isCompany && <StatusBtn on={r.is_active} run={() => status.mutate(r)} />}</Acts> }]} />
    {edit && <FormModal title={edit === 'new' ? 'راننده‌ی جدید' : 'ویرایش راننده'} fields={fields} onClose={() => setEdit(null)}
      initial={edit === 'new' ? { is_active: true, university_id: uni.myUni } : { ...edit }}
      onSubmit={async (v) => {
        const base = edit === 'new' ? { university_id: v.university_id ?? uni.myUni } : { university_id: edit.university_id };
        const body = { ...v, ...base, transport_company_id: isCompany && edit !== 'new' ? edit.transport_company_id : v.transport_company_id ?? null, is_active: isCompany && edit !== 'new' ? edit.is_active : v.is_active ?? true };
        await api(edit === 'new' ? 'POST' : 'PATCH', edit === 'new' ? '/drivers/' : `/drivers/${edit.id}`, { json: body }); refresh();
      }} />}
    {!isCompany && <p className="mute">برای ورود راننده به اپ، از صفحه‌ی «کاربران» یک حساب با نقش «راننده» به او وصل کنید.</p>}
  </>);
}
