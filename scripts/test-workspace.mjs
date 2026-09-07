import { readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collect(path);
    return /\.test\.[cm]?js$/u.test(entry.name) ? [path] : [];
  }));
  return groups.flat().sort();
}

const files = await collect(resolve(process.argv[2] ?? 'src'));
if (!files.length) throw new Error('Nenhum teste encontrado: verifique o diretório informado.');
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
