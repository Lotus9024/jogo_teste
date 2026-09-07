import { AuthError } from '../auth/authService.js';

export function clientIp(request, config) {
  if (config.trustProxy) {
    const forwarded = String(request.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    if (forwarded && forwarded.length <= 64) return forwarded;
  }
  return String(request.socket?.remoteAddress ?? 'unknown').slice(0, 64);
}

export function requireTrustedWrite(request, config) {
  const origin = request.headers.origin;
  const hasTrustedOrigin = typeof origin === 'string' && config.clientOrigins.includes(origin);
  const localTestRequest = config.nodeEnv !== 'production' && !origin;
  if ((!hasTrustedOrigin && !localTestRequest) || request.headers['x-nexus-request'] !== 'browser') {
    throw new AuthError('Solicitação inválida.', { code: 'FORBIDDEN', status: 403 });
  }
}

export function validateRuntimeSecurity(config, repository) {
  if (config.nodeEnv !== 'production') return;
  if (repository.storageKind !== 'postgres') throw new Error('PostgreSQL é obrigatório em produção.');
  if (!config.databaseSsl) throw new Error('DATABASE_SSL=true é obrigatório em produção.');
  if (!config.sessionCookieSecure) throw new Error('Cookies seguros são obrigatórios em produção.');
  if (!config.clientOrigins.length) throw new Error('CLIENT_ORIGIN é obrigatória em produção.');
  let clientUrl;
  try {
    clientUrl = new URL(config.publicClientUrl);
  } catch {
    throw new Error('PUBLIC_CLIENT_URL é obrigatória em produção.');
  }
  if (clientUrl.protocol !== 'https:' || !config.clientOrigins.includes(clientUrl.origin)) {
    throw new Error('PUBLIC_CLIENT_URL deve usar HTTPS e estar em CLIENT_ORIGIN.');
  }
  if (config.discordRedirectUri) {
    let discordRedirectUrl;
    try {
      discordRedirectUrl = new URL(config.discordRedirectUri);
    } catch {
      throw new Error('DISCORD_REDIRECT_URI é inválida.');
    }
    if (
      discordRedirectUrl.protocol !== 'https:'
      || discordRedirectUrl.origin !== clientUrl.origin
      || discordRedirectUrl.pathname !== '/api/auth/discord/callback'
    ) {
      throw new Error(
        'DISCORD_REDIRECT_URI deve usar o mesmo domínio público do jogo e o caminho /api/auth/discord/callback.'
      );
    }
  }
}
