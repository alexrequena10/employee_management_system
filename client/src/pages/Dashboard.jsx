import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatJobDate } from '../utils/date.js';

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!isAdmin) return;
    api('/notifications')
      .then(({ notifications: n }) => setNotifications(n))
      .catch(console.error);
  }, [isAdmin]);

  async function markSeen(jobIds) {
    setNotifications((prev) => (jobIds ? prev.filter((n) => !jobIds.includes(n.id)) : []));
    try {
      await api('/notifications/seen', {
        method: 'POST',
        body: JSON.stringify(jobIds ? { job_ids: jobIds } : {}),
      });
    } catch (e) {
      console.error(e);
    }
  }

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
          <Link to="/jobs/new" className="btn btn-primary">Add job</Link>
          <Link to="/all-jobs" className="btn btn-primary">All jobs</Link>
          <Link to="/neighborhoods" className="btn btn-secondary">Browse by neighborhood</Link>
          <Link to="/workers" className="btn btn-secondary">Browse by worker</Link>
        </div>
      </div>

      {isAdmin && notifications.length > 0 && (
        <div className="card notification-card">
          <div className="notification-header">
            <h3>
              {notifications.length} new job{notifications.length === 1 ? '' : 's'} added
            </h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => markSeen(null)}>
              Mark all as seen
            </button>
          </div>
          <ul className="notification-list">
            {notifications.map((n) => (
              <li key={n.id}>
                <div>
                  <Link to={`/jobs/${n.id}`}>{n.title}</Link>
                  <div className="job-meta">
                    {n.address} · {n.neighborhood_name} · {n.client_name} ·{' '}
                    {formatJobDate(n.created_at)}
                    {n.created_by && ` · Added by ${n.created_by}`}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => markSeen([n.id])}
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
