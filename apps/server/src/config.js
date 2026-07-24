import { config as loadEnvironment } from 'dotenv';
import { networkInterfaces } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvironment({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env'), quiet: true });

const nodeEnv = process.env.NODE_ENV ?? 'development';
const localClientOrigins = Object.values(networkInterfaces())
  .flatMap(addresses => addresses ?? [])
  .filter(address => address.family === 'IPv4')
  .map(address => `http://${address.address}:4173`);

function normalizeHttpOrigin(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

const configuredClientOrigins = (process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
  .map(normalizeHttpOrigin)
  .filter(Boolean);

const clientOrigins = [...new Set(nodeEnv === 'production'
  ? configuredClientOrigins
  : [
      'http://localhost:4173',
      'http://127.0.0.1:4173',
      ...localClientOrigins,
      ...configuredClientOrigins
    ])];

function boundedNumber(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

export const config = Object.freeze({
  nodeEnv,
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  clientOrigins: Object.freeze(clientOrigins),
  publicClientUrl: process.env.PUBLIC_CLIENT_URL ?? (nodeEnv === 'production' ? '' : 'http://localhost:4173/'),
  trustProxy: process.env.TRUST_PROXY === 'true',
  sessionCookieSecure: process.env.SESSION_COOKIE_SECURE
    ? process.env.SESSION_COOKIE_SECURE === 'true'
    : nodeEnv === 'production',
  sessionTtlHours: boundedNumber(process.env.SESSION_TTL_HOURS, 168, 1, 720),
  socketTicketTtlSeconds: boundedNumber(process.env.SOCKET_TICKET_TTL_SECONDS, 30, 10, 120),
  socketTicketRateLimit: boundedNumber(process.env.SOCKET_TICKET_RATE_LIMIT, 20, 2, 120),
  socketTicketRateWindowSeconds: boundedNumber(process.env.SOCKET_TICKET_RATE_WINDOW_SECONDS, 60, 10, 3600),
  oauthStateTtlSeconds: boundedNumber(process.env.OAUTH_STATE_TTL_SECONDS, 600, 120, 900),
  oauthStartRateLimit: boundedNumber(process.env.OAUTH_START_RATE_LIMIT, 10, 2, 60),
  oauthStartRateWindowSeconds: boundedNumber(process.env.OAUTH_START_RATE_WINDOW_SECONDS, 900, 60, 3600),
  discordClientId: process.env.DISCORD_CLIENT_ID ?? '',
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
  discordRedirectUri: process.env.DISCORD_REDIRECT_URI ?? '',
  databaseUrl: process.env.DATABASE_URL ?? '',
  migrationDatabaseUrl: process.env.MIGRATION_DATABASE_URL ?? '',
  databaseSsl: process.env.DATABASE_SSL === 'true',
  databaseCertificate: process.env.DATABASE_CERTIFICATE_BASE64
    ? Buffer.from(process.env.DATABASE_CERTIFICATE_BASE64, 'base64').toString('utf8')
    : ''
});
