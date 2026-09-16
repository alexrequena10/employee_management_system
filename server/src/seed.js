import db from './db.js';
import { hashPassword } from './auth.js';

const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (count > 0) {
  console.log('Database already seeded. Skipping.');
  process.exit(0);
}

const insertUser = db.prepare(
  'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
);
insertUser.run('admin', hashPassword('admin123'), 'admin');
insertUser.run('assistant', hashPassword('assistant123'), 'assistant');

const neighborhoods = ['Oak Hills', 'Riverside', 'Downtown', 'Westgate', 'Maple Park'];
const insertHood = db.prepare('INSERT INTO neighborhoods (name) VALUES (?)');
const hoodIds = neighborhoods.map((n) => insertHood.run(n).lastInsertRowid);

const workers = [
  ['Marcus', 'Rivera', 'mrivera@example.com', '555-0101'],
  ['Elena', 'Vasquez', 'evasquez@example.com', '555-0102'],
  ['James', 'Chen', 'jchen@example.com', '555-0103'],
  ['Sofia', 'Patel', 'spatel@example.com', '555-0104'],
  ['David', 'Brooks', 'dbrooks@example.com', '555-0105'],
];
const insertWorker = db.prepare(
  'INSERT INTO workers (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)'
);
const workerIds = workers.map((w) => insertWorker.run(...w).lastInsertRowid);

const insertJob = db.prepare(`
  INSERT INTO jobs (title, address, neighborhood_id, client_name, description, status, company_amount_cents, company_paid, sqft, worker_rate_per_sqft)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertAssign = db.prepare(`
  INSERT INTO job_assignments (job_id, worker_id, worker_amount_cents, worker_paid, notes)
  VALUES (?, ?, ?, ?, ?)
`);

const jobs = [
  ['Kitchen remodel', '142 Oak Lane', 0, 'Anderson Family', 'Cabinet install and backsplash', 'active', 1850000, 0, 1028],
  ['Bathroom renovation', '88 River Rd', 1, 'Nguyen LLC', 'Full gut and tile', 'active', 920000, 1, 450],
  ['Deck repair', '301 Westgate Dr', 3, 'Miller Home', 'Replace boards and railing', 'active', 450000, 0, 320],
  ['Roof patch', '12 Maple St', 4, 'Green Properties', 'Storm damage section', 'completed', 320000, 1, 180],
  ['Fence install', '55 Downtown Ave', 2, 'City Cafe', 'Perimeter cedar fence', 'active', 680000, 0, 500],
  ['Garage drywall', '9 Oak Hills Ct', 0, 'Reed Trust', 'Finish and paint', 'completed', 540000, 0, 600],
];

jobs.forEach((j, i) => {
  const hoodIdx = j[2];
  const sqft = j[8];
  const jobId = insertJob.run(
    j[0],
    j[1],
    hoodIds[hoodIdx],
    j[3],
    j[4],
    j[5],
    j[6],
    j[7],
    sqft,
    1.8
  ).lastInsertRowid;

  const w1 = workerIds[i % workerIds.length];
  const w2 = workerIds[(i + 2) % workerIds.length];
  const workerPay = Math.round(sqft * 1.8 * 100);
  insertAssign.run(jobId, w1, workerPay, i % 2, null);
  if (i % 3 !== 0) insertAssign.run(jobId, w2, workerPay, i > 2 ? 1 : 0, 'Helper shift');
});

console.log('Seed complete.');
console.log('  Admin:     admin / admin123');
console.log('  Assistant: assistant / assistant123');
