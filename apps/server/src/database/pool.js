import pg from 'pg';
import { config } from '../config.js';
import { createDatabaseConnectionOptions } from './tls.js';

const { Pool } = pg;
if (config.nodeEnv === 'production' && !config.databaseSsl) {
  throw new Error('DATABASE_SSL=true é obrigatório em produção.');
}

export const pool = config.databaseUrl
  ? new Pool({
      ...createDatabaseConnectionOptions(config.databaseUrl, config),
      max: 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 3_000,
      statement_timeout: 5_000,
      query_timeout: 6_000,
      application_name: 'nexus-server'
    })
  : null;

export async function databaseHealth() {
  if (!pool) return { configured: false, connected: false };
  try {
    await pool.query('select 1');
    return { configured: true, connected: true };
  } catch {
    return { configured: true, connected: false };
  }
}
