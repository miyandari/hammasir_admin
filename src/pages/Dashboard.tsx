import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Contract, Driver, Incident, Student, Trip, Vehicle } from '../lib/types';
import { Err } from '../components/ui';
import Icon from '../components/Icon';
import { BRAND_NAME, BRAND_SLOGAN } from '../lib/brand';
import { showJalali, todayIso } from '../components/JalaliDate';

const DAY = 86400000;
const EXPIRY_DAYS = 30;
const daysLeft = (end: string) => Math.round((new Date(end + 'T00:00:00').getTime() - new Date(todayIso() + 'T00:00:00').getTime()) / DAY);

export default function Dashboard() {
  const { me } = useAuth();
  const canStudents = me?.role === 'super_admin' || me?.role === 'university_admin' || me?.role === 'transport_manager';
  const q = useQuery({
    queryKey: ['dash'],
    queryFn: async () => {
      const [trips, vehicles, drivers, contracts, students, incidents] = await Promise.all([
        get<Trip[]>('/trips/', { trip_date: todayIso() }),
        get<Vehicle[]>('/vehicles/', { is_active: true }),
        get<Driver[]>('/drivers/', { is_active: true }),
        get<Contract[]>('/contracts/', { is_active: true }),
        canStudents ? get<Student[]>('/students/', { is_active: true }) : Promise.resolve(null),
        get<Incident[]>('/trip-incidents/', { is_resolved: false }).catch(() => null), // خطای این کارت نباید کل داشبورد را خراب کند
      ]);
      const by = (s: string) => trips.filter((t) => t.status === s).length;
      return { trips: trips.length, live: by('in_progress') + by('boarding'), done: by('completed'), cancelled: by('cancelled'),
        vehicles: vehicles.length, drivers: drivers.length, contracts: contracts.length, students: students?.length ?? null,
        incidents: incidents ? incidents.length : null,
        unassigned: trips.filter((t) => t.status === 'scheduled' && (!t.driver_id || !t.vehicle_id)).length,
        expiring: contracts.map((c) => ({ c, left: daysLeft(c.end_date) })).filter((x) => x.left <= EXPIRY_DAYS).sort((a, b) => a.left - b.left) };
    },
    refetchInterval: 30000,
  });
  const d = q.data;
  const S = ({ n, l }: { n: number | null | undefined; l: string }) => <div className="card stat"><b>{n ?? '—'}</b><span>{l}</span></div>;
  return (<>
    <div className="hero">
      <div className="logo"><Icon name="bus" size={30} /></div>
      <div><h2>{BRAND_NAME}</h2><p>{BRAND_SLOGAN}</p></div>
    </div>
    <div className="top"><h1>داشبورد</h1></div>
    <Err e={q.error} />
    <h3 className="mute" style={{ fontWeight: 500 }}>نیازمند توجه</h3>
    <div className="grid">
      <Link to="/incidents" className={`card stat alertcard ${d?.incidents ? 'warn' : ''}`}><b>{d?.incidents ?? '—'}</b><span>خرابی باز (حل‌نشده)</span></Link>
      <Link to="/trips" className={`card stat alertcard ${d?.unassigned ? 'warn' : ''}`}><b>{d?.unassigned ?? '—'}</b><span>سفر امروز بدون راننده یا خودرو</span></Link>
      <Link to="/contracts" className={`card stat alertcard ${d?.expiring.length ? 'warn' : ''}`}><b>{d?.expiring.length ?? '—'}</b><span>قرارداد منقضی یا تا {EXPIRY_DAYS} روز دیگر پایان می‌یابد</span></Link>
    </div>
    {!!d?.expiring.length && <div className="card" style={{ marginTop: 12 }}>
      {d.expiring.map(({ c, left }) => (
        <div key={c.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
          <span>قرارداد <span dir="ltr">{c.contract_number}</span> · پایان {showJalali(c.end_date)}</span>
          <span className={`tag ${left < 0 ? 'bad' : 'warn'}`}>{left < 0 ? `${Math.abs(left).toLocaleString('fa-IR')} روز از پایان گذشته` : left === 0 ? 'امروز تمام می‌شود' : `${left.toLocaleString('fa-IR')} روز مانده`}</span>
        </div>
      ))}
    </div>}
    <h3 className="mute" style={{ fontWeight: 500, marginTop: 24 }}>سفرهای امروز</h3>
    <div className="grid">
      <S n={d?.trips} l="کل سفرهای امروز" /><S n={d?.live} l="در حال انجام / سوار شدن" /><S n={d?.done} l="انجام‌شده" /><S n={d?.cancelled} l="لغوشده" />
    </div>
    <h3 className="mute" style={{ fontWeight: 500, marginTop: 24 }}>منابع</h3>
    <div className="grid">
      {canStudents && <S n={d?.students} l="دانشجوی فعال" />}<S n={d?.vehicles} l="خودروی فعال" /><S n={d?.drivers} l="راننده‌ی فعال" /><S n={d?.contracts} l="قرارداد فعال" />
    </div>
  </>);
}
