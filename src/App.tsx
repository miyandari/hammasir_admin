import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { ROLE_FA, type Role } from './lib/types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Universities from './pages/Universities';
import Students from './pages/Students';
import { Trips } from './pages/Lists';
import { Companies, Drivers, Vehicles } from './pages/Manage';
import Users from './pages/Users';
import Contracts from './pages/Contracts';
import Finance from './pages/Finance';

interface Item { to: string; label: string; roles: Role[]; el: JSX.Element; }
const ALL: Role[] = ['super_admin', 'university_admin', 'transport_manager', 'company_admin'];
const UNI: Role[] = ['super_admin', 'university_admin', 'transport_manager'];
const ITEMS: Item[] = [
  { to: '/', label: 'داشبورد', roles: ALL, el: <Dashboard /> },
  { to: '/universities', label: 'دانشگاه‌ها', roles: ['super_admin'], el: <Universities /> },
  { to: '/students', label: 'دانشجویان', roles: ['super_admin', 'university_admin'], el: <Students /> },
  { to: '/users', label: 'کاربران', roles: ['super_admin', 'university_admin'], el: <Users /> },
  { to: '/companies', label: 'شرکت‌های حمل‌ونقل', roles: UNI, el: <Companies /> },
  { to: '/contracts', label: 'قراردادها', roles: ALL, el: <Contracts /> },
  { to: '/finance', label: 'گزارش مالی', roles: ALL, el: <Finance /> },
  { to: '/vehicles', label: 'خودروها', roles: ALL, el: <Vehicles /> },
  { to: '/drivers', label: 'رانندگان', roles: ALL, el: <Drivers /> },
  { to: '/trips', label: 'سفرها', roles: ALL, el: <Trips /> },
];

export default function App() {
  const { me, loading, logout } = useAuth();
  if (loading) return <div className="login mute">در حال بارگذاری…</div>;
  if (!me) return <Login />;
  const items = ITEMS.filter((i) => i.roles.includes(me.role));
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">هم‌مسیر</div>
        <nav className="nav">{items.map((i) => <NavLink key={i.to} to={i.to} end={i.to === '/'}>{i.label}</NavLink>)}</nav>
        <div style={{ marginTop: 24, padding: '0 10px' }}>
          <div>{[me.first_name, me.last_name].filter(Boolean).join(' ') || me.username}</div>
          <div className="mute" style={{ fontSize: 12, marginBottom: 8 }}>{ROLE_FA[me.role]}</div>
          <button className="btn ghost" onClick={logout}>خروج</button>
        </div>
      </aside>
      <main className="main">
        <Routes>
          {items.map((i) => <Route key={i.to} path={i.to} element={i.el} />)}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
