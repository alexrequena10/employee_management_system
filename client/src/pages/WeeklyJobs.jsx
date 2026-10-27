import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatJobDate, parseDate } from '../utils/date.js';

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    (cents || 0) / 100
  );
}

function formatRange(start) {
  const end = addDays(start, 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', {
    ...opts,
    year: 'numeric',
  })}`;
}

export default function WeeklyJobs() {
  const { isAdmin } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/jobs')
      .then(({ jobs: j }) => setJobs(j))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const { workerGroups, unassigned, totalJobs } = useMemo(() => {
    const weekEnd = addDays(weekStart, 7);
    const weekJobs = jobs
      .filter((job) => {
        if (job.status === 'cancelled') return false;
        const date = parseDate(job.created_at);
        return date >= weekStart && date < weekEnd;
      })
      .sort((a, b) => parseDate(a.created_at) - parseDate(b.created_at));

    const groups = new Map();
    const noWorker = [];
    for (const job of weekJobs) {
      if (!job.assignments?.length) {
        noWorker.push(job);
        continue;
      }
      for (const assignment of job.assignments) {
        if (!groups.has(assignment.worker_id)) {
          groups.set(assignment.worker_id, {
            id: assignment.worker_id,
            name: assignment.worker_name,
            rows: [],
          });
        }
        groups.get(assignment.worker_id).rows.push({ job, assignment });
      }
    }

    return {
      workerGroups: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name)),
      unassigned: noWorker,
      totalJobs: weekJobs.length,
    };
  }, [jobs, weekStart]);

  function changeWeek(days) {
    setWeekStart((prev) => addDays(prev, days));
  }

  function pickDate(value) {
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    setWeekStart(startOfWeek(new Date(y, m - 1, d)));
  }

  return (
    <>
      <header className="page-title">
        <h2>Weekly jobs</h2>
        <p>
          Week of {formatRange(weekStart)} · {totalJobs} job{totalJobs === 1 ? '' : 's'}
        </p>
      </header>

      <div className="week-controls no-print">
        <button type="button" className="btn btn-secondary" onClick={() => changeWeek(-7)}>
          ← Previous week
        </button>
        <input
          type="date"
          aria-label="Choose a day in the week"
          value={toInputValue(weekStart)}
          onChange={(e) => pickDate(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" onClick={() => changeWeek(7)}>
          Next week →
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setWeekStart(startOfWeek(new Date()))}
        >
          This week
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="loading">Loading jobs…</p>}

      {!loading && !error && totalJobs === 0 && (
        <p className="empty-state">No jobs this week.</p>
      )}

      {workerGroups.map((group) => {
        const sqft = group.rows.reduce((s, r) => s + (Number(r.job.sqft) || 0), 0);
        const payCents = group.rows.reduce(
          (s, r) => s + (r.assignment.worker_amount_cents || 0),
          0
        );
        return (
          <div key={group.id} className="card table-scroll">
            <div className="week-worker-header">
              <h3>{group.name}</h3>
              <span className="job-meta">
                {group.rows.length} job{group.rows.length === 1 ? '' : 's'} ·{' '}
                {sqft.toLocaleString()} sqft
                {isAdmin && (
                  <>
                    {' · '}
                    <strong>{formatCurrency(payCents)}</strong>
                  </>
                )}
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Job</th>
                  <th>Address</th>
                  <th>Client</th>
                  <th>Sqft</th>
                  {isAdmin && <th>Pay</th>}
                  <th>Worker paid</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map(({ job, assignment }) => (
                  <tr key={assignment.id}>
                    <td>{formatJobDate(job.created_at)}</td>
                    <td>
                      <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                    </td>
                    <td>{job.address}</td>
                    <td>{job.client_name}</td>
                    <td>{job.sqft ? Number(job.sqft).toLocaleString() : '—'}</td>
                    {isAdmin && <td>{assignment.worker_amount || '—'}</td>}
                    <td>
                      <StatusBadge
                        paid={assignment.worker_paid}
                        label={assignment.worker_payment_status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="card table-scroll">
          <div className="week-worker-header">
            <h3>No worker assigned</h3>
            <span className="job-meta">
              {unassigned.length} job{unassigned.length === 1 ? '' : 's'}
            </span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Job</th>
                <th>Address</th>
                <th>Client</th>
                <th>Sqft</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map((job) => (
                <tr key={job.id}>
                  <td>{formatJobDate(job.created_at)}</td>
                  <td>
                    <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                  </td>
                  <td>{job.address}</td>
                  <td>{job.client_name}</td>
                  <td>{job.sqft ? Number(job.sqft).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
