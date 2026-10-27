import { Router } from 'express';
import db from './db.js';
import {
  authMiddleware,
  requireAdmin,
  verifyPassword,
  signToken,
  isAdmin,
} from './auth.js';
import {
  sanitizeJob,
  sanitizeAssignment,
  jobWithAssignments,
  formatCents,
  paidStatus,
} from './format.js';
import { workerPayCentsFromSqft, DEFAULT_WORKER_RATE_PER_SQFT } from './payroll.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

function getJobRow(id) {
  return db
    .prepare(
      `SELECT j.*, n.name AS neighborhood_name
       FROM jobs j
       JOIN neighborhoods n ON n.id = j.neighborhood_id
       WHERE j.id = ?`
    )
    .get(id);
}

function getAssignments(jobId) {
  return db
    .prepare(
      `SELECT ja.*, w.first_name || ' ' || w.last_name AS worker_name
       FROM job_assignments ja
       JOIN workers w ON w.id = ja.worker_id
       WHERE ja.job_id = ?
       ORDER BY w.last_name, w.first_name`
    )
    .all(jobId);
}

function formatWorker(row) {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    active: Boolean(row.active),
    name: `${row.first_name} ${row.last_name}`,
  };
}

// ——— Auth ———
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

router.get('/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(req.user.sub);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ user });
});

