import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCompanies, useDrivers, useUniField, useUniversities } from '../lib/hooks';
import { ROLE_FA, type Me, type Role } from '../lib/types';
import { Acts, Err, Modal, Table, Tag } from '../components/ui';
import FormModal, { type Field } from '../components/FormModal';

type U = Me & { phone: string | null; is_active: boolean; must_change_password?: boolean; driver_id: number | null; student_id: number | null };

export default function Users() {
  const { me } = useAuth();
  const isSuper = me?.role === 'super_admin';
  const uni = useUniField();
  const unis = useUniversities();
  const companies = useCompanies();
  const drivers = useDrivers();
  const qc = useQueryClient();
  const [role, setRole] = useState('');
  const q = useQuery({ queryKey: ['users', role], queryFn: () => get<U[]>('/users/', { role }) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['users'] });
  const [creating, setCreating] = useState(false);
  const [pwUser, setPwUser] = useState<U | null>(null);
  const status = useMutation({ mutationFn: (u: U) => api('PATCH', `/users/${u.id}/status`, { query: { is_active: !u.is_active } }), onSuccess: refresh });

  // نقش‌هایی که این کاربر می‌تواند بسازد (طبق قواعد بک‌اند). دانشجو از «بارگذاری گروهی» ساخته می‌شود.
  const creatable: Role[] = isSuper ? ['university_admin', 'transport_manager', 'company_admin', 'driver', 'super_admin'] : ['transport_manager', 'driver'];
  const uniName = (id: number | null) => (id == null ? '—' : unis.data?.find((u) => u.id === id)?.name ?? (id === me?.university_id ? 'دانشگاه من' : id));
  const cName = (id: number | null) => (id == null ? '' : companies.data?.find((c) => c.id === id)?.name ?? id);

  const detail = (r: Role): Field[] => [
    { name: 'username', label: 'نام کاربری (انگلیسی، حداقل ۳ حرف)', ltr: true, required: true },
    { name: 'password', label: 'رمز عبور (حداقل ۸ کاراکتر)', type: 'password', required: true },
    { name: 'first_name', label: 'نام' }, { name: 'last_name', label: 'نام خانوادگی' }, { name: 'phone', label: 'تلفن', type: 'tel' },
    ...(r === 'company_admin' ? [{ name: 'transport_company_id', label: 'شرکت حمل‌ونقل', type: 'select' as const, options: (companies.data ?? []).map((c) => ({ value: c.id, label: c.name })), required: true }] : []),
    ...(r !== 'company_admin' && r !== 'super_admin' && isSuper ? [{ name: 'university_id', label: 'دانشگاه', type: 'select' as const, options: uni.options, required: true }] : []),
    ...(r === 'driver' ? [{ name: 'driver_id', label: 'راننده‌ی مربوط', type: 'select' as const, options: (drivers.data ?? []).map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` })), required: true, hint: 'ابتدا راننده را در صفحه‌ی رانندگان تعریف کنید' }] : []),
  ];

  return (<>
    <div className="top"><h1>کاربران</h1>
      <div className="row">
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 180 }}>
          <option value="">همه‌ی نقش‌ها</option>{(Object.keys(ROLE_FA) as Role[]).map((r) => <option key={r} value={r}>{ROLE_FA[r]}</option>)}
        </select>
        <button className="btn" onClick={() => setCreating(true)}>کاربر جدید</button>
      </div></div>
    <Err e={q.error ?? status.error} />
    <Table rows={q.data ?? []} cols={[
      { head: 'نام کاربری', cell: (r) => <span dir="ltr">{r.username}</span> }, { head: 'نام', cell: (r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || '—' },
      { head: 'نقش', cell: (r) => ROLE_FA[r.role] ?? r.role }, { head: 'دانشگاه / شرکت', cell: (r) => (r.transport_company_id ? cName(r.transport_company_id) : uniName(r.university_id)) },
      { head: 'وضعیت', cell: (r) => <>{<Tag on={r.is_active} />}{r.must_change_password && <span className="tag warn" title="باید در ورود بعدی رمز را عوض کند" style={{ marginInlineStart: 6 }}>رمز موقت</span>}</> },
      { head: '', cell: (r) => r.id === me?.id ? <span className="mute">شما</span> : <Acts>
        <button className="btn ghost" onClick={() => setPwUser(r)}>رمز جدید</button>
        <button className="btn ghost" onClick={() => { if (confirm(r.is_active ? 'کاربر غیرفعال شود؟' : 'کاربر فعال شود؟')) status.mutate(r); }}>{r.is_active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button></Acts> }]} />
    <p className="mute" style={{ marginTop: 12 }}>حساب دانشجویان از «بارگذاری گروهی» در صفحه‌ی دانشجویان ساخته می‌شود.{!isSuper && ' تعریف کاربر شرکت فقط با مدیر ارشد سامانه است.'}</p>
    {creating && <RoleStep roles={creatable} onClose={() => setCreating(false)} detail={detail}
      submit={async (r, v) => { await api('POST', '/users/', { json: { ...v, role: r, university_id: r === 'company_admin' || r === 'super_admin' ? null : (v.university_id ?? uni.myUni), transport_company_id: r === 'company_admin' ? v.transport_company_id : null } }); refresh(); }} />}
    {pwUser && <FormModal title={`رمز جدید برای ${pwUser.username}`} onClose={() => setPwUser(null)} submitLabel="تغییر رمز" initial={{}}
      fields={[{ name: 'new_password', label: 'رمز جدید (حداقل ۸ کاراکتر)', type: 'password', required: true }]}
      onSubmit={async (v) => { await api('PATCH', `/users/${pwUser.id}/password`, { json: { new_password: v.new_password } }); }} />}
  </>);
}

/** دو مرحله: انتخاب نقش، سپس فرم مخصوص همان نقش */
function RoleStep({ roles, detail, submit, onClose }: { roles: Role[]; detail: (r: Role) => Field[]; submit: (r: Role, v: Record<string, unknown>) => Promise<void>; onClose: () => void }) {
  const [picked, setPicked] = useState<Role | null>(null);
  if (!picked) return (
    <Modal title="کاربر جدید — انتخاب نقش" onClose={onClose}>
      <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        {roles.map((r) => <button key={r} className="btn ghost" onClick={() => setPicked(r)}>{ROLE_FA[r]}</button>)}
      </div>
    </Modal>);
  return <FormModal title={`کاربر جدید — ${ROLE_FA[picked]}`} fields={detail(picked)} initial={{}} onClose={onClose} onSubmit={(v) => submit(picked, v)} />;
}
