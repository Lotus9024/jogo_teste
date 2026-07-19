import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

const secretFile = process.env.TRONOS_ADMIN_SECRET_FILE ?? join(process.env.LOCALAPPDATA, 'TronosEmRuinas', 'postgres-admin.json');
const envFile = new URL('../.env', import.meta.url);
const secrets = JSON.parse((await readFile(secretFile, 'utf8')).replace(/^\uFEFF/, ''));
secrets.port = 55432;
secrets.appPassword ??= randomBytes(24).toString('hex').toUpperCase();
secrets.migratorPassword ??= randomBytes(24).toString('hex').toUpperCase();

assertGeneratedSecret(secrets.password);
assertGeneratedSecret(secrets.appPassword);
assertGeneratedSecret(secrets.migratorPassword);

const admin = new pg.Client({ host: '127.0.0.1', port: 55432, database: 'postgres', user: 'tronos_admin', password: secrets.password, application_name: 'tronos-provisioner' });
await admin.connect();

await ensureRole(admin, 'tronos_owner', "NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION");
await ensureRole(admin, 'tronos_migrator', `LOGIN PASSWORD ${literal(secrets.migratorPassword)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT CONNECTION LIMIT 3`);
await ensureRole(admin, 'tronos_app', `LOGIN PASSWORD ${literal(secrets.appPassword)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT CONNECTION LIMIT 15`);
await admin.query('grant tronos_owner to tronos_migrator');

const database = await admin.query("select 1 from pg_database where datname = 'tronos'");
if (!database.rowCount) await admin.query('create database tronos owner tronos_owner template template0 encoding \'UTF8\'');
await admin.query('revoke all on database tronos from public');
await admin.query('grant connect on database tronos to tronos_app, tronos_migrator');
await admin.end();

const game = new pg.Client({ host: '127.0.0.1', port: 55432, database: 'tronos', user: 'tronos_admin', password: secrets.password, application_name: 'tronos-provisioner' });
await game.connect();
await game.query('revoke all on schema public from public');
await game.query('create schema if not exists game authorization tronos_owner');
await game.query("alter role tronos_app in database tronos set search_path to game, pg_catalog");
await game.query("alter role tronos_migrator in database tronos set search_path to game, pg_catalog");
await game.query("alter role tronos_app in database tronos set statement_timeout to '5s'");
await game.query("alter role tronos_app in database tronos set idle_in_transaction_session_timeout to '10s'");
await game.query("alter role tronos_migrator in database tronos set statement_timeout to '60s'");
await game.end();

await writeFile(secretFile, JSON.stringify(secrets, null, 2), { encoding: 'utf8', mode: 0o600 });
await writeFile(envFile, [
  'PORT=3001',
  'HOST=0.0.0.0',
  'CLIENT_ORIGIN=http://localhost:4173',
  `DATABASE_URL=postgresql://tronos_app:${secrets.appPassword}@127.0.0.1:55432/tronos`,
  `MIGRATION_DATABASE_URL=postgresql://tronos_migrator:${secrets.migratorPassword}@127.0.0.1:55432/tronos`,
  'DATABASE_SSL=false',
  ''
].join('\n'), { encoding: 'utf8', mode: 0o600 });

console.log('Banco tronos provisionado com papéis separados e credenciais locais.');

async function ensureRole(client, name, attributes) {
  const exists = await client.query('select 1 from pg_roles where rolname = $1', [name]);
  if (exists.rowCount) await client.query(`alter role ${name} with ${attributes}`);
  else await client.query(`create role ${name} with ${attributes}`);
}

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function assertGeneratedSecret(value) {
  if (!/^[A-F0-9]{48}$/.test(value)) throw new Error('Credencial local inválida; gere novamente o arquivo administrativo.');
}
