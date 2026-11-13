import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatJobDate, parseDate, toDateInputValue } from '../utils/date.js';

function searchText(job) {
  const date = job.created_at ? parseDate(job.created_at) : null;
  return [
    date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-US') : '',
    job.neighborhood_name,
    job.address,
    job.title,
    job.client_name,
    ...(job.assignments || []).map((a) => a.worker_name),
    formatJobDate(job.created_at),
    toDateInputValue(job.created_at),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function AllJobs() {
  const { isAdmin } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api('/jobs')
      .then(({ jobs: j }) => setJobs(j))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter(
      (j) =>
        (statusFilter === 'all' || j.status === statusFilter) &&
        (!query || searchText(j).includes(query))
    );
  }, [jobs, statusFilter, search]);

  return (
    <>
      <header className="page-title">
        <h2>All jobs</h2>
        <p>Every job with worker payment status</p>
      </header>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="job-search">Search</label>
          <input
            id="job-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Neighborhood, name, street, or date"
          />
        </div>
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
