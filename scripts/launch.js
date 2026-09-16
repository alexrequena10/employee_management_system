import { spawn, exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'http://localhost:3001';

console.log('Starting A&E Construction Worker Management...\n');
console.log(`Open in browser: ${url}\n`);
console.log('Leave this window open while using the app. Press Ctrl+C to stop.\n');

const child = spawn('npm', ['start'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'production' },
});

setTimeout(() => {
  const open =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(open);
}, 2500);

child.on('exit', (code) => process.exit(code ?? 0));

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
