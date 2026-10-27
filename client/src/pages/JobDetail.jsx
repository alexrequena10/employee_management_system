import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api(`/jobs/${id}`)
      .then(({ job: j }) => setJob(j))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function updateJob(fields) {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const { job: j } = await api(`/jobs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(fields),
      });
      setJob(j);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateAssignment(assignmentId, fields) {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await api(`/assignments/${assignmentId}`, {
        method: 'PATCH',
        body: JSON.stringify(fields),
      });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeJob() {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      `Remove "${job.title}"? Worker assignments for this job will also be deleted.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      await api(`/jobs/${id}`, { method: 'DELETE' });
      navigate('/', { replace: true });
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="loading">Loading job…</p>;
  if (error && !job) return <div className="error-banner">{error}</div>;
  if (!job) return <p className="empty-state">Job not found.</p>;

  return (
    <>
      <header className="page-title">
        <p style={{ marginBottom: '0.5rem' }}>
          <Link to="/">← Back</Link>
        </p>
        <h2>{job.title}</h2>
        <p>
          {job.address} · {job.neighborhood_name} · Client: {job.client_name}
        </p>
        <p className="job-meta">
          {job.sqft ? `${Number(job.sqft).toLocaleString()} sqft` : 'Sqft not set'}
        </p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Job status</h3>
        {isAdmin ? (
          <div className="form-group" style={{ maxWidth: '200px' }}>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={job.status}
              disabled={saving}
              onChange={(e) => updateJob({ status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        ) : (
          <span className="status-chip">{job.status}</span>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>
          {isAdmin ? 'Square footage & worker rate' : 'Square footage'}
        </h3>
        {isAdmin ? (
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: '200px' }}>
              <label htmlFor="sqft">Sqft</label>
              <input
                id="sqft"
                type="number"
                min="1"
                step="1"
                defaultValue={job.sqft || ''}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val > 0 && val !== Number(job.sqft)) updateJob({ sqft: val });
                }}
              />
            </div>
            <div className="form-group" style={{ maxWidth: '200px' }}>
              <label htmlFor="worker_rate">Worker rate ($/sqft)</label>
              <input
                id="worker_rate"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={job.worker_rate_per_sqft ?? 1.8}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val > 0 && val !== Number(job.worker_rate_per_sqft)) {
                    updateJob({ worker_rate_per_sqft: val });
                  }
                }}
              />
            </div>
            <p className="job-meta" style={{ alignSelf: 'flex-end', marginBottom: '0.55rem' }}>
              Price and worker pay recalculate when sqft or rate changes.
            </p>
          </div>
        ) : (
          <p>{job.sqft ? `${Number(job.sqft).toLocaleString()} sqft` : '—'}</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Worker payments</h3>
        {job.assignments?.length === 0 && (
          <p className="empty-state">No workers assigned to this job.</p>
        )}
        <div className="job-list">
          {job.assignments?.map((a) => (
            <article key={a.id} className="job-card">
              <div className="job-card-header">
                <div>
                  <h3>{a.worker_name}</h3>
                  {isAdmin && a.worker_amount && (
                    <p className="job-meta">Pay: {a.worker_amount}</p>
                  )}
                </div>
                <StatusBadge paid={a.worker_paid} label={a.worker_payment_status} />
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={saving || a.worker_paid}
                    onClick={() => updateAssignment(a.id, { worker_paid: true })}
                  >
                    Mark paid
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={saving || !a.worker_paid}
                    onClick={() => updateAssignment(a.id, { worker_paid: false })}
                  >
                    Mark unpaid
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Link to={`/jobs/${id}/invoice`} className="btn btn-primary">
          Generate invoice
        </Link>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-danger"
            disabled={saving}
            onClick={removeJob}
          >
            Remove job
          </button>
        )}
      </div>
    </>
  );
}
