import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = { first_name: '', last_name: '', email: '', phone: '' };

export default function ManageWorkers() {
  const { isAdmin } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadWorkers = useCallback(() => {
    setLoading(true);
    api('/workers?active=false')
      .then(({ workers: w }) => setWorkers(w))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateEditField(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit(worker) {
    setEditingId(worker.id);
    setEditForm({
      first_name: worker.first_name,
      last_name: worker.last_name,
      email: worker.email || '',
      phone: worker.phone || '',
    });
    setError('');
    setNotice('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api('/workers', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm(emptyForm);
      setNotice('Worker added.');
      loadWorkers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit(workerId) {
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api(`/workers/${workerId}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      setEditingId(null);
      setEditForm(emptyForm);
      setNotice('Worker updated.');
      loadWorkers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(worker) {
    const confirmed = window.confirm(
      `Remove ${worker.name}? Workers with job history will be deactivated instead of deleted.`
    );
    if (!confirmed) return;

    setError('');
    setNotice('');
    try {
      const result = await api(`/workers/${worker.id}`, { method: 'DELETE' });
      setNotice(result.message || `${worker.name} removed.`);
      loadWorkers();
    } catch (err) {
      setError(err.message);
    }
  }

  const activeWorkers = workers.filter((w) => w.active);
  const inactiveWorkers = workers.filter((w) => !w.active);

  return (
    <>
      <header className="page-title">
        <h2>Manage workers</h2>
        <p>Add workers, update their details, or remove them from the roster</p>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="notice-banner">{notice}</div>}

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Add worker</h3>
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First name</label>
              <input
                id="first_name"
                value={form.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="last_name">Last name</label>
              <input
                id="last_name"
                value={form.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add worker'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Active workers ({activeWorkers.length})</h3>
        {loading && <p className="loading">Loading workers…</p>}
        {!loading && activeWorkers.length === 0 && (
          <p className="empty-state">No active workers. Add one above.</p>
        )}
        {!loading && activeWorkers.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {activeWorkers.map((w) =>
                editingId === w.id ? (
                  <tr key={w.id}>
                    <td>
                      <div className="form-row" style={{ marginBottom: 0 }}>
                        <input
                          aria-label="First name"
                          value={editForm.first_name}
                          onChange={(e) => updateEditField('first_name', e.target.value)}
                          required
                        />
                        <input
                          aria-label="Last name"
                          value={editForm.last_name}
                          onChange={(e) => updateEditField('last_name', e.target.value)}
                          required
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        aria-label="Email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => updateEditField('email', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label="Phone"
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => updateEditField('phone', e.target.value)}
                      />
                    </td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={submitting || !editForm.first_name.trim() || !editForm.last_name.trim()}
                        onClick={() => handleSaveEdit(w.id)}
                      >
                        Save
                      </button>{' '}
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        disabled={submitting}
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={w.id}>
                    <td>{w.name}</td>
                    <td>{w.email || '—'}</td>
                    <td>{w.phone || '—'}</td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => startEdit(w)}
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <>
                          {' '}
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRemove(w)}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>

      {inactiveWorkers.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.5rem' }}>Inactive workers ({inactiveWorkers.length})</h3>
          <p className="job-meta" style={{ marginBottom: '1rem' }}>
            Deactivated workers keep job history but no longer appear in job assignment lists.
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {inactiveWorkers.map((w) =>
                editingId === w.id ? (
                  <tr key={w.id}>
                    <td>
                      <div className="form-row" style={{ marginBottom: 0 }}>
                        <input
                          aria-label="First name"
                          value={editForm.first_name}
                          onChange={(e) => updateEditField('first_name', e.target.value)}
                          required
                        />
                        <input
                          aria-label="Last name"
                          value={editForm.last_name}
                          onChange={(e) => updateEditField('last_name', e.target.value)}
                          required
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        aria-label="Email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => updateEditField('email', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label="Phone"
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => updateEditField('phone', e.target.value)}
                      />
                    </td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={submitting || !editForm.first_name.trim() || !editForm.last_name.trim()}
                        onClick={() => handleSaveEdit(w.id)}
                      >
                        Save
                      </button>{' '}
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        disabled={submitting}
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={w.id}>
                    <td>{w.name}</td>
                    <td>{w.email || '—'}</td>
                    <td>{w.phone || '—'}</td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => startEdit(w)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
