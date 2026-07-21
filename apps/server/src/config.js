import { config as loadEnvironment } from 'dotenv';
import { networkInterfaces } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvironment({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env'), quiet: true });

const localClientOrigins = Object.values(networkInterfaces())
  .flatMap(addresses => addresses ?? [])
  .filter(address => address.family === 'IPv4')
  .map(address => `http://${address.address}:4173`);

const configuredClientOrigins = (process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const clientOrigins = [...new Set([
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  ...localClientOrigins,
  ...configuredClientOrigins
])];

export const config = Object.freeze({
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  clientOrigins: Object.freeze(clientOrigins),
  databaseUrl: process.env.DATABASE_URL ?? '',
  migrationDatabaseUrl: process.env.MIGRATION_DATABASE_URL ?? '',
  databaseSsl: process.env.DATABASE_SSL === 'true',
  databaseCertificate: process.env.DATABASE_CERTIFICATE_BASE64
    ? Buffer.from(process.env.DATABASE_CERTIFICATE_BASE64, 'base64').toString('utf8')
    : ''
});
