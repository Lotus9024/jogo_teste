import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = new URL('../src/', import.meta.url);
for (const entry of await readdir(source)) {
  if (!entry.endsWith('.mjs')) continue;
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(entry, source))], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Sintaxe dos módulos do bot válida.');
