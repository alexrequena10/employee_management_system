import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function JobDetail() {
  const { id } = useParams();
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
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Company payment (client → company)</h3>
        <p style={{ marginBottom: '0.75rem' }}>
          Status: <StatusBadge paid={job.company_paid} label={job.company_payment_status} />
          {isAdmin && job.company_amount && (
            <span style={{ marginLeft: '0.5rem' }}>Amount: <strong>{job.company_amount}</strong></span>
          )}
        </p>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={saving || job.company_paid}
              onClick={() => updateJob({ company_paid: true })}
            >
              Mark company paid
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              disabled={saving || !job.company_paid}
              onClick={() => updateJob({ company_paid: false })}
            >
              Mark company unpaid
            </button>
          </div>
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

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link to={`/jobs/${id}/invoice`} className="btn btn-primary">
          Generate invoice
        </Link>
      </div>
    </>
  );
}