// ——— Reference data ———
router.get('/neighborhoods', authMiddleware, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT n.id, n.name,
              SUM(CASE WHEN j.status = 'active' THEN 1 ELSE 0 END) AS active_job_count,
              COUNT(j.id) AS total_job_count
       FROM neighborhoods n
       LEFT JOIN jobs j ON j.neighborhood_id = n.id
       GROUP BY n.id
       ORDER BY n.name`
    )
    .all();
  res.json({
    neighborhoods: rows.map((n) => ({
      id: n.id,
      name: n.name,
      active_job_count: n.active_job_count,
      total_job_count: n.total_job_count,
      job_count: n.active_job_count,
    })),
  });
});

router.post('/neighborhoods', authMiddleware, (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) {
    return res.status(400).json({ error: 'Neighborhood name is required' });
  }
  const existing = db.prepare('SELECT id FROM neighborhoods WHERE name = ?').get(name);
  if (existing) {
    return res.status(409).json({ error: 'A neighborhood with this name already exists' });
  }
  const result = db.prepare('INSERT INTO neighborhoods (name) VALUES (?)').run(name);
  res.status(201).json({
    neighborhood: {
      id: result.lastInsertRowid,
      name,
      active_job_count: 0,
      total_job_count: 0,
      job_count: 0,
    },
  });
});

router.delete('/neighborhoods/:id', authMiddleware, requireAdmin, (req, res) => {
  const neighborhood = db
    .prepare('SELECT id, name FROM neighborhoods WHERE id = ?')
    .get(req.params.id);
  if (!neighborhood) return res.status(404).json({ error: 'Neighborhood not found' });

  const activeCount = db
    .prepare("SELECT COUNT(*) AS c FROM jobs WHERE neighborhood_id = ? AND status = 'active'")
    .get(neighborhood.id).c;

  if (activeCount > 0) {
    return res.status(409).json({
      error: `Cannot remove "${neighborhood.name}" — ${activeCount} active job(s) must be removed or completed first.`,
    });
  }

  const totalCount = db
    .prepare('SELECT COUNT(*) AS c FROM jobs WHERE neighborhood_id = ?')
    .get(neighborhood.id).c;

  const removeNeighborhood = db.transaction(() => {
    if (totalCount > 0) {
      db.prepare('DELETE FROM jobs WHERE neighborhood_id = ?').run(neighborhood.id);
    }
    db.prepare('DELETE FROM neighborhoods WHERE id = ?').run(neighborhood.id);
  });
  removeNeighborhood();

  res.json({
    deleted: true,
    id: neighborhood.id,
    jobs_deleted: totalCount,
  });
});

router.get('/workers', authMiddleware, (req, res) => {
  const activeOnly = req.query.active !== 'false';
  const rows = db
    .prepare(
      `SELECT id, first_name, last_name, email, phone, active
       FROM workers
       ${activeOnly ? 'WHERE active = 1' : ''}
       ORDER BY last_name, first_name`
    )
    .all();
  res.json({ workers: rows.map(formatWorker) });
});

router.post('/workers', authMiddleware, (req, res) => {
  const { first_name, last_name, email, phone } = req.body || {};
  if (!first_name?.trim() || !last_name?.trim()) {
    return res.status(400).json({ error: 'First and last name are required' });
  }
  const result = db
    .prepare(
      'INSERT INTO workers (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)'
    )
    .run(
      first_name.trim(),
      last_name.trim(),
      email?.trim() || null,
      phone?.trim() || null
    );
  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ worker: formatWorker(worker) });
});

router.patch('/workers/:id', authMiddleware, (req, res) => {
  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const { first_name, last_name, email, phone } = req.body || {};
  const first = first_name !== undefined ? String(first_name).trim() : worker.first_name;
  const last = last_name !== undefined ? String(last_name).trim() : worker.last_name;
  if (!first || !last) {
    return res.status(400).json({ error: 'First and last name are required' });
  }

  const nextEmail = email !== undefined ? String(email).trim() || null : worker.email;
  const nextPhone = phone !== undefined ? String(phone).trim() || null : worker.phone;

  db.prepare(
    'UPDATE workers SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?'
  ).run(first, last, nextEmail, nextPhone, worker.id);

  const updated = db.prepare('SELECT * FROM workers WHERE id = ?').get(worker.id);
  res.json({ worker: formatWorker(updated) });
});

router.delete('/workers/:id', authMiddleware, requireAdmin, (req, res) => {
  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const assignmentCount = db
    .prepare('SELECT COUNT(*) AS c FROM job_assignments WHERE worker_id = ?')
    .get(worker.id).c;

  if (assignmentCount > 0) {
    db.prepare('UPDATE workers SET active = 0 WHERE id = ?').run(worker.id);
    const updated = db.prepare('SELECT * FROM workers WHERE id = ?').get(worker.id);
    return res.json({
      worker: formatWorker(updated),
      deactivated: true,
      message: 'Worker has job history and was deactivated instead of deleted.',
    });
  }

  db.prepare('DELETE FROM workers WHERE id = ?').run(worker.id);
  res.json({ deleted: true, id: worker.id });
});

// ——— Jobs ———
router.get('/jobs', authMiddleware, (req, res) => {
  const admin = isAdmin(req.user);
  const { neighborhood_id, worker_id, status } = req.query;
  const conditions = [];
  const params = [];

  if (neighborhood_id) {
    conditions.push('j.neighborhood_id = ?');
    params.push(Number(neighborhood_id));
  }
  if (status) {
    conditions.push('j.status = ?');
    params.push(status);
  }
  if (worker_id) {
    conditions.push(
      'EXISTS (SELECT 1 FROM job_assignments ja WHERE ja.job_id = j.id AND ja.worker_id = ?)'
    );
    params.push(Number(worker_id));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const jobs = db
    .prepare(
      `SELECT j.*, n.name AS neighborhood_name
       FROM jobs j
       JOIN neighborhoods n ON n.id = j.neighborhood_id
       ${where}
       ORDER BY j.created_at DESC`
    )
    .all(...params);

  const result = jobs.map((job) => {
    const assignments = getAssignments(job.id);
    const out = jobWithAssignments(job, assignments, admin);
    if (worker_id) {
      const wid = Number(worker_id);
      const mine = assignments.find((a) => a.worker_id === wid);
      if (mine) {
        out.worker_payment_status = paidStatus(mine.worker_paid);
        if (admin) {
          out.worker_amount_cents = mine.worker_amount_cents;
          out.worker_amount = formatCents(mine.worker_amount_cents);
        }
      }
    }
    return out;
  });

  res.json({ jobs: result });
});

function recalcAssignmentPay(jobId) {
  const row = db
    .prepare('SELECT sqft, worker_rate_per_sqft FROM jobs WHERE id = ?')
    .get(jobId);
  if (!row) return;
  const cents = workerPayCentsFromSqft(row.sqft, row.worker_rate_per_sqft);
  db.prepare('UPDATE job_assignments SET worker_amount_cents = ? WHERE job_id = ?').run(
    cents,
    jobId
  );
  db.prepare('UPDATE jobs SET company_amount_cents = ? WHERE id = ?').run(cents, jobId);
}

function assignedWorkerId(payload) {
  const ids = [];
  if (
    payload.worker_id !== undefined &&
    payload.worker_id !== null &&
    payload.worker_id !== ''
  ) {
    ids.push(Number(payload.worker_id));
  }
  for (const assignment of payload.assignments || []) {
    const id = Number(assignment?.worker_id);
    if (id) ids.push(id);
  }
  const unique = [...new Set(ids.filter((id) => id > 0))];
  if (unique.length > 1) {
    throw new Error('A job can only be assigned one worker');
  }
  return unique[0] || null;
}

function insertJobFromPayload(payload) {
  const {
    title,
    address,
    neighborhood_id,
    client_name,
    description,
    status = 'active',
    sqft,
    worker_rate_per_sqft,
    company_paid = false,
  } = payload || {};

  if (!title?.trim() || !address?.trim() || !client_name?.trim()) {
    throw new Error('Title, address, and client name are required');
  }

  const sqftNum = Number(sqft);
  if (!sqftNum || sqftNum <= 0) {
    throw new Error('Square footage is required and must be greater than 0');
  }

  const hoodId = Number(neighborhood_id);
  if (!hoodId) throw new Error('Neighborhood is required');
  const hood = db.prepare('SELECT id FROM neighborhoods WHERE id = ?').get(hoodId);
  if (!hood) throw new Error('Invalid neighborhood');

  const validStatuses = ['active', 'completed', 'cancelled'];
  const jobStatus = validStatuses.includes(status) ? status : 'active';

  const clientPaid = Boolean(company_paid);

  const rateNum = Number(worker_rate_per_sqft) || DEFAULT_WORKER_RATE_PER_SQFT;
  if (rateNum <= 0) throw new Error('Worker rate per sqft must be greater than 0');

  const priceCents = workerPayCentsFromSqft(sqftNum, rateNum);
  const workerId = assignedWorkerId(payload);
  if (workerId) {
    const worker = db
      .prepare('SELECT id FROM workers WHERE id = ? AND active = 1')
      .get(workerId);
    if (!worker) {
      throw new Error('Assigned worker was not found or is inactive');
    }
  }

  const result = db
    .prepare(
      `INSERT INTO jobs (
        title, address, neighborhood_id, client_name, description,
        status, company_amount_cents, company_paid, sqft, worker_rate_per_sqft, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title.trim(),
      address.trim(),
      hoodId,
      client_name.trim(),
      description?.trim() || null,
      jobStatus,
      priceCents,
      clientPaid ? 1 : 0,
      sqftNum,
      rateNum,
      jobStatus === 'completed' ? new Date().toISOString() : null
    );

  const jobId = result.lastInsertRowid;

  if (workerId) {
    db.prepare(
      'INSERT INTO job_assignments (job_id, worker_id, worker_amount_cents, worker_paid) VALUES (?, ?, ?, 0)'
    ).run(jobId, workerId, priceCents);
  }

  return jobId;
}

