import { AuthError } from '../auth/authService.js';

const MAX_JSON_BYTES = 16 * 1024;
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

export function setApiHeaders(response, request, config) {
  const origin = request.headers.origin;
  if (origin && config.clientOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  response.setHeader('Vary', 'Origin');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (config.sessionCookieSecure) {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  response.setHeader('Content-Type', JSON_CONTENT_TYPE);
}

export function sendJson(response, status, payload, extraHeaders = {}) {
  for (const [name, value] of Object.entries(extraHeaders)) response.setHeader(name, value);
  response.writeHead(status);
  response.end(JSON.stringify(payload));
}

export function sendRedirect(response, location, extraHeaders = {}) {
  for (const [name, value] of Object.entries(extraHeaders)) response.setHeader(name, value);
  response.removeHeader('Content-Type');
  response.writeHead(302, { Location: location });
  response.end();
}

export async function readJson(request) {
  const contentType = String(request.headers['content-type'] ?? '').toLowerCase();
  if (!/^application\/json(?:\s*;|$)/u.test(contentType)) {
    throw new AuthError('Envie os dados em JSON.', { code: 'UNSUPPORTED_MEDIA_TYPE', status: 415 });
  }
  const declaredLength = Number(request.headers['content-length'] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    throw new AuthError('Solicitação muito grande.', { code: 'PAYLOAD_TOO_LARGE', status: 413 });
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_JSON_BYTES) {
      throw new AuthError('Solicitação muito grande.', { code: 'PAYLOAD_TOO_LARGE', status: 413 });
    }
    chunks.push(chunk);
  }
  try {
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error();
    return payload;
  } catch {
    throw new AuthError('JSON inválido.', { code: 'INVALID_JSON', status: 400 });
  }
}
