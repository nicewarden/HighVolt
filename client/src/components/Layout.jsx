import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, CalendarClock, Wrench, NotebookPen, LogOut, Mail } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';
import PlasmaBridge from './PlasmaBridge.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Organizer', icon: NotebookPen, end: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/safety', label: 'Safety', icon: ShieldCheck },
  { to: '/scheduling', label: 'Scheduling', icon: CalendarClock },
  { to: '/reference', label: 'Reference', icon: Wrench },
  { to: '/email', label: 'Email', icon: Mail },
];

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img src="/logo.jpg" alt="HighVolt AI" className="brand-logo" />
        </div>
        <button className="btn secondary" onClick={logout}>
          <LogOut size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Logout
        </button>
      </header>
      <PlasmaBridge />

      <nav className="app-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="mobile-tab-bar">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
