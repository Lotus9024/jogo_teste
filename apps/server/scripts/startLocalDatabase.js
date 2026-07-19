import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const pgBin = process.env.POSTGRES_BIN ?? 'C:\\Program Files\\PostgreSQL\\17\\bin';
const root = join(process.env.LOCALAPPDATA, 'TronosEmRuinas', 'postgres');
const data = join(root, 'data');
const logs = join(root, 'logs');
mkdirSync(logs, { recursive: true });

const status = spawnSync(join(pgBin, 'pg_ctl.exe'), ['status', '-D', data]);
if (status.status === 0) {
  console.log('PostgreSQL local já está ativo em 127.0.0.1:55432.');
  process.exit(0);
}

const started = spawnSync(join(pgBin, 'pg_ctl.exe'), ['start', '-D', data, '-l', join(logs, 'postgres.log'), '-w'], { stdio: 'inherit' });
process.exit(started.status ?? 1);
