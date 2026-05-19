import { useEffect, useState } from 'react';
import { api } from '../api.js';
import JobCard from '../components/JobCard.jsx';

export default function ByWorker() {
  const [workers, setWorkers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/workers')
      .then(({ workers: w }) => {
        setWorkers(w);
        if (w.length) setSelectedId(String(w[0].id));
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    api(`/jobs?worker_id=${selectedId}`)
      .then(({ jobs: j }) => setJobs(j))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const selected = workers.find((w) => String(w.id) === selectedId);

  return (
    <>
      <header className="page-title">
        <h2>Jobs by worker</h2>
        <p>View all jobs assigned to a worker and their payment status per job</p>
      </header>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="worker">Worker</label>
          <select
            id="worker"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selected && (
        <p className="job-meta" style={{ marginBottom: '1rem' }}>
          Showing jobs for <strong>{selected.name}</strong>
          {selected.phone && ` · ${selected.phone}`}
        </p>
      )}

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="loading">Loading jobs…</p>}
      {!loading && !error && jobs.length === 0 && (
        <p className="empty-state">No jobs assigned to this worker.</p>
      )}
      {!loading && jobs.length > 0 && (
        <div className="job-list">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} showWorkerStatus />
          ))}
        </div>
      )}
    </>
  );
}
