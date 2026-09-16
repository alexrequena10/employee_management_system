export function formatCents(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format((cents || 0) / 100);
}

export function paidStatus(paid) {
  return paid ? 'Paid' : 'Unpaid';
}

export function sanitizeJob(job, admin) {
  const base = {
    id: job.id,
    title: job.title,
    address: job.address,
    neighborhood_id: job.neighborhood_id,
    neighborhood_name: job.neighborhood_name,
    client_name: job.client_name,
    description: job.description,
    status: job.status,
    sqft: job.sqft ?? 0,
    worker_rate_per_sqft: job.worker_rate_per_sqft ?? 1.8,
    company_paid: Boolean(job.company_paid),
    company_payment_status: paidStatus(job.company_paid),
    created_at: job.created_at,
    completed_at: job.completed_at,
  };
  if (admin) {
    base.company_amount_cents = job.company_amount_cents;
    base.company_amount = formatCents(job.company_amount_cents);
  }
  return base;
}

export function sanitizeAssignment(row, admin) {
  const base = {
    id: row.id,
    job_id: row.job_id,
    worker_id: row.worker_id,
    worker_name: row.worker_name,
    worker_paid: Boolean(row.worker_paid),
    worker_payment_status: paidStatus(row.worker_paid),
    notes: row.notes,
  };
  if (admin) {
    base.worker_amount_cents = row.worker_amount_cents;
    base.worker_amount = formatCents(row.worker_amount_cents);
  }
  return base;
}

export function jobWithAssignments(job, assignments, admin) {
  return {
    ...sanitizeJob(job, admin),
    assignments: assignments.map((a) => sanitizeAssignment(a, admin)),
  };
}
