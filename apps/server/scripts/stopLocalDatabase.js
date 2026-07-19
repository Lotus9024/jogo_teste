import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const pgBin = process.env.POSTGRES_BIN ?? 'C:\\Program Files\\PostgreSQL\\17\\bin';
const data = join(process.env.LOCALAPPDATA, 'TronosEmRuinas', 'postgres', 'data');
const stopped = spawnSync(join(pgBin, 'pg_ctl.exe'), ['stop', '-D', data, '-m', 'fast', '-w'], { stdio: 'inherit' });
process.exit(stopped.status ?? 1);