function buildInvoicePayload(job, assignments, admin) {
  return {
    invoice_number: `INV-${String(job.id).padStart(5, '0')}`,
    generated_at: job.created_at,
    updated_at: job.invoice_updated_at || null,
    bill_to: job.invoice_bill_to || job.client_name,
    due_date: job.invoice_due_date || null,
    notes: job.invoice_notes || null,
    job: sanitizeJob(job, admin),
    line_items: assignments.map((a) => ({
      description: a.notes ? `Labor — ${a.worker_name} (${a.notes})` : `Labor — ${a.worker_name}`,
      ...sanitizeAssignment(a, admin),
    })),
    show_company_amounts: admin,
    show_worker_amounts: admin,
    totals: admin
      ? {
          company_billed: formatCents(job.company_amount_cents),
          company_status: paidStatus(job.company_paid),
          worker_total: formatCents(
            assignments.reduce((s, a) => s + a.worker_amount_cents, 0)
          ),
        }
      : {
          company_status: paidStatus(job.company_paid),
          workers_unpaid_count: assignments.filter((a) => !a.worker_paid).length,
          workers_paid_count: assignments.filter((a) => a.worker_paid).length,
        },
  };
}

router.post('/jobs', authMiddleware, (req, res) => {
  const admin = isAdmin(req.user);
  try {
    const jobId = insertJobFromPayload(req.body);
    const job = getJobRow(jobId);
    res.status(201).json({ job: jobWithAssignments(job, getAssignments(jobId), admin) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/jobs/bulk', authMiddleware, (req, res) => {
  const admin = isAdmin(req.user);
  const { defaults = {}, jobs = [] } = req.body || {};

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return res.status(400).json({ error: 'At least one job is required' });
  }

  const created = [];
  const errors = [];

  const runBulk = db.transaction(() => {
    jobs.forEach((row, index) => {
      try {
        const payload = {
          ...defaults,
          ...row,
          assignments: row.assignments ?? defaults.assignments ?? [],
        };
        const jobId = insertJobFromPayload(payload);
        created.push(jobId);
      } catch (err) {
        errors.push({ index, error: err.message });
      }
    });
  });

  runBulk();

  if (created.length === 0) {
    return res.status(400).json({ error: errors[0]?.error || 'No jobs were created', errors });
  }

  const result = created.map((id) => {
    const job = getJobRow(id);
    return jobWithAssignments(job, getAssignments(id), admin);
  });

  res.status(201).json({
    jobs: result,
    created_count: created.length,
    errors,
  });
});

router.get('/jobs/:id', authMiddleware, (req, res) => {
  const admin = isAdmin(req.user);
  const job = getJobRow(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const assignments = getAssignments(job.id);
  res.json({ job: jobWithAssignments(job, assignments, admin) });
});

router.patch('/jobs/:id', authMiddleware, requireAdmin, (req, res) => {
  const job = getJobRow(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const {
    company_paid,
    company_amount_cents,
    status,
    title,
    description,
    sqft,
    worker_rate_per_sqft,
  } = req.body || {};

  const updates = [];
  const params = [];
  let recalcPay = false;

  if (company_paid !== undefined) {
    updates.push('company_paid = ?');
    params.push(company_paid ? 1 : 0);
  }
  if (company_amount_cents !== undefined) {
    updates.push('company_amount_cents = ?');
    params.push(Number(company_amount_cents));
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
    if (status === 'completed') {
      updates.push("completed_at = datetime('now')");
    }
  }
  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (sqft !== undefined) {
    const sqftNum = Number(sqft);
    if (sqftNum <= 0) {
      return res.status(400).json({ error: 'Square footage must be greater than 0' });
    }
    updates.push('sqft = ?');
    params.push(sqftNum);
    recalcPay = true;
  }
  if (worker_rate_per_sqft !== undefined) {
    const rateNum = Number(worker_rate_per_sqft);
    if (rateNum <= 0) {
      return res.status(400).json({ error: 'Worker rate per sqft must be greater than 0' });
    }
    updates.push('worker_rate_per_sqft = ?');
    params.push(rateNum);
    recalcPay = true;
  }

  if (updates.length) {
    params.push(job.id);
    db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  if (recalcPay) {
    recalcAssignmentPay(job.id);
  }

  const updated = getJobRow(job.id);
  res.json({ job: jobWithAssignments(updated, getAssignments(job.id), true) });
});

router.delete('/jobs/:id', authMiddleware, requireAdmin, (req, res) => {
  const job = db.prepare('SELECT id, title FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  db.prepare('DELETE FROM jobs WHERE id = ?').run(job.id);
  res.json({ deleted: true, id: job.id, title: job.title });
});

router.patch('/assignments/:id', authMiddleware, requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM job_assignments WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Assignment not found' });

  const { worker_paid, worker_amount_cents, notes } = req.body || {};
  const updates = [];
  const params = [];

  if (worker_paid !== undefined) {
    updates.push('worker_paid = ?');
    params.push(worker_paid ? 1 : 0);
  }
  if (worker_amount_cents !== undefined) {
    updates.push('worker_amount_cents = ?');
    params.push(Number(worker_amount_cents));
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }

  if (updates.length) {
    params.push(row.id);
    db.prepare(`UPDATE job_assignments SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = db
    .prepare(
      `SELECT ja.*, w.first_name || ' ' || w.last_name AS worker_name
       FROM job_assignments ja
       JOIN workers w ON w.id = ja.worker_id
       WHERE ja.id = ?`
    )
    .get(row.id);

  res.json({ assignment: sanitizeAssignment(updated, true) });
});

// ——— Invoice (printable) ———
router.get('/jobs/:id/invoice', authMiddleware, (req, res) => {
  const admin = isAdmin(req.user);
  const job = getJobRow(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const assignments = getAssignments(job.id);
  res.json({ invoice: buildInvoicePayload(job, assignments, admin) });
});

router.patch('/jobs/:id/invoice', authMiddleware, (req, res) => {
  const admin = isAdmin(req.user);
  const job = getJobRow(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { invoice_notes, invoice_bill_to, invoice_due_date, company_amount, line_items } =
    req.body || {};

  const updates = ["invoice_updated_at = datetime('now')"];
  const params = [];

  if (invoice_notes !== undefined) {
    updates.push('invoice_notes = ?');
    params.push(invoice_notes?.trim() || null);
  }
  if (invoice_bill_to !== undefined) {
    updates.push('invoice_bill_to = ?');
    params.push(invoice_bill_to?.trim() || null);
  }
  if (invoice_due_date !== undefined) {
    updates.push('invoice_due_date = ?');
    params.push(invoice_due_date || null);
  }
  if (admin && company_amount !== undefined) {
    updates.push('company_amount_cents = ?');
    params.push(Math.round(Number(company_amount) * 100) || 0);
  }

  if (updates.length > 1) {
    params.push(job.id);
    db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  if (Array.isArray(line_items)) {
    const updateNotes = db.prepare(
      'UPDATE job_assignments SET notes = ? WHERE id = ? AND job_id = ?'
    );
    const updateAmount = db.prepare(
      'UPDATE job_assignments SET worker_amount_cents = ? WHERE id = ? AND job_id = ?'
    );

    for (const item of line_items) {
      if (!item.id) continue;
      if (item.notes !== undefined) {
        updateNotes.run(item.notes?.trim() || null, item.id, job.id);
      }
      if (admin && item.worker_amount !== undefined) {
        updateAmount.run(
          Math.round(Number(item.worker_amount) * 100) || 0,
          item.id,
          job.id
        );
      }
    }
  }

  const updated = getJobRow(job.id);
  const assignments = getAssignments(job.id);
  res.json({ invoice: buildInvoicePayload(updated, assignments, admin) });
});

export default router;
