import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/jobs?status=active'),
      api('/workers'),
      api('/neighborhoods'),
    ])
      .then(([jobsRes, workersRes, hoodsRes]) => {
        const jobs = jobsRes.jobs;
        const unpaidCompany = jobs.filter((j) => !j.company_paid).length;
        const unpaidWorkers = jobs.reduce(
          (n, j) => n + (j.assignments?.filter((a) => !a.worker_paid).length || 0),
          0
        );
        setStats({
          activeJobs: jobs.length,
          workers: workersRes.workers.length,
          neighborhoods: hoodsRes.neighborhoods.length,
          unpaidCompany,
          unpaidWorkers,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Loading dashboard…</p>;

  return (
    <>
      <header className="page-title">
        <h2>Dashboard</h2>
        <p>Overview of active jobs and payment status</p>
      </header>

      <div className="card-grid">
        <div className="stat-card">
          <div className="label">Active jobs</div>
          <div className="value">{stats.activeJobs}</div>
        </div>
        <div className="stat-card">
          <div className="label">Workers</div>
          <div className="value">{stats.workers}</div>
        </div>
        <div className="stat-card">
          <div className="label">Neighborhoods</div>
          <div className="value">{stats.neighborhoods}</div>
        </div>
        <div className="stat-card">
          <div className="label">Unpaid (company)</div>
          <div className="value">{stats.unpaidCompany}</div>
        </div>
        <div className="stat-card">
          <div className="label">Unpaid (workers)</div>
          <div className="value">{stats.unpaidWorkers}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Quick actions</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <Link to="/neighborhoods" className="btn btn-primary">Browse by neighborhood</Link>
          <Link to="/workers" className="btn btn-secondary">Browse by worker</Link>
        </div>
        {!isAdmin && (
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            You are signed in as an assistant. Payment amounts are hidden; you can view Paid/Unpaid status only.
          </p>
        )}
      </div>
    </>
  );
}
