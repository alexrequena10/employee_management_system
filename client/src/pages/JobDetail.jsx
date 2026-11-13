import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import OptionSelect from '../components/OptionSelect.jsx';
import { CLIENT_NAMES, JOB_TITLES } from '../constants.js';
import { formatJobDate, toDateInputValue } from '../utils/date.js';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [workers, setWorkers] = useState([]);

  function load() {
    setLoading(true);
    api(`/jobs/${id}`)
      .then(({ job: j }) => setJob(j))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function updateJob(fields) {
    setSaving(true);
    setError('');
    try {
      const { job: j } = await api(`/jobs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(fields),
      });
      setJob(j);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function startEdit() {
    setError('');
    try {
      const [hoodsRes, workersRes] = await Promise.all([api('/neighborhoods'), api('/workers')]);
      setNeighborhoods(hoodsRes.neighborhoods);
      setWorkers(workersRes.workers);
      setEditForm({
        title: job.title,
        client_name: job.client_name,
        address: job.address,
        neighborhood_id: String(job.neighborhood_id),
        job_date: toDateInputValue(job.created_at),
        worker_id: job.assignments?.[0] ? String(job.assignments[0].worker_id) : '',
        description: job.description || '',
      });
    } catch (e) {
      setError(e.message);
    }
  }

  function updateEditField(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    const ok = await updateJob({
      ...editForm,
      neighborhood_id: Number(editForm.neighborhood_id),
      worker_id: editForm.worker_id ? Number(editForm.worker_id) : null,
    });
    if (ok) setEditForm(null);
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
          {formatJobDate(job.created_at)}
          {isAdmin && (
            <>
              {' · '}
              {job.sqft ? `${Number(job.sqft).toLocaleString()} sqft` : 'Sqft not set'}
            </>
          )}
        </p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {editForm ? (
        <form className="card" onSubmit={handleSaveEdit}>
          <h3 style={{ marginBottom: '1rem' }}>Edit job</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-title">Job title</label>
              <OptionSelect
                id="edit-title"
                options={JOB_TITLES}
                placeholder="Select job type"
                value={editForm.title}
                onChange={(v) => updateEditField('title', v)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-client">Client name</label>
              <OptionSelect
                id="edit-client"
                options={CLIENT_NAMES}
                placeholder="Select client"
                value={editForm.client_name}
                onChange={(v) => updateEditField('client_name', v)}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-address">Address</label>
              <input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => updateEditField('address', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-neighborhood">Neighborhood</label>
              <select
                id="edit-neighborhood"
                value={editForm.neighborhood_id}
                onChange={(e) => updateEditField('neighborhood_id', e.target.value)}
                required
              >
                {neighborhoods.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row" style={{ alignItems: 'start' }}>
            <div className="form-group">
              <label htmlFor="edit-date">Job date</label>
              <input
                id="edit-date"
                type="date"
                value={editForm.job_date}
                onChange={(e) => updateEditField('job_date', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-worker">Worker</label>
              <select
                id="edit-worker"
                value={editForm.worker_id}
                onChange={(e) => updateEditField('worker_id', e.target.value)}
              >
                <option value="">No worker</option>
                {job.assignments?.[0] &&
                  !workers.some((w) => w.id === job.assignments[0].worker_id) && (
                    <option value={job.assignments[0].worker_id}>
                      {job.assignments[0].worker_name}
                    </option>
                  )}
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <p className="job-meta" style={{ margin: 0 }}>
                Changing the worker resets their payment to Unpaid.
              </p>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="edit-description">Description</label>
            <input
              id="edit-description"
              value={editForm.description}
              onChange={(e) => updateEditField('description', e.target.value)}
              placeholder="Optional job notes"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => setEditForm(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div style={{ marginBottom: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={startEdit}>
            Edit job
          </button>
        </div>
      )}

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

      {isAdmin && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Square footage & worker rate</h3>
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
        </div>
      )}

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
