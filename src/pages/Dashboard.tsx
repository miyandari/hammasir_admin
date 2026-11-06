import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Contract, Driver, Student, Trip, Vehicle } from '../lib/types';
import { Err } from '../components/ui';
import Icon from '../components/Icon';
import { BRAND_NAME, BRAND_SLOGAN } from '../lib/brand';

const today = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const { me } = useAuth();
  const canStudents = me?.role === 'super_admin' || me?.role === 'university_admin' || me?.role === 'transport_manager';
  const q = useQuery({
    queryKey: ['dash'],
    queryFn: async () => {
      const [trips, vehicles, drivers, contracts, students] = await Promise.all([
        get<Trip[]>('/trips/', { trip_date: today() }),
        get<Vehicle[]>('/vehicles/', { is_active: true }),
        get<Driver[]>('/drivers/', { is_active: true }),
        get<Contract[]>('/contracts/', { is_active: true }),
        canStudents ? get<Student[]>('/students/', { is_active: true }) : Promise.resolve(null),
      ]);
      const by = (s: string) => trips.filter((t) => t.status === s).length;
      return { trips: trips.length, live: by('in_progress') + by('boarding'), done: by('completed'), cancelled: by('cancelled'),
        vehicles: vehicles.length, drivers: drivers.length, contracts: contracts.length, students: students?.length ?? null };
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
    <h3 className="mute" style={{ fontWeight: 500 }}>سفرهای امروز</h3>
    <div className="grid">
      <S n={d?.trips} l="کل سفرهای امروز" /><S n={d?.live} l="در حال انجام / سوار شدن" /><S n={d?.done} l="انجام‌شده" /><S n={d?.cancelled} l="لغوشده" />
    </div>
    <h3 className="mute" style={{ fontWeight: 500, marginTop: 24 }}>منابع</h3>
    <div className="grid">
      {canStudents && <S n={d?.students} l="دانشجوی فعال" />}<S n={d?.vehicles} l="خودروی فعال" /><S n={d?.drivers} l="راننده‌ی فعال" /><S n={d?.contracts} l="قرارداد فعال" />
    </div>
  </>);
}
