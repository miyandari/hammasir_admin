import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { TRIP_STATUS_FA, type Company, type Driver, type Trip, type Vehicle } from '../lib/types';
import { Err, Table, Tag, type Col } from '../components/ui';

function List<T>({ title, path, query, cols }: { title: string; path: string; query?: Record<string, string | number>; cols: Col<T>[] }) {
  const q = useQuery({ queryKey: [path, query], queryFn: () => get<T[]>(path, query) });
  return (<>
    <div className="top"><h1>{title}</h1><span className="mute">{q.data ? `${q.data.length} مورد` : ''}</span></div>
    <Err e={q.error} />
    <Table rows={q.data ?? []} cols={cols} />
  </>);
}
const day = (s: string) => new Date(s).toLocaleDateString('fa-IR');
const hm = (s: string | null) => (s ? new Date(s).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '—');

export const Companies = () => <List<Company> title="شرکت‌های حمل‌ونقل" path="/transport-companies/" cols={[
  { head: 'نام', cell: (r) => r.name }, { head: 'شماره ثبت', cell: (r) => r.registration_number ?? '—' },
  { head: 'تلفن', cell: (r) => <span dir="ltr">{r.phone ?? '—'}</span> }, { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> }]} />;

export const Vehicles = () => <List<Vehicle> title="خودروها" path="/vehicles/" cols={[
  { head: 'پلاک', cell: (r) => <span dir="ltr">{r.plate_number}</span> }, { head: 'نوع', cell: (r) => r.vehicle_type },
  { head: 'ظرفیت', cell: (r) => r.capacity }, { head: 'راننده', cell: (r) => r.driver_id ?? '—' }, { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> }]} />;

export const Drivers = () => <List<Driver> title="رانندگان" path="/drivers/" cols={[
  { head: 'نام', cell: (r) => `${r.first_name} ${r.last_name}` }, { head: 'تلفن', cell: (r) => <span dir="ltr">{r.phone}</span> },
  { head: 'گواهینامه', cell: (r) => r.license_number ?? '—' }, { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> }]} />;

export const Trips = () => <List<Trip> title="سفرها" path="/trips/" cols={[
  { head: 'شناسه', cell: (r) => r.id }, { head: 'تاریخ', cell: (r) => day(r.trip_date) }, { head: 'برنامه', cell: (r) => hm(r.planned_departure_time) },
  { head: 'حرکت واقعی', cell: (r) => hm(r.actual_departure_time) }, { head: 'پایان', cell: (r) => hm(r.actual_arrival_time) },
  { head: 'وضعیت', cell: (r) => <span className={`tag ${r.status === 'completed' ? 'ok' : r.status === 'cancelled' ? 'bad' : r.status === 'scheduled' ? '' : 'warn'}`}>{TRIP_STATUS_FA[r.status] ?? r.status}</span> }]} />;
