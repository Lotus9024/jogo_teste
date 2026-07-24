const CONNECTION_STRING_TLS_KEYS = Object.freeze([
  'ssl',
  'sslcert',
  'sslkey',
  'sslmode',
  'sslnegotiation',
  'sslrootcert',
  'uselibpqcompat'
]);

function extractPemBlocks(pem, labelPattern) {
  return pem.match(new RegExp(`-----BEGIN ${labelPattern}-----[\\s\\S]+?-----END ${labelPattern}-----`, 'gu')) ?? [];
}

function createTlsOptions(databaseCertificate) {
  if (!databaseCertificate) return { rejectUnauthorized: true };

  const certificates = extractPemBlocks(databaseCertificate, 'CERTIFICATE');
  const privateKeys = extractPemBlocks(databaseCertificate, '(?:RSA |EC |ENCRYPTED )?PRIVATE KEY');
  if (!privateKeys.length) {
    return {
      rejectUnauthorized: true,
      ca: databaseCertificate
    };
  }
  if (!certificates.length) {
    throw new Error('O certificado de cliente do PostgreSQL não contém um bloco CERTIFICATE.');
  }

  const certificateChain = certificates.join('\n');
  return {
    rejectUnauthorized: true,
    ca: certificateChain,
    cert: certificateChain,
    key: privateKeys[0]
  };
}

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
    ssl: createTlsOptions(databaseCertificate)
  };
}
