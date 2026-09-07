export function renderRoomDirectory(container, rooms = [], onJoin) {
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
        action.addEventListener('click', () => onJoin(room.code, { spectate: true }));
      } else {
        action.textContent = 'ENTRAR';
        action.addEventListener('click', () => onJoin(room.code));
      }
      card.append(copy, action);
      container.append(card);
    });
  }
