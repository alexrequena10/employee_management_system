import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { DEFAULT_WORKER_RATE_PER_SQFT, formatWorkerPay } from '../constants.js';

const emptyForm = {
  title: '',
  address: '',
  neighborhood_id: '',
  client_name: '',
  description: '',
  status: 'active',
  sqft: '',
  worker_rate_per_sqft: String(DEFAULT_WORKER_RATE_PER_SQFT),
  company_paid: false,
};

const emptyBulkRow = () => ({
  title: '',
  address: '',
  sqft: '',
  description: '',
  worker_id: '',
});

export default function AddJob() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('single');
  const [form, setForm] = useState(emptyForm);
  const [bulkRows, setBulkRows] = useState([emptyBulkRow(), emptyBulkRow()]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const rate = Number(form.worker_rate_per_sqft) || DEFAULT_WORKER_RATE_PER_SQFT;

  const calculatedPay = useMemo(() => formatWorkerPay(form.sqft, rate), [form.sqft, rate]);

  useEffect(() => {
    Promise.all([api('/neighborhoods'), api('/workers')])
      .then(([hoodsRes, workersRes]) => {
        setNeighborhoods(hoodsRes.neighborhoods);
        setWorkers(workersRes.workers);
        if (hoodsRes.neighborhoods.length) {
          setForm((prev) => ({
            ...prev,
            neighborhood_id: String(hoodsRes.neighborhoods[0].id),
          }));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateBulkRow(index, field, value) {
    setBulkRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addBulkRow() {
    setBulkRows((prev) => [...prev, emptyBulkRow()]);
  }

  function removeBulkRow(index) {
    setBulkRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'single') {
        const { job } = await api('/jobs', {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            worker_id: selectedWorkerId || null,
          }),
        });
        navigate(`/jobs/${job.id}`);
        return;
      }

      const defaults = {
        neighborhood_id: form.neighborhood_id,
        client_name: form.client_name,
        status: form.status,
        worker_rate_per_sqft: form.worker_rate_per_sqft,
        company_paid: form.company_paid,
      };

      const jobs = bulkRows
        .filter((row) => row.title.trim() || row.address.trim() || row.sqft)
        .map((row) => ({
          title: row.title,
          address: row.address,
          sqft: row.sqft,
          description: row.description,
          worker_id: row.worker_id || null,
        }));

      if (jobs.length === 0) {
        throw new Error('Add at least one job with title, address, and square footage');
      }

      const { jobs: created, errors: bulkErrors } = await api('/jobs/bulk', {
        method: 'POST',
        body: JSON.stringify({ defaults, jobs }),
      });

      if (bulkErrors?.length) {
        setError(
          `Created ${created.length} job(s). Row errors: ${bulkErrors
            .map((e) => `#${e.index + 1}: ${e.error}`)
            .join('; ')}`
        );
      }

      if (created.length === 1) {
        navigate(`/jobs/${created[0].id}`);
      } else {
        navigate('/all-jobs');
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (loading) return <p className="loading">Loading form…</p>;

  return (
    <>
      <header className="page-title">
        <h2>Add job{mode === 'multiple' ? 's' : ''}</h2>
        <p>
          {mode === 'single'
            ? 'Create a job, assign one worker, and review the price from the worker rate'
            : 'Create several jobs and assign a different worker to each one'}
        </p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {neighborhoods.length === 0 && (
        <div className="error-banner">
          Add a neighborhood first before creating jobs.
        </div>
      )}

      <div className="mode-toggle no-print" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={`btn ${mode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('single')}
        >
          Single job
        </button>
        <button
          type="button"
          className={`btn ${mode === 'multiple' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('multiple')}
        >
          Multiple jobs
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>
            {mode === 'single' ? 'Job details' : 'Shared settings'}
          </h3>
          {mode === 'single' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="title">Job title</label>
                <input
                  id="title"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g. Kitchen remodel"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="client_name">Client name</label>
                <input
                  id="client_name"
                  value={form.client_name}
                  onChange={(e) => updateField('client_name', e.target.value)}
                  required
                />
              </div>
            </div>
          )}
          {mode === 'multiple' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="client_name">Client name (all jobs)</label>
                <input
                  id="client_name"
                  value={form.client_name}
                  onChange={(e) => updateField('client_name', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="neighborhood_id">Neighborhood (all jobs)</label>
                <select
                  id="neighborhood_id"
                  value={form.neighborhood_id}
                  onChange={(e) => updateField('neighborhood_id', e.target.value)}
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
          )}
          {mode === 'single' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input
                  id="address"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="142 Oak Lane"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="neighborhood_id">Neighborhood</label>
                <select
                  id="neighborhood_id"
                  value={form.neighborhood_id}
                  onChange={(e) => updateField('neighborhood_id', e.target.value)}
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
          )}
          <div className="form-row cols-3">
            {mode === 'single' && (
              <div className="form-group">
                <label htmlFor="sqft">Square footage</label>
                <input
                  id="sqft"
                  type="number"
                  min="1"
                  step="1"
                  value={form.sqft}
                  onChange={(e) => updateField('sqft', e.target.value)}
                  placeholder="e.g. 1200"
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="worker_rate_per_sqft">Worker rate ($/sqft)</label>
              <input
                id="worker_rate_per_sqft"
                type="number"
                min="0.01"
                step="0.01"
                value={form.worker_rate_per_sqft}
                onChange={(e) => updateField('worker_rate_per_sqft', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          {mode === 'single' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="worker_id">Worker</label>
                  <select
                    id="worker_id"
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                  >
                    <option value="">No worker</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="price">Price</label>
                  <input
                    id="price"
                    value={form.sqft && Number(form.sqft) > 0 ? calculatedPay : ''}
                    placeholder="Enter square footage"
                    readOnly
                  />
                  <p className="job-meta">
                    {form.sqft && Number(form.sqft) > 0
                      ? `${Number(form.sqft).toLocaleString()} sqft × $${rate.toFixed(2)}`
                      : 'Calculated from square footage × worker rate'}
                  </p>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="description">Description</label>
                <input
                  id="description"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Optional job notes"
                />
              </div>
            </>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={form.company_paid}
              onChange={(e) => updateField('company_paid', e.target.checked)}
            />
            Client has paid company
          </label>
        </div>

        {mode === 'multiple' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Jobs to create</h3>
              <button type="button" className="btn btn-secondary" onClick={addBulkRow}>
                + Add row
              </button>
            </div>
            <p className="job-meta" style={{ marginBottom: '1rem' }}>
              Assign one worker to each job. Price is square footage × ${rate.toFixed(2)}.
            </p>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Address</th>
                    <th>Sqft</th>
                    <th>Worker</th>
                    <th>Price</th>
                    <th>Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((row, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          value={row.title}
                          onChange={(e) => updateBulkRow(index, 'title', e.target.value)}
                          placeholder="Job title"
                          required={index === 0}
                        />
                      </td>
                      <td>
                        <input
                          value={row.address}
                          onChange={(e) => updateBulkRow(index, 'address', e.target.value)}
                          placeholder="Address"
                          required={index === 0}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.sqft}
                          onChange={(e) => updateBulkRow(index, 'sqft', e.target.value)}
                          placeholder="1200"
                          style={{ width: '5rem' }}
                          required={index === 0}
                        />
                      </td>
                      <td>
                        <select
                          aria-label={`Worker for job ${index + 1}`}
                          value={row.worker_id}
                          onChange={(e) => updateBulkRow(index, 'worker_id', e.target.value)}
                          style={{ minWidth: '9rem' }}
                        >
                          <option value="">No worker</option>
                          {workers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {row.sqft && Number(row.sqft) > 0
                          ? formatWorkerPay(row.sqft, rate)
                          : '—'}
                      </td>
                      <td>
                        <input
                          value={row.description}
                          onChange={(e) => updateBulkRow(index, 'description', e.target.value)}
                          placeholder="Optional"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => removeBulkRow(index)}
                          disabled={bulkRows.length <= 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || neighborhoods.length === 0}
          >
            {submitting
              ? 'Creating…'
              : mode === 'single'
                ? 'Create job'
                : `Create ${bulkRows.filter((r) => r.title.trim() || r.address.trim() || r.sqft).length || ''} jobs`}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
