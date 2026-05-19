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

const router = Router();

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
  const rows = db.prepare('SELECT id, name FROM neighborhoods ORDER BY name').all();
  res.json({ neighborhoods: rows });
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
  res.json({
    workers: rows.map((w) => ({
      ...w,
      name: `${w.first_name} ${w.last_name}`,
      active: Boolean(w.active),
    })),
  });
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
  } = req.body || {};

  const updates = [];
  const params = [];

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

  if (updates.length) {
    params.push(job.id);
    db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = getJobRow(job.id);
  res.json({ job: jobWithAssignments(updated, getAssignments(job.id), true) });
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

  const invoice = {
    invoice_number: `INV-${String(job.id).padStart(5, '0')}`,
    generated_at: new Date().toISOString(),
    job: sanitizeJob(job, admin),
    line_items: assignments.map((a) => ({
      description: `Labor — ${a.worker_name}`,
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

  res.json({ invoice });
});

export default router;
