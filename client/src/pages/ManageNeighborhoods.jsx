import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ManageNeighborhoods() {
  const { isAdmin } = useAuth();
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadNeighborhoods = useCallback(() => {
    setLoading(true);
    api('/neighborhoods')
      .then(({ neighborhoods: n }) => setNeighborhoods(n))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadNeighborhoods();
  }, [loadNeighborhoods]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api('/neighborhoods', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setName('');
      setNotice('Neighborhood added.');
      loadNeighborhoods();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(neighborhood) {
    const active = Number(neighborhood.active_job_count) || 0;
    const total = Number(neighborhood.total_job_count) || 0;
    const archived = total - active;

    let message = `Remove "${neighborhood.name}"? This cannot be undone.`;
    if (archived > 0) {
      message += `\n\nThis will also permanently delete ${archived} completed or cancelled job record(s).`;
    }

    if (!window.confirm(message)) return;

    setError('');
    setNotice('');
    try {
      const result = await api(`/neighborhoods/${neighborhood.id}`, { method: 'DELETE' });
      const extra =
        result.jobs_deleted > 0
          ? ` (${result.jobs_deleted} archived job record(s) removed)`
          : '';
      setNotice(`"${neighborhood.name}" removed.${extra}`);
      loadNeighborhoods();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <header className="page-title">
        <h2>Manage neighborhoods</h2>
        <p>Add new neighborhoods or remove ones with no active jobs</p>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="notice-banner">{notice}</div>}

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Add neighborhood</h3>
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Oak Hills"
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add neighborhood'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Neighborhoods ({neighborhoods.length})</h3>
        {loading && <p className="loading">Loading neighborhoods…</p>}
        {!loading && neighborhoods.length === 0 && (
          <p className="empty-state">No neighborhoods yet. Add one above.</p>
        )}
        {!loading && neighborhoods.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Active jobs</th>
                <th>Total jobs</th>
                {isAdmin && <th />}
              </tr>
            </thead>
            <tbody>
              {neighborhoods.map((n) => {
                const active = Number(n.active_job_count) || 0;
                const total = Number(n.total_job_count) || 0;
                return (
                  <tr key={n.id}>
                    <td>{n.name}</td>
                    <td>{active}</td>
                    <td>{total}</td>
                    {isAdmin && (
                      <td className="table-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemove(n)}
                          disabled={active > 0}
                          title={
                            active > 0
                              ? 'Remove or complete active jobs before deleting this neighborhood'
                              : total > 0
                                ? 'Will also delete completed/cancelled job records'
                                : undefined
                          }
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && neighborhoods.some((n) => (Number(n.active_job_count) || 0) > 0) && (
          <p className="job-meta" style={{ marginTop: '1rem' }}>
            Neighborhoods with active jobs cannot be removed. Completed and cancelled jobs are
            shown in the total count but do not block removal.
          </p>
        )}
      </div>
    </>
  );
}
