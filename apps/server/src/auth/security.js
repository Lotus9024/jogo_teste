import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_PARAMETERS = Object.freeze({ N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const PASSWORD_PREFIX = 'scrypt';

export function createOpaqueToken(byteLength = 32) {
  return randomBytes(byteLength).toString('base64url');
}

export function hashOpaqueToken(token) {
  return createHash('sha256').update(String(token), 'utf8').digest();
}

export function hashRateLimitKey(value) {
  return hashOpaqueToken(`nexus-rate-limit:${String(value)}`);
}

export function createSessionCsrfToken(sessionToken) {
  return `v1.${createHmac('sha256', String(sessionToken))
    .update('nexus-session-csrf-v1', 'utf8')
    .digest('base64url')}`;
}

export function createPkceChallenge(verifier) {
  return hashOpaqueToken(verifier).toString('base64url');
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_PARAMETERS);
  return [
    PASSWORD_PREFIX,
    SCRYPT_PARAMETERS.N,
    SCRYPT_PARAMETERS.r,
    SCRYPT_PARAMETERS.p,
    salt.toString('base64url'),
    Buffer.from(key).toString('base64url')
  ].join('$');
}

export async function verifyPassword(password, encodedHash) {
  try {
    const [prefix, n, r, p, saltValue, expectedValue] = String(encodedHash).split('$');
    if (prefix !== PASSWORD_PREFIX || !saltValue || !expectedValue) return false;
    const parameters = {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024
    };
    if (parameters.N !== SCRYPT_PARAMETERS.N || parameters.r !== SCRYPT_PARAMETERS.r || parameters.p !== SCRYPT_PARAMETERS.p) {
      return false;
    }
    const expected = Buffer.from(expectedValue, 'base64url');
    if (expected.length !== SCRYPT_KEY_LENGTH) return false;
    const actual = Buffer.from(await scrypt(
      password,
      Buffer.from(saltValue, 'base64url'),
      expected.length,
      parameters
    ));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function safeTokenEqual(left, right) {
  const leftHash = hashOpaqueToken(left);
  const rightHash = hashOpaqueToken(right);
  return timingSafeEqual(leftHash, rightHash);
}
