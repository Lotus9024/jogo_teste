import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../config.js';
import { createDatabaseConnectionOptions } from './tls.js';

if (!config.migrationDatabaseUrl) throw new Error('Defina MIGRATION_DATABASE_URL antes de executar as migrations.');
if (config.nodeEnv === 'production' && !config.databaseSsl) {
  throw new Error('DATABASE_SSL=true é obrigatório em produção.');
}
const pool = new pg.Pool({
  ...createDatabaseConnectionOptions(config.migrationDatabaseUrl, config),
  max: 2,
  application_name: 'nexus-migrator'
});

const migrationDirectory = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
const client = await pool.connect();
await client.query('set role tronos_owner');
await client.query('create schema if not exists game authorization tronos_owner');
await client.query('create table if not exists game.schema_migrations (name text primary key, applied_at timestamptz not null default now())');

for (const name of (await readdir(migrationDirectory)).filter(file => file.endsWith('.sql')).sort()) {
  const applied = await client.query('select 1 from game.schema_migrations where name = $1', [name]);
  if (applied.rowCount) continue;
  try {
    await client.query('begin');
    await client.query('set local role tronos_owner');
    await client.query(await readFile(join(migrationDirectory, name), 'utf8'));
    await client.query('insert into game.schema_migrations (name) values ($1)', [name]);
    await client.query('commit');
    console.log(`Migration aplicada: ${name}`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

client.release();
await pool.end();
