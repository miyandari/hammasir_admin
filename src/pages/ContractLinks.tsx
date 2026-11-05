import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../lib/api';
import { useDrivers } from '../lib/hooks';
import { VTYPE_FA, type Contract, type Vehicle } from '../lib/types';
import { Err, Modal, Table, Tag } from '../components/ui';

interface Link { id: number; contract_id: number; vehicle_id?: number; driver_id?: number; start_date: string | null; end_date: string | null; is_active: boolean; }

/** مدیریت خودروها و رانندگانِ مجاز یک قرارداد. شرکتِ خودرو از روی «راننده‌ی اصلی» آن تعیین می‌شود. */
export default function ContractLinks({ contract, canEdit, onClose }: { contract: Contract; canEdit: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'vehicles' | 'drivers'>('vehicles');
  return (
    <Modal title={`خودروها و رانندگان — قرارداد ${contract.contract_number}`} onClose={onClose}>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className={`btn ${tab === 'vehicles' ? '' : 'ghost'}`} onClick={() => setTab('vehicles')}>خودروها</button>
        <button className={`btn ${tab === 'drivers' ? '' : 'ghost'}`} onClick={() => setTab('drivers')}>رانندگان</button>
      </div>
      {tab === 'vehicles' ? <Vehicles contract={contract} canEdit={canEdit} /> : <Drivers contract={contract} canEdit={canEdit} />}
    </Modal>
  );
}

function useLinks(kind: 'vehicles' | 'drivers', contract: Contract) {
  const qc = useQueryClient();
  const path = `/contract-${kind}/`;
  const key = [path, contract.id];
  const links = useQuery({ queryKey: key, queryFn: () => get<Link[]>(path, { contract_id: contract.id }) });
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  const add = useMutation({ mutationFn: (id: number) => api('POST', path, { json: { contract_id: contract.id, [kind === 'vehicles' ? 'vehicle_id' : 'driver_id']: id, is_active: true } }), onSuccess: refresh });
  const toggle = useMutation({ mutationFn: (l: Link) => api('PATCH', `${path}${l.id}/status`, { query: { is_active: !l.is_active } }), onSuccess: refresh });
  return { links, add, toggle };
}

function Picker({ options, onAdd, busy, empty }: { options: { value: number; label: string }[]; onAdd: (id: number) => void; busy: boolean; empty: string }) {
  const [v, setV] = useState('');
  if (!options.length) return <p className="mute">{empty}</p>;
  return (
    <div className="row" style={{ marginTop: 12 }}>
      <select value={v} onChange={(e) => setV(e.target.value)} style={{ flex: 1 }}><option value="">— انتخاب برای افزودن —</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      <button className="btn" disabled={!v || busy} onClick={() => { onAdd(Number(v)); setV(''); }}>افزودن</button>
    </div>
  );
}

function Vehicles({ contract, canEdit }: { contract: Contract; canEdit: boolean }) {
  const { links, add, toggle } = useLinks('vehicles', contract);
  const vehicles = useQuery({ queryKey: ['/vehicles/'], queryFn: () => get<Vehicle[]>('/vehicles/') });
  const drivers = useDrivers();
  const dById = new Map((drivers.data ?? []).map((d) => [d.id, d]));
  const vById = new Map((vehicles.data ?? []).map((v) => [v.id, v]));
  const linked = new Set((links.data ?? []).filter((l) => l.is_active).map((l) => l.vehicle_id));
  // مجاز: همان دانشگاه، فعال، و راننده‌ی اصلی‌اش از شرکت قرارداد باشد
  const eligible = (vehicles.data ?? []).filter((v) => v.is_active && v.university_id === contract.university_id && !linked.has(v.id)
    && v.driver_id != null && dById.get(v.driver_id)?.transport_company_id === contract.transport_company_id);
  const noDriver = (vehicles.data ?? []).filter((v) => v.is_active && v.university_id === contract.university_id && v.driver_id == null).length;
  return (<>
    <Err e={links.error ?? add.error ?? toggle.error} />
    <Table rows={links.data ?? []} empty="هنوز خودرویی به این قرارداد وصل نشده." cols={[
      { head: 'پلاک', cell: (l) => <span dir="ltr">{vById.get(l.vehicle_id!)?.plate_number ?? l.vehicle_id}</span> },
      { head: 'نوع', cell: (l) => { const t = vById.get(l.vehicle_id!)?.vehicle_type; return t ? VTYPE_FA[t] ?? t : '—'; } },
      { head: 'وضعیت', cell: (l) => <Tag on={l.is_active} yes="مجاز" no="غیرمجاز" /> },
      ...(canEdit ? [{ head: '', cell: (l: Link) => <button className="btn ghost" disabled={toggle.isPending} onClick={() => toggle.mutate(l)}>{l.is_active ? 'لغو اجازه' : 'فعال‌سازی'}</button> }] : [])]} />
    {canEdit && <Picker busy={add.isPending} onAdd={(id) => add.mutate(id)} empty="خودروی فعال و قابل‌اتصالی نیست."
      options={eligible.map((v) => ({ value: v.id, label: `${v.plate_number} — ${VTYPE_FA[v.vehicle_type] ?? v.vehicle_type}` }))} />}
    {canEdit && !!noDriver && <p className="mute" style={{ fontSize: 12 }}>{noDriver} خودرو چون «راننده‌ی اصلی» ندارند در فهرست نیستند. شرکتِ خودرو از روی راننده‌ی اصلی‌اش تعیین می‌شود.</p>}
  </>);
}

function Drivers({ contract, canEdit }: { contract: Contract; canEdit: boolean }) {
  const { links, add, toggle } = useLinks('drivers', contract);
  const drivers = useDrivers();
  const dById = new Map((drivers.data ?? []).map((d) => [d.id, d]));
  const linked = new Set((links.data ?? []).filter((l) => l.is_active).map((l) => l.driver_id));
  const eligible = (drivers.data ?? []).filter((d) => d.is_active && d.university_id === contract.university_id && d.transport_company_id === contract.transport_company_id && !linked.has(d.id));
  return (<>
    <Err e={links.error ?? add.error ?? toggle.error} />
    <Table rows={links.data ?? []} empty="هنوز راننده‌ای به این قرارداد وصل نشده." cols={[
      { head: 'راننده', cell: (l) => { const d = dById.get(l.driver_id!); return d ? `${d.first_name} ${d.last_name}` : l.driver_id; } },
      { head: 'وضعیت', cell: (l) => <Tag on={l.is_active} yes="مجاز" no="غیرمجاز" /> },
      ...(canEdit ? [{ head: '', cell: (l: Link) => <button className="btn ghost" disabled={toggle.isPending} onClick={() => toggle.mutate(l)}>{l.is_active ? 'لغو اجازه' : 'فعال‌سازی'}</button> }] : [])]} />
    {canEdit && <Picker busy={add.isPending} onAdd={(id) => add.mutate(id)} empty="راننده‌ی فعال و قابل‌اتصالی نیست (راننده باید از شرکت و دانشگاه همین قرارداد باشد)."
      options={eligible.map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` }))} />}
  </>);
}
