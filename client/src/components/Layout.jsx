import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navSections = [
  {
    label: 'Overview',
    links: [
      { to: '/', end: true, label: 'Dashboard' },
      { to: '/all-jobs', label: 'All Jobs' },
      { to: '/weekly', label: 'Weekly Jobs' },
    ],
  },
  {
    label: 'Jobs',
    links: [
      { to: '/jobs/new', label: 'Add Job' },
      { to: '/neighborhoods', label: 'By Neighborhood' },
    ],
  },
  {
    label: 'Workers',
    links: [
      { to: '/workers', label: 'By Worker' },
      { to: '/workers/manage', label: 'Manage Workers' },
    ],
  },
  {
    label: 'Settings',
    links: [{ to: '/neighborhoods/manage', label: 'Neighborhoods' }],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="app-sidebar no-print">
        <div className="sidebar-brand">
          <h1>A&E Construction</h1>
          <p>Worker Management</p>
        </div>
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.label} className="sidebar-section">
              <span className="sidebar-label">{section.label}</span>
              {section.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `sidebar-link${isActive ? ' active' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user?.username}</span>
            <span className="sidebar-user-role">{user?.role}</span>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
