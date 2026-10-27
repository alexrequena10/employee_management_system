import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatJobDate } from '../utils/date.js';

function editStateFromInvoice(inv) {
  return {
    bill_to: inv.bill_to || '',
    due_date: inv.due_date || '',
    notes: inv.notes || '',
    company_amount: inv.job.company_amount
      ? String(parseFloat(inv.job.company_amount.replace(/[^0-9.-]/g, '')) || '')
      : '',
    line_items: inv.line_items.map((line) => ({
      id: line.id,
      notes: line.notes || '',
      worker_amount: line.worker_amount
        ? String(parseFloat(line.worker_amount.replace(/[^0-9.-]/g, '')) || '')
        : '',
    })),
  };
}

export default function Invoice() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/jobs/${id}/invoice`)
      .then(({ invoice: inv }) => setInvoice(inv))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function startEditing() {
    setEditForm(editStateFromInvoice(invoice));
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditForm(null);
  }

  function updateEditField(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateLineItem(index, field, value) {
    setEditForm((prev) => ({
      ...prev,
      line_items: prev.line_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body = {
        invoice_bill_to: editForm.bill_to,
        invoice_due_date: editForm.due_date || null,
        invoice_notes: editForm.notes,
        line_items: editForm.line_items.map((item) => ({
          id: item.id,
          notes: item.notes,
          ...(isAdmin && item.worker_amount !== ''
            ? { worker_amount: item.worker_amount }
            : {}),
        })),
      };
      if (isAdmin && editForm.company_amount !== '') {
        body.company_amount = editForm.company_amount;
      }
      const { invoice: updated } = await api(`/jobs/${id}/invoice`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setInvoice(updated);
      setEditing(false);
      setEditForm(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="loading">Loading invoice…</p>;
  if (error && !invoice) return <div className="error-banner">{error}</div>;
  if (!invoice) return null;

  const { job, line_items: lines, totals } = invoice;

  return (
    <>
      <div className="invoice-actions no-print">
        <Link to={`/jobs/${id}`} className="btn btn-secondary">← Back to job</Link>
        {!editing ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={startEditing}>
              Edit invoice
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              Print invoice
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {error && <div className="error-banner no-print">{error}</div>}

      <article className="card invoice-print">
        <header className="invoice-header">
          <h1>Invoice {invoice.invoice_number}</h1>
          <p className="job-meta">
            Created {formatJobDate(invoice.generated_at)}
            {invoice.updated_at && (
              <> · Updated {formatJobDate(invoice.updated_at)}</>
            )}
          </p>
        </header>

        {editing ? (
          <section>
            <h3>Bill to</h3>
            <input
              className="invoice-edit-input"
              value={editForm.bill_to}
              onChange={(e) => updateEditField('bill_to', e.target.value)}
              placeholder="Client or company name"
            />
            <h3 style={{ marginTop: '1rem' }}>Due date</h3>
            <input
              type="date"
              className="invoice-edit-input"
              value={editForm.due_date}
              onChange={(e) => updateEditField('due_date', e.target.value)}
            />
            <h3 style={{ marginTop: '1rem' }}>Invoice notes</h3>
            <textarea
              className="invoice-edit-input"
              rows={3}
              value={editForm.notes}
              onChange={(e) => updateEditField('notes', e.target.value)}
              placeholder="Payment terms, thank-you note, etc."
            />
          </section>
        ) : (
          <>
            {(invoice.bill_to || invoice.due_date) && (
              <section>
                {invoice.bill_to && (
                  <p><strong>Bill to:</strong> {invoice.bill_to}</p>
                )}
                {invoice.due_date && (
                  <p><strong>Due date:</strong> {formatJobDate(invoice.due_date)}</p>
                )}
              </section>
            )}
            {invoice.notes && (
              <section style={{ marginTop: '1rem' }}>
                <h3>Notes</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
              </section>
            )}
          </>
        )}

        <section style={{ marginTop: '1.5rem' }}>
          <h3>Job details</h3>
          <p><strong>{job.title}</strong></p>
          <p>Address: {job.address}</p>
          <p>Neighborhood: {job.neighborhood_name}</p>
          {job.description && <p>Description: {job.description}</p>}
          <p>Status: {job.status}</p>
        </section>

        <section style={{ marginTop: '1.5rem' }}>
          <h3>Worker labor</h3>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Worker</th>
                {isAdmin && <th>Amount</th>}
                <th>Payment status</th>
                {editing && <th>Line notes</th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id}>
                  <td>{line.worker_name}</td>
                  {isAdmin && (
                    <td>
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.line_items[index]?.worker_amount ?? ''}
                          onChange={(e) =>
                            updateLineItem(index, 'worker_amount', e.target.value)
                          }
                          style={{ width: '6rem' }}
                        />
                      ) : (
                        line.worker_amount || '—'
                      )}
                    </td>
                  )}
                  <td>
                    <StatusBadge
                      paid={line.worker_paid}
                      label={line.worker_payment_status}
                    />
                  </td>
                  {editing && (
                    <td>
                      <input
                        value={editForm.line_items[index]?.notes ?? ''}
                        onChange={(e) => updateLineItem(index, 'notes', e.target.value)}
                        placeholder="Optional"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="invoice-totals">
          {isAdmin ? (
            <>
              <div className="row">
                <label htmlFor="company_amount">Price</label>
                {editing ? (
                  <input
                    id="company_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.company_amount}
                    onChange={(e) => updateEditField('company_amount', e.target.value)}
                    style={{ width: '8rem' }}
                  />
                ) : (
                  <strong>{totals.company_billed}</strong>
                )}
              </div>
              <div className="row">
                <span>Total worker pay</span>
                <strong>{totals.worker_total}</strong>
              </div>
            </>
          ) : (
            <>
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
