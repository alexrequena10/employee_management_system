import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'workers.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'assistant')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS neighborhoods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    address TEXT NOT NULL,
    neighborhood_id INTEGER NOT NULL REFERENCES neighborhoods(id),
    client_name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    company_amount_cents INTEGER NOT NULL DEFAULT 0,
    company_paid INTEGER NOT NULL DEFAULT 0,
    sqft REAL NOT NULL DEFAULT 0,
    worker_rate_per_sqft REAL NOT NULL DEFAULT 1.8,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS job_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id INTEGER NOT NULL REFERENCES workers(id),
    worker_amount_cents INTEGER NOT NULL DEFAULT 0,
    worker_paid INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    UNIQUE(job_id, worker_id)
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_neighborhood ON jobs(neighborhood_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_assignments_worker ON job_assignments(worker_id);
  CREATE INDEX IF NOT EXISTS idx_assignments_job ON job_assignments(job_id);
`);

const jobColNames = new Set(
  db.prepare('PRAGMA table_info(jobs)').all().map((c) => c.name)
);
if (!jobColNames.has('sqft')) {
  db.exec('ALTER TABLE jobs ADD COLUMN sqft REAL NOT NULL DEFAULT 0');
}
if (!jobColNames.has('worker_rate_per_sqft')) {
  db.exec('ALTER TABLE jobs ADD COLUMN worker_rate_per_sqft REAL NOT NULL DEFAULT 1.8');
}
for (const col of ['invoice_notes', 'invoice_bill_to', 'invoice_due_date']) {
  if (!jobColNames.has(col)) {
    db.exec(`ALTER TABLE jobs ADD COLUMN ${col} TEXT`);
  }
}
if (!jobColNames.has('invoice_updated_at')) {
  db.exec('ALTER TABLE jobs ADD COLUMN invoice_updated_at TEXT');
}

export default db;
