import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <div className="brand">
          <h1>Worker Management</h1>
          <span className="role-badge">{isAdmin ? 'Admin' : 'Assistant'}</span>
        </div>
        <nav className="nav-links">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/neighborhoods">By Neighborhood</NavLink>
          <NavLink to="/workers">By Worker</NavLink>
        </nav>
        <div className="header-actions">
          <span>{user?.username}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
