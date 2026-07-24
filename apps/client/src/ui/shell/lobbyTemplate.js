function screenHeader({ title, back = false }) {
  return `
    <header class="nexus-screen-header">
      ${back ? '<button type="button" class="nexus-back" data-lobby-back aria-label="Voltar">‹</button>' : ''}
      <h2>${title}</h2>
    </header>`;
}

export function lobbyTemplate() {
  const hostname = globalThis.location?.hostname ?? '';
  const isLocalRuntime = hostname === 'localhost'
    || hostname === '127.0.0.1'
    || /^10\./u.test(hostname)
    || /^192\.168\./u.test(hostname)
    || /^172\.(?:1[6-9]|2\d|3[01])\./u.test(hostname);
  const devModeButton = isLocalRuntime
    ? '<button type="button" id="dev-mode" class="nexus-dev-button">DEV MODE</button>'
    : '';

  return `
    <section id="online-lobby" class="online-lobby" aria-labelledby="nexus-title">
      <div class="nexus-lobby">
        <div class="nexus-brand" aria-label="Nexus">
          <span aria-hidden="true">✦</span>
          <div>
            <h1 id="nexus-title">Nexus</h1>
          </div>
        </div>

        <section class="nexus-screen" data-lobby-screen="entry">
          ${screenHeader({
            eyebrow: 'BEM-VINDO AO NEXUS',
            title: 'Escolha seu caminho',
          })}
          <div class="nexus-actions">
            <button type="button" id="guest-entry" class="nexus-primary">JOGAR SEM LOGIN</button>
            <button type="button" id="register-entry">REGISTRAR</button>
            <button type="button" id="login-entry" class="nexus-quiet">JÁ TENHO LOGIN</button>
          </div>
        </section>

        <section class="nexus-screen" data-lobby-screen="guest" hidden>
          ${screenHeader({
            eyebrow: 'JOGAR SEM LOGIN',
            title: 'Nomeie seu rei',
            back: true,
          })}
          <form id="guest-form" class="nexus-form">
            <label for="guest-king-name">Nome de rei</label>
            <input id="guest-king-name" name="kingName" type="text" minlength="2" maxlength="24" autocomplete="nickname" required />
            <button type="submit" class="nexus-primary">CONTINUAR</button>
          </form>
        </section>

        <section class="nexus-screen" data-lobby-screen="register" hidden>
          ${screenHeader({
            eyebrow: 'NOVO REINO',
            title: 'Registrar',
            back: true,
          })}
          <form id="register-form" class="nexus-form">
            <label for="register-king-name">Nome de rei</label>
            <input id="register-king-name" name="kingName" type="text" minlength="2" maxlength="24" autocomplete="username" required />
            <label for="register-vault-password">Senha do cofre do rei</label>
            <input id="register-vault-password" name="password" type="password" minlength="10" maxlength="128" autocomplete="new-password" required />
            <button type="submit" class="nexus-primary">CRIAR CONTA</button>
          </form>
          <div class="nexus-divider"><span>OU</span></div>
          <button type="button" id="discord-register" class="nexus-discord-button"><span aria-hidden="true">◈</span> REGISTRAR COM DISCORD</button>
          <button type="button" id="show-login" class="nexus-text-button">Já tenho login</button>
        </section>

        <section class="nexus-screen" data-lobby-screen="login" hidden>
          ${screenHeader({
            eyebrow: 'RETORNO DO REI',
            title: 'Login',
            back: true,
          })}
          <form id="login-form" class="nexus-form">
            <label for="login-king-name">Nome de rei</label>
            <input id="login-king-name" name="kingName" type="text" minlength="2" maxlength="24" autocomplete="username" required />
            <label for="login-vault-password">Senha do cofre do rei</label>
            <input id="login-vault-password" name="password" type="password" maxlength="128" autocomplete="current-password" required />
            <button type="submit" class="nexus-primary">ENTRAR</button>
          </form>
          <div class="nexus-divider"><span>OU</span></div>
          <button type="button" id="discord-login" class="nexus-discord-button"><span aria-hidden="true">◈</span> ENTRAR COM DISCORD</button>
          <button type="button" id="show-register" class="nexus-text-button">Não tenho uma conta</button>
        </section>

        <section class="nexus-screen" data-lobby-screen="hub" hidden>
          ${screenHeader({
            eyebrow: 'SALÃO DO REINO',
            title: 'Escolha sua partida',
          })}
          <div class="nexus-account-line">
            <span>Rei <b id="current-king-name">—</b></span>
            <button type="button" id="logout-account">SAIR</button>
          </div>
          <div class="nexus-actions nexus-hub-actions">
            <button type="button" id="open-rooms" disabled>ENTRAR EM SALAS</button>
            <button type="button" id="open-create-room" disabled>CRIAR SALA</button>
            <button type="button" id="play-ai" disabled>JOGAR COM IA</button>
            <button type="button" id="open-deck-builder" class="nexus-deck-button">
              <span>ESCOLHER DECK</span>
              <small id="deck-status">NÃO MONTADO</small>
            </button>
          </div>
          <p id="deck-required-message" class="deck-required-message" role="status">Você não tem um deck</p>
          ${devModeButton}
        </section>

        <section class="nexus-screen" data-lobby-screen="rooms" hidden>
          ${screenHeader({
            eyebrow: 'PARTIDAS ABERTAS',
            title: 'Entrar em salas',
            back: true,
          })}
          <form class="nexus-code-form">
            <label for="room-code">Código da sala</label>
            <div>
              <input id="room-code" name="roomCode" type="text" maxlength="6" autocomplete="off" inputmode="text" placeholder="CÓDIGO" aria-label="Código da sala" />
              <button type="button" id="join-room-code" class="nexus-primary">ENTRAR</button>
            </div>
          </form>
          <div class="nexus-room-heading">
            <h3>Salas disponíveis</h3>
            <button type="button" id="refresh-rooms" aria-label="Atualizar salas">↻</button>
          </div>
          <div id="rooms-list" class="nexus-rooms-list" aria-live="polite">
            <p class="nexus-empty-state">Nenhuma sala encontrada.</p>
          </div>
        </section>

        <section class="nexus-screen" data-lobby-screen="create-room" hidden>
          ${screenHeader({
            eyebrow: 'NOVO CONFRONTO',
            title: 'Criar sala',
            back: true,
          })}
          <form id="create-room-form" class="nexus-form">
            <label for="room-display-name">Nome da sala</label>
            <input id="room-display-name" name="roomName" type="text" minlength="2" maxlength="32" autocomplete="off" required />
            <fieldset class="nexus-visibility">
              <legend>Visibilidade</legend>
              <label><input type="radio" name="room-visibility" value="public" checked /><span><b>Pública</b></span></label>
              <label><input type="radio" name="room-visibility" value="private" /><span><b>Privada</b></span></label>
            </fieldset>
            <button type="submit" class="nexus-primary">CRIAR SALA</button>
          </form>
        </section>

        <section id="waiting-room" class="nexus-screen" data-lobby-screen="waiting" hidden>
          ${screenHeader({
            eyebrow: 'SALA CRIADA',
            title: 'Aguardando rival',
            back: true,
          })}
          <div class="nexus-waiting">
            <small>CÓDIGO DA SALA</small>
            <strong id="waiting-code">------</strong>
            <span id="waiting-status">Aguardando o rei rival...</span>
          </div>
        </section>

        <footer class="nexus-lobby-footer">
          <output id="lobby-error" class="lobby-error" aria-live="polite"></output>
        </footer>
      </div>
    </section>`;
}
