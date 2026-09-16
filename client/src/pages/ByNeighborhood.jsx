import { useEffect, useState } from 'react';
import { api } from '../api.js';
import JobCard from '../components/JobCard.jsx';

export default function ByNeighborhood() {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/neighborhoods')
      .then(({ neighborhoods: n }) => {
        setNeighborhoods(n);
        if (n.length) setSelectedId(String(n[0].id));
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    api(`/jobs?neighborhood_id=${selectedId}&status=active`)
      .then(({ jobs: j }) => setJobs(j))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  async function handleRemove(job) {
    const confirmed = window.confirm(
      `Remove "${job.title}"? Worker assignments for this job will also be deleted.`
    );
    if (!confirmed) return;

    setError('');
    try {
      await api(`/jobs/${job.id}`, { method: 'DELETE' });
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <header className="page-title">
        <h2>Active jobs by neighborhood</h2>
        <p>Select a neighborhood to view all active jobs in that area</p>
      </header>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="neighborhood">Neighborhood</label>
          <select
            id="neighborhood"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {neighborhoods.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="loading">Loading jobs…</p>}
      {!loading && !error && jobs.length === 0 && (
        <p className="empty-state">No active jobs in this neighborhood.</p>
      )}
      {!loading && jobs.length > 0 && (
        <div className="job-list">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </>
  );
}
