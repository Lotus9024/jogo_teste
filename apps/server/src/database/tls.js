const CONNECTION_STRING_TLS_KEYS = Object.freeze([
  'ssl',
  'sslcert',
  'sslkey',
  'sslmode',
  'sslnegotiation',
  'sslrootcert',
  'uselibpqcompat'
]);

export function createDatabaseConnectionOptions(connectionString, {
  databaseSsl,
  databaseCertificate
}) {
  if (!databaseSsl) {
    return {
      connectionString,
      ssl: false
    };
  }

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('A URL do PostgreSQL é inválida.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('A URL do PostgreSQL deve usar postgres:// ou postgresql://.');
  }

  for (const key of CONNECTION_STRING_TLS_KEYS) url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: true,
      ...(databaseCertificate ? { ca: databaseCertificate } : {})
    }
  };
}
