import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

console.log('A&E Construction — first-time setup\n');

run('npm install');
run('npm run install:all');

const envPath = path.join(root, 'server/.env');
if (!fs.existsSync(envPath)) {
  const example = fs.readFileSync(path.join(root, 'server/.env.example'), 'utf8');
  const secret = crypto.randomBytes(32).toString('hex');
  const env = example
    .replace('change-this-to-a-long-random-string-in-production', secret)
    .replace('http://localhost:5173', 'http://localhost:3001');
  fs.writeFileSync(envPath, env);
  console.log('Created server/.env with a random JWT secret.');
}

run('npm run build');
run('npm run seed');

console.log('\nSetup complete.');
console.log('Run the app:  npm run launch');
console.log('Or double-click "Start App" in this folder.\n');
