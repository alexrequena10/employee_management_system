import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function JobCard({ job, showWorkerStatus, onRemove }) {
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
            {job.sqft ? ` · ${Number(job.sqft).toLocaleString()} sqft` : ''}
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
        {!showWorkerStatus && job.assignments?.length === 1 && (
          <span className="chip">Worker: {job.assignments[0].worker_name}</span>
        )}
        {!showWorkerStatus && job.assignments?.length > 1 && (
          <span className="chip">{job.assignments.length} workers assigned</span>
        )}
      </div>
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link to={`/jobs/${job.id}/invoice`} className="btn btn-sm btn-ghost">
          View invoice
        </Link>
        {isAdmin && onRemove && (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => onRemove(job)}
          >
            Remove
          </button>
        )}
      </div>
    </article>
  );
}
