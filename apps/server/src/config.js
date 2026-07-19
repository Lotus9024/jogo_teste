import { config as loadEnvironment } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvironment({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env'), quiet: true });

export const config = Object.freeze({
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:4173',
  databaseUrl: process.env.DATABASE_URL ?? '',
  migrationDatabaseUrl: process.env.MIGRATION_DATABASE_URL ?? '',
  databaseSsl: process.env.DATABASE_SSL === 'true'
});
