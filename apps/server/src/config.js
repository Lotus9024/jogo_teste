import { config as loadEnvironment } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvironment({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env'), quiet: true });

const clientOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:4173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

export const config = Object.freeze({
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  clientOrigins: Object.freeze(clientOrigins),
  databaseUrl: process.env.DATABASE_URL ?? '',
  migrationDatabaseUrl: process.env.MIGRATION_DATABASE_URL ?? '',
  databaseSsl: process.env.DATABASE_SSL === 'true'
});
