function cleanRoomCode(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
}

function formValue(form, selector) {
  return form.querySelector(selector)?.value?.trim() ?? '';
}

export function createNexusLobbyController({
  api,
  onlineSession,
  deckBuilder,
}) {
  const lobby = document.querySelector('#online-lobby');
  const errorOutput = document.querySelector('#lobby-error');
  const deckMessage = document.querySelector('#deck-required-message');
  const protectedActions = ['#open-rooms', '#open-create-room', '#play-ai']
    .map(selector => document.querySelector(selector))
    .filter(Boolean);
  let account = null;
  let socketReady = false;
  let busy = false;
  let pendingRoomCancelled = false;

  function showScreen(name) {
    lobby.querySelectorAll('[data-lobby-screen]').forEach(screen => {
      screen.hidden = screen.dataset.lobbyScreen !== name;
    });
    lobby.dataset.screen = name;
    errorOutput.textContent = '';
  }

  function setBusy(next) {
    busy = next;
    lobby.setAttribute('aria-busy', String(next));
    lobby.querySelectorAll('button').forEach(button => {
      if (next) {
        button.dataset.busyWasDisabled = String(button.disabled);
        button.disabled = true;
      } else if (Object.hasOwn(button.dataset, 'busyWasDisabled')) {
        button.disabled = button.dataset.busyWasDisabled === 'true';
        delete button.dataset.busyWasDisabled;
      }
    });
    syncDeckGate();
  }

  function syncDeckGate() {
    const hasDeck = deckBuilder.hasValidDeck();
    const canPlay = Boolean(account && socketReady && hasDeck && !busy);
    protectedActions.forEach(button => { button.disabled = !canPlay; });
    deckMessage.hidden = hasDeck;
    lobby.dataset.hasDeck = String(hasDeck);
  }

  function applySession(session) {
    account = session?.authenticated ? session.player : null;
    if (!account) {
      deckBuilder.setDeckCardIds([]);
      showScreen('entry');
      return;
    }
    deckBuilder.setDeckCardIds(session.deckCardIds ?? [], { persist: true });
    const kingName = document.querySelector('#current-king-name');
    if (kingName) kingName.textContent = account.name;
    showScreen('hub');
    onlineSession.setTicketProvider(() => api.createSocketTicket());
    if (deckBuilder.hasValidDeck()) onlineSession.connect();
    syncDeckGate();
  }

  async function submit(task) {
    if (busy) return;
    errorOutput.textContent = '';
    setBusy(true);
    try {
      applySession(await task());
    } catch (error) {
      errorOutput.textContent = error.message;
    } finally {
      setBusy(false);
    }
  }

  function renderRooms(rooms = []) {
    const container = document.querySelector('#rooms-list');
    container.replaceChildren();
    if (!rooms.length) {
      const empty = document.createElement('p');
      empty.className = 'nexus-empty-state';
      empty.textContent = 'Nenhuma sala disponível agora.';
      container.append(empty);
      return;
    }
    rooms.forEach(room => {
      const isPrivate = Boolean(room.locked || room.visibility === 'private');
      const card = document.createElement('article');
      card.className = 'nexus-room-card';
      card.dataset.roomPrivate = String(isPrivate);

      const copy = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = room.name || 'Sala sem nome';
      const detail = document.createElement('small');
      const playerCount = Number(room.playerCount ?? room.players ?? 0);
      const capacity = Number(room.capacity ?? 2);
      detail.textContent = `${playerCount}/${capacity} jogadores`;
      copy.append(title, detail);

      const action = document.createElement('button');
      action.type = 'button';
      if (isPrivate) {
        action.textContent = 'PRIVADA';
        action.disabled = true;
      } else if (playerCount >= capacity) {
        action.textContent = 'ESPECTAR';
        action.addEventListener('click', () => joinRoom(room.code, { spectate: true }));
      } else {
        action.textContent = 'ENTRAR';
        action.addEventListener('click', () => joinRoom(room.code));
      }
      card.append(copy, action);
      container.append(card);
    });
  }

  function joinRoom(code, { spectate = false } = {}) {
    const roomCode = cleanRoomCode(code);
    if (roomCode.length !== 6) {
      errorOutput.textContent = 'Digite um código de sala válido.';
      return;
    }
    errorOutput.textContent = '';
    pendingRoomCancelled = false;
    showScreen('waiting');
    document.querySelector('#waiting-code').textContent = roomCode;
    document.querySelector('#waiting-status').textContent = spectate
      ? 'Entrando como espectador...'
      : 'Entrando na sala...';
    if (spectate) onlineSession.spectateRoom(roomCode);
    else onlineSession.joinRoom(roomCode);
  }

  function mountForms() {
    document.querySelector('#guest-entry')?.addEventListener('click', () => showScreen('guest'));
    document.querySelector('#register-entry')?.addEventListener('click', () => showScreen('register'));
    document.querySelector('#login-entry')?.addEventListener('click', () => showScreen('login'));
    document.querySelector('#show-login')?.addEventListener('click', () => showScreen('login'));
    document.querySelector('#show-register')?.addEventListener('click', () => showScreen('register'));
    lobby.querySelectorAll('[data-lobby-back]').forEach(button => {
      button.addEventListener('click', () => {
        const currentScreen = button.closest('[data-lobby-screen]')?.dataset.lobbyScreen;
        if (currentScreen === 'waiting') {
          pendingRoomCancelled = true;
          if (document.querySelector('#waiting-code')?.textContent !== '------') {
            try {
              onlineSession.leaveRoom();
            } catch {
              // The server may already have closed the room; returning to the hub is still safe.
            }
          }
        }
        showScreen(button.dataset.lobbyBack || (account ? 'hub' : 'entry'));
      });
    });

    document.querySelector('#guest-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const name = formValue(event.currentTarget, '#guest-king-name');
      void submit(() => api.continueAsGuest(name));
    });
    document.querySelector('#register-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const name = formValue(event.currentTarget, '#register-king-name');
      const password = event.currentTarget.querySelector('#register-vault-password')?.value ?? '';
      void submit(() => api.register(name, password));
    });
    document.querySelector('#login-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const name = formValue(event.currentTarget, '#login-king-name');
      const password = event.currentTarget.querySelector('#login-vault-password')?.value ?? '';
      void submit(() => api.login(name, password));
    });
    document.querySelector('#discord-register')?.addEventListener('click', () => api.startDiscord());
    document.querySelector('#discord-login')?.addEventListener('click', () => api.startDiscord());
    document.querySelector('#logout-account')?.addEventListener('click', async () => {
      try {
        await api.logout();
      } finally {
        onlineSession.disconnect();
        account = null;
        socketReady = false;
        deckBuilder.setDeckCardIds([]);
        showScreen('entry');
      }
    });
  }

  function mountMatchMenu() {
    deckBuilder.setSaveHandler(async cardIds => {
      const session = await api.saveDeck(cardIds);
      if (session?.player) account = session.player;
      if (account) {
        if (socketReady) {
          onlineSession.disconnect();
          socketReady = false;
        }
        onlineSession.connect();
      }
    });
    deckBuilder.subscribe(syncDeckGate);
    document.querySelector('#open-rooms')?.addEventListener('click', () => {
      pendingRoomCancelled = false;
      showScreen('rooms');
      onlineSession.requestRooms();
    });
    document.querySelector('#refresh-rooms')?.addEventListener('click', () => onlineSession.requestRooms());
    document.querySelector('#open-create-room')?.addEventListener('click', () => {
      pendingRoomCancelled = false;
      showScreen('create-room');
    });
    document.querySelector('#play-ai')?.addEventListener('click', () => {
      pendingRoomCancelled = false;
      showScreen('waiting');
      document.querySelector('#waiting-code').textContent = 'IA';
      document.querySelector('#waiting-status').textContent = 'Preparando o rival...';
      onlineSession.createAiRoom();
    });
    document.querySelector('#room-code')?.addEventListener('input', event => {
      event.target.value = cleanRoomCode(event.target.value);
    });
    document.querySelector('#join-room-code')?.addEventListener('click', () => {
      joinRoom(document.querySelector('#room-code')?.value);
    });
    document.querySelector('#create-room-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const visibility = new FormData(event.currentTarget).get('room-visibility') === 'private'
        ? 'private'
        : 'public';
      const name = formValue(event.currentTarget, '#room-display-name');
      pendingRoomCancelled = false;
      showScreen('waiting');
      document.querySelector('#waiting-code').textContent = '------';
      document.querySelector('#waiting-status').textContent = 'Criando a sala...';
      onlineSession.createRoom({ name, visibility });
    });
  }

  function mountSessionEvents() {
    onlineSession.addEventListener('connected', () => {
      socketReady = true;
      syncDeckGate();
    });
    onlineSession.addEventListener('disconnected', () => {
      socketReady = false;
      syncDeckGate();
    });
    onlineSession.addEventListener('directory', event => renderRooms(event.detail?.rooms ?? event.detail ?? []));
    onlineSession.addEventListener('waiting', event => {
      if (pendingRoomCancelled) {
        pendingRoomCancelled = false;
        try {
          onlineSession.leaveRoom();
        } catch {
          // The connection may have closed while the room was being created.
        }
        showScreen('hub');
        return;
      }
      showScreen('waiting');
      document.querySelector('#waiting-code').textContent = event.detail.code ?? '------';
      document.querySelector('#waiting-status').textContent = 'Aguardando o rei rival...';
    });
    onlineSession.addEventListener('match-started', () => {
      lobby.classList.add('closed');
    });
    onlineSession.addEventListener('session-error', event => {
      const message = event.detail?.message ?? 'Não foi possível acessar a sala.';
      if (!lobby.classList.contains('closed')) showScreen(account ? 'hub' : 'entry');
      errorOutput.textContent = message;
    });
  }

  async function start() {
    mountForms();
    mountMatchMenu();
    mountSessionEvents();
    syncDeckGate();
    try {
      applySession(await api.restoreSession());
    } catch {
      showScreen('entry');
      errorOutput.textContent = 'Não foi possível verificar sua sessão.';
    }
  }

  return { start, showScreen, renderRooms, syncDeckGate };
}
