import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignored = new Set(['node_modules', 'dist', '.git', '.local-data', 'local-tools', 'public']);
async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return ignored.has(entry.name) ? [] : collect(path);
    return /\.[cm]?js$/u.test(entry.name) ? [path] : [];
  }));
  return groups.flat().sort();
}
let failed = false;
const files = (await Promise.all(['apps', 'packages', 'scripts'].map(path => collect(join(root, path))))).flat();
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    console.error(relative(root, file), result.stderr || result.error);
  }
}
// The runtime CSS is canonical; keep the documented palette from drifting silently.
const design = await readFile(join(root, 'DESIGN.md'), 'utf8');
const tokens = await readFile(join(root, 'apps/client/src/styles/tokens.css'), 'utf8');
for (const name of ['bone', 'muted', 'gold', 'gold-hi', 'surface', 'background', 'focus']) {
  const value = tokens.match(new RegExp(`--${name}:\\s*(#[a-fA-F0-9]+)`))?.[1];
  if (!value || !design.includes(`${name}: "${value}"`)) {
    failed = true;
    console.error(`Token ${name} diverge entre DESIGN.md e styles/tokens.css.`);
  }
}
console.log(`${files.length} módulos verificados; ${failed ? 'há falhas acima' : 'sintaxe e tokens consistentes'}.`);
process.exitCode = failed ? 1 : 0;
