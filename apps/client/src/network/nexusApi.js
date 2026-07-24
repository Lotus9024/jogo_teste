const JSON_HEADERS = Object.freeze({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-Nexus-Request': 'browser',
});

export function resolveApiBase({
  configuredUrl = import.meta.env?.VITE_API_URL,
  hostname = globalThis.location?.hostname ?? '',
} = {}) {
  const configured = configuredUrl?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const localHost = hostname === 'localhost' || hostname === '127.0.0.1'
    || /^10\./.test(hostname) || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  return localHost ? `http://${hostname}:3001/api` : '/api';
}

export class NexusApi {
  constructor({
    baseUrl = resolveApiBase(),
    fetchImpl = globalThis.fetch?.bind(globalThis),
    navigate = url => globalThis.location?.assign(url),
  } = {}) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.navigate = navigate;
    this.csrfToken = '';
  }

  async restoreSession() {
    const response = await this.#request('/auth/session', { allowUnauthenticated: true });
    return this.#rememberSession(response);
  }

  async continueAsGuest(name) {
    return this.#rememberSession(await this.#request('/auth/guest', {
      method: 'POST',
      body: { name },
    }));
  }

  async register(name, password) {
    return this.#rememberSession(await this.#request('/auth/register', {
      method: 'POST',
      body: { name, password },
    }));
  }

  async login(name, password) {
    return this.#rememberSession(await this.#request('/auth/login', {
      method: 'POST',
      body: { name, password },
    }));
  }

  async logout() {
    await this.#request('/auth/logout', { method: 'POST', csrf: true });
    this.csrfToken = '';
  }

  startDiscord() {
    this.navigate(`${this.baseUrl}/auth/discord/start`);
  }

  async saveDeck(cardIds) {
    const response = await this.#request('/deck', {
      method: 'PUT',
      body: { cardIds },
      csrf: true,
    });
    return this.#rememberSession(response);
  }

  async createSocketTicket() {
    const response = await this.#request('/auth/socket-ticket', {
      method: 'POST',
      body: {},
      csrf: true,
    });
    if (!response?.ticket) throw new Error('Não foi possível conectar à partida.');
    return response.ticket;
  }

  async #request(path, {
    method = 'GET',
    body,
    csrf = false,
    allowUnauthenticated = false,
  } = {}) {
    if (!this.fetchImpl) throw new Error('Este navegador não oferece suporte à conexão segura.');
    const headers = { ...JSON_HEADERS };
    if (csrf) {
      if (!this.csrfToken) throw new Error('Sua sessão expirou. Entre novamente.');
      headers['X-CSRF-Token'] = this.csrfToken;
    }
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = response.status === 204
      ? {}
      : await response.json().catch(() => ({}));
    if (allowUnauthenticated && response.status === 401) return { authenticated: false };
    if (!response.ok) {
      const error = new Error(payload?.message || 'Não foi possível concluir essa ação.');
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  #rememberSession(payload) {
    if (payload?.csrfToken) this.csrfToken = payload.csrfToken;
    if (payload?.authenticated === false) this.csrfToken = '';
    return payload;
  }
}
