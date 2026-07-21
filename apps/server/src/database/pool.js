import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;
const databaseTls = config.databaseSsl
  ? config.databaseCertificate
    ? { cert: config.databaseCertificate, key: config.databaseCertificate, rejectUnauthorized: false }
    : { rejectUnauthorized: false }
  : false;

export const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      ssl: databaseTls,
      max: 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 3_000,
      statement_timeout: 5_000,
      query_timeout: 6_000,
      application_name: 'tronos-server'
    })
  : null;

export async function databaseHealth() {
  if (!pool) return { configured: false, connected: false };
  try {
    await pool.query('select 1');
    return { configured: true, connected: true };
  } catch (error) {
    return { configured: true, connected: false, error: error.message };
  }
}
