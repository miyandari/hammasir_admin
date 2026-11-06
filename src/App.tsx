import { useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { type Role } from './lib/types';
import { BRAND_NAME } from './lib/brand';
import Icon, { type IconName } from './components/Icon';
import UserBar from './components/UserBar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Universities from './pages/Universities';
import Students from './pages/Students';
import Trips from './pages/Trips';
import Network from './pages/Network';
import LiveMap from './pages/LiveMap';
import Incidents from './pages/Incidents';
import Services from './pages/Services';
import { Companies, Drivers, Vehicles } from './pages/Manage';
import Users from './pages/Users';
import Contracts from './pages/Contracts';
import Finance from './pages/Finance';

interface Item { to: string; label: string; icon: IconName; roles: Role[]; el: JSX.Element; }
const ALL: Role[] = ['super_admin', 'university_admin', 'transport_manager', 'company_admin'];
const UNI: Role[] = ['super_admin', 'university_admin', 'transport_manager'];
const ITEMS: Item[] = [
  { to: '/', icon: 'dashboard', label: 'داشبورد', roles: ALL, el: <Dashboard /> },
  { to: '/universities', icon: 'university', label: 'دانشگاه‌ها', roles: ['super_admin'], el: <Universities /> },
  { to: '/students', icon: 'students', label: 'دانشجویان', roles: ['super_admin', 'university_admin'], el: <Students /> },
  { to: '/users', icon: 'user', label: 'کاربران', roles: ['super_admin', 'university_admin'], el: <Users /> },
  { to: '/companies', icon: 'company', label: 'شرکت‌های حمل‌ونقل', roles: UNI, el: <Companies /> },
  { to: '/contracts', icon: 'contract', label: 'قراردادها', roles: ALL, el: <Contracts /> },
  { to: '/finance', icon: 'finance', label: 'گزارش مالی', roles: ALL, el: <Finance /> },
  { to: '/vehicles', icon: 'bus', label: 'خودروها', roles: ALL, el: <Vehicles /> },
  { to: '/drivers', icon: 'driver', label: 'رانندگان', roles: ALL, el: <Drivers /> },
  { to: '/live', icon: 'live', label: 'نقشه‌ی زنده', roles: ALL, el: <LiveMap /> },
  { to: '/incidents', icon: 'alert', label: 'خرابی‌ها', roles: ALL, el: <Incidents /> },
  { to: '/network', icon: 'route', label: 'مسیرها و ایستگاه‌ها', roles: ['super_admin', 'university_admin', 'transport_manager'], el: <Network /> },
  { to: '/services', icon: 'calendar', label: 'سرویس‌ها', roles: ALL, el: <Services /> },
  { to: '/trips', icon: 'flag', label: 'سفرها', roles: ALL, el: <Trips /> },
];

export default function App() {
  const { me, loading } = useAuth();
  const [open, setOpen] = useState(false);
  if (loading) return <div className="login mute">در حال بارگذاری…</div>;
  if (!me) return <Login />;
  const items = ITEMS.filter((i) => i.roles.includes(me.role));
  return (
    <div className="shell">
      <aside className={`side${open ? ' open' : ''}`}>
        <div className="brand">
          <span className="logo"><Icon name="bus" size={20} /></span><span className="bname">{BRAND_NAME}</span>
          <UserBar className="compact" />
          <button className="iconbtn menubtn" aria-expanded={open} aria-label="منو" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></button>
        </div>
        <div className="sidebody" onClick={() => setOpen(false)}>
          <nav className="nav">{items.map((i) => <NavLink key={i.to} to={i.to} end={i.to === '/'}><Icon name={i.icon} /><span>{i.label}</span></NavLink>)}</nav>
        </div>
      </aside>
      <div className="content">
        <header className="topbar"><UserBar /></header>
        <main className="main">
        <Routes>
          {items.map((i) => <Route key={i.to} path={i.to} element={i.el} />)}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      </div>
    </div>
  );
}
