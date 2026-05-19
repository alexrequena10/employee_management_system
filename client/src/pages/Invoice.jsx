import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Invoice() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/jobs/${id}/invoice`)
      .then(({ invoice: inv }) => setInvoice(inv))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="loading">Loading invoice…</p>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!invoice) return null;

  const { job, line_items: lines, totals } = invoice;

  return (
    <>
      <div className="invoice-actions no-print">
        <Link to={`/jobs/${id}`} className="btn btn-secondary">← Back to job</Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Print invoice
        </button>
      </div>

      <article className="card invoice-print">
        <header className="invoice-header">
          <h1>Invoice {invoice.invoice_number}</h1>
          <p className="job-meta">
            Generated {new Date(invoice.generated_at).toLocaleString()}
          </p>
        </header>

        <section>
          <h3>Job details</h3>
          <p><strong>{job.title}</strong></p>
          <p>{job.address}</p>
          <p>Neighborhood: {job.neighborhood_name}</p>
          <p>Client: {job.client_name}</p>
          {job.description && <p>{job.description}</p>}
          <p>Status: {job.status}</p>
        </section>

        <section style={{ marginTop: '1.5rem' }}>
          <h3>Company payment</h3>
          <p>
            Client payment status:{' '}
            <StatusBadge paid={job.company_paid} label={job.company_payment_status} />
          </p>
          {isAdmin && job.company_amount && (
            <p>Amount billed: <strong>{job.company_amount}</strong></p>
          )}
        </section>

        <section style={{ marginTop: '1.5rem' }}>
          <h3>Worker labor</h3>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Worker</th>
                {isAdmin && <th>Amount</th>}
                <th>Payment status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.worker_name}</td>
                  {isAdmin && <td>{line.worker_amount || '—'}</td>}
                  <td>
                    <StatusBadge
                      paid={line.worker_paid}
                      label={line.worker_payment_status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="invoice-totals">
          {isAdmin ? (
            <>
              <div className="row">
                <span>Company billed</span>
                <strong>{totals.company_billed}</strong>
              </div>
              <div className="row">
                <span>Company status</span>
                <strong>{totals.company_status}</strong>
              </div>
              <div className="row">
                <span>Total worker pay</span>
                <strong>{totals.worker_total}</strong>
              </div>
            </>
          ) : (
            <>
              <div className="row">
                <span>Company status</span>
                <strong>{totals.company_status}</strong>
              </div>
              <div className="row">
                <span>Workers paid</span>
                <strong>{totals.workers_paid_count}</strong>
              </div>
              <div className="row">
                <span>Workers unpaid</span>
                <strong>{totals.workers_unpaid_count}</strong>
              </div>
            </>
          )}
        </footer>

        {!isAdmin && (
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Assistant view: dollar amounts are hidden. Payment statuses are shown only.
          </p>
        )}
      </article>
    </>
  );
}
