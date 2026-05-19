import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function JobCard({ job, showWorkerStatus }) {
  const { isAdmin } = useAuth();

  return (
    <article className="job-card">
      <div className="job-card-header">
        <div>
          <h3>
            <Link to={`/jobs/${job.id}`}>{job.title}</Link>
          </h3>
          <p className="job-meta">
            {job.address} · {job.neighborhood_name} · {job.client_name}
          </p>
        </div>
        <span className={`status ${job.status === 'active' ? 'status-paid' : ''}`} style={job.status !== 'active' ? { background: '#f3f4f6', color: '#6b7280' } : {}}>
          {job.status}
        </span>
      </div>
      <div className="job-statuses">
        <span className="chip">
          Company: <StatusBadge paid={job.company_paid} />
          {isAdmin && job.company_amount && (
            <span> ({job.company_amount})</span>
          )}
        </span>
        {showWorkerStatus && job.worker_payment_status && (
          <span className="chip">
            Worker: <StatusBadge paid={job.worker_payment_status === 'Paid'} label={job.worker_payment_status} />
            {isAdmin && job.worker_amount && <span> ({job.worker_amount})</span>}
          </span>
        )}
        {!showWorkerStatus && job.assignments?.length > 0 && (
          <span className="chip">
            {job.assignments.length} worker(s) assigned
          </span>
        )}
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <Link to={`/jobs/${job.id}/invoice`} className="btn btn-sm btn-ghost">
          View invoice
        </Link>
      </div>
    </article>
  );
}
