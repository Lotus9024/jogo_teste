export function parseCookies(header) {
  const cookies = Object.create(null);
  for (const part of String(header ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && !Object.hasOwn(cookies, name)) cookies[name] = value;
  }
  return cookies;
}

export function cookieName(config, purpose) {
  const prefix = config.sessionCookieSecure ? '__Host-' : '';
  return `${prefix}nexus_${purpose}`;
}

export function serializeCookie(name, value, {
  maxAge,
  httpOnly = true,
  secure = false,
  sameSite = 'Lax'
} = {}) {
  const attributes = [
    `${name}=${value}`,
    'Path=/',
    `SameSite=${sameSite}`
  ];
  if (httpOnly) attributes.push('HttpOnly');
  if (secure) attributes.push('Secure');
  if (Number.isFinite(maxAge)) attributes.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  return attributes.join('; ');
}

export function sessionTokenFrom(request, config) {
  return parseCookies(request.headers.cookie)[cookieName(config, 'session')] ?? '';
}

export function csrfTokenFrom(request) {
  return String(request.headers['x-csrf-token'] ?? '');
}

export function sessionCookie(config, session) {
  return serializeCookie(cookieName(config, 'session'), session.sessionToken, {
    maxAge: Math.max(1, Math.round((session.expiresAt.getTime() - Date.now()) / 1000)),
    secure: config.sessionCookieSecure
  });
}

export function clearSessionCookie(config) {
  return serializeCookie(cookieName(config, 'session'), '', {
    maxAge: 0,
    secure: config.sessionCookieSecure
  });
}

export function oauthCookie(config, state) {
  return serializeCookie(cookieName(config, 'oauth'), state, {
    maxAge: config.oauthStateTtlSeconds,
    secure: config.sessionCookieSecure
  });
}

export function clearOauthCookie(config) {
  return serializeCookie(cookieName(config, 'oauth'), '', {
    maxAge: 0,
    secure: config.sessionCookieSecure
  });
}

export function callbackRedirect(config, success) {
  const url = new URL(config.publicClientUrl);
  url.searchParams.set(success ? 'auth' : 'authError', 'discord');
  return url.toString();
}
