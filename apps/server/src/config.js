import 'dotenv/config';

export const config = Object.freeze({
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:4173',
  databaseUrl: process.env.DATABASE_URL ?? '',
  databaseSsl: process.env.DATABASE_SSL === 'true'
});
