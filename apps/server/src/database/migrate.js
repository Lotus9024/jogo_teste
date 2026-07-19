import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

if (!pool) throw new Error('Defina DATABASE_URL antes de executar as migrations.');

const migrationDirectory = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
await pool.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');

for (const name of (await readdir(migrationDirectory)).filter(file => file.endsWith('.sql')).sort()) {
  const applied = await pool.query('select 1 from schema_migrations where name = $1', [name]);
  if (applied.rowCount) continue;
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(await readFile(join(migrationDirectory, name), 'utf8'));
    await client.query('insert into schema_migrations (name) values ($1)', [name]);
    await client.query('commit');
    console.log(`Migration aplicada: ${name}`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

await pool.end();
