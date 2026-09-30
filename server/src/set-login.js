import db from './db.js';
import { hashPassword } from './auth.js';

const [role, username, password] = process.argv.slice(2);

if (!['admin', 'assistant'].includes(role) || !username?.trim() || !password) {
  console.error('Usage: npm run set-login -- <admin|assistant> <username> <password>');
  process.exit(1);
}

const name = username.trim();
const existing = db.prepare('SELECT id FROM users WHERE role = ? ORDER BY id LIMIT 1').get(role);
const taken = db.prepare('SELECT id, role FROM users WHERE username = ?').get(name);

if (taken && taken.id !== existing?.id) {
  console.error(`Username "${name}" is already used by the ${taken.role} account.`);
  process.exit(1);
}

if (existing) {
  db.prepare('UPDATE users SET username = ?, password_hash = ? WHERE id = ?').run(
    name,
    hashPassword(password),
    existing.id
  );
  console.log(`Updated ${role} login: ${name}`);
} else {
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
    name,
    hashPassword(password),
    role
  );
  console.log(`Created ${role} login: ${name}`);
}
