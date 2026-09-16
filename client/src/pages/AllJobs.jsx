import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatJobDate } from '../utils/date.js';

export default function AllJobs() {
  const { isAdmin } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    api('/jobs')
      .then(({ jobs: j }) => setJobs(j))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return jobs;
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  return (
    <>
      <header className="page-title">
        <h2>All jobs</h2>
        <p>Every job with company and worker payment status</p>
      </header>

      <div className="form-row">
        <div className="form-group" style={{ maxWidth: '220px' }}>
          <label htmlFor="status-filter">Filter by status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="loading">Loading jobs…</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="empty-state">No jobs found.</p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="card table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Date</th>
                <th>Sqft</th>
                <th>Neighborhood</th>
                <th>Status</th>
                <th>Company</th>
                <th>Workers</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                    <div className="job-meta">{job.client_name}</div>
                    <div className="job-meta">{job.address}</div>
                  </td>
                  <td>{formatJobDate(job.created_at)}</td>
                  <td>{job.sqft ? Number(job.sqft).toLocaleString() : '—'}</td>
                  <td>{job.neighborhood_name}</td>
                  <td>
                    <span className="status-chip">{job.status}</span>
                  </td>
                  <td>
                    <StatusBadge paid={job.company_paid} label={job.company_payment_status} />
                    {isAdmin && job.company_amount && (
                      <div className="job-meta">{job.company_amount}</div>
                    )}
                  </td>
                  <td>
                    {job.assignments?.length ? (
                      <ul className="worker-payments-list">
                        {job.assignments.map((a) => (
                          <li key={a.id} className="worker-payment-row">
                            <span>{a.worker_name}</span>
                            <StatusBadge
                              paid={a.worker_paid}
                              label={a.worker_payment_status}
                            />
                            {isAdmin && a.worker_amount && (
                              <span className="job-meta">{a.worker_amount}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="job-meta">No workers assigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
