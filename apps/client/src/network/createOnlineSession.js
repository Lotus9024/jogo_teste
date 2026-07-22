import { CARD_BY_ID } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { setArcherMountedState } from '../models/unitModels.js';
import { isMountedArcher, setUnitOwnerFacing, setUnitTeamColor } from '../gameplay/unitState.js';
import { cards } from '../ui/cardView.js';
import { setResource } from '../ui/resourceView.js';
import { updateHealthBadge } from '../ui/unitHealthBadge.js';
import { GameSocketClient, SERVER_EVENTS } from './gameSocket.js';

export function createOnlineSession({
  state,
  app,
  scene,
  camera,
  controls,
  cameraTransition,
  alliedKeep,
  enemyKeep,
  tile,
  half,
  units,
  hoverables,
  damageEffects,
  boardPresentation,
  relations,
  interaction,
  abilities,
  handController,
  devController,
  deckBuilder,
  callbacks,
}) {
  const socket = new GameSocketClient();
  const lobbyError = document.querySelector('#lobby-error');
  const gameError = document.querySelector('#game-error');
  const connectionState = document.querySelector('#connection-state');

  function sendAction(action) {
    if (state.onlineState) socket.sendAction(action, state.onlineState.state.version);
  }

  function onlineUnit(data) {
    const index = cards.findIndex(card => card.id === data.cardId);
    const unit = handController.makeSummonedUnit(index);
    const card = cards[index];
    unit.userData = {
      ...unit.userData,
      serverUnitId: data.id,
      ownerSeat: data.ownerSeat,
      cardId: data.cardId,
      cardIndex: index,
      hp: data.hp,
      maxHp: data.maxHp ?? card.hp,
      actionUsed: data.actionUsed,
      movedThisTurn: Boolean(data.movedThisTurn),
      attackedThisTurn: Boolean(data.attackedThisTurn),
      bonusMoves: data.bonusMoves ?? 0,
      attackPenalty: data.attackPenalty ?? 0,
      abilityUsed: data.abilityUsed,
      abilityReadyTurn: data.abilityReadyTurn ?? 0,
      instantUsedRound: data.instantUsedRound,
      instantReadyTurn: data.instantReadyTurn ?? 0,
      mountedOnTowerId: data.mountedOnTowerId,
      buildReadyRound: data.buildReadyRound,
      attackRange: card.attackRange + (data.cardId === 'archer' && data.mountedOnTowerId ? 1 : 0),
    };
    updateHealthBadge(unit);
    setUnitTeamColor(unit, data.ownerSeat === 1 ? 0x168cff : 0xff352f);
    handController.applyConstructionState(unit, Boolean(data.underConstruction));
    unit.position.set(data.x * tile - half, 0.06, data.z * tile - half);
    setUnitOwnerFacing(unit, data.cardId, data.ownerSeat);
    setArcherMountedState(unit, false);
    return unit;
  }

  function reconcileOnlineUnits(serverUnits) {
    const nextById = new Map(serverUnits.map(data => [data.id, data]));
    units.forEach(unit => {
      const next = nextById.get(unit.userData.serverUnitId);
      const lost = Math.max(0, unit.userData.hp - (next?.hp ?? 0));
      if (lost) damageEffects.show(unit.position, lost);
    });
    interaction.clearMovementGrid();
    abilities.clearMageTargets();
    units.splice(0).forEach(unit => scene.remove(unit));
    hoverables.splice(0);
    state.selected = null;
    abilities.syncInstantCommand();
    abilities.syncMageCommands();
    serverUnits.forEach(data => {
      const unit = onlineUnit(data);
      units.push(unit);
      hoverables.push(unit);
      scene.add(unit);
    });
    units.filter(isMountedArcher).forEach(unit => {
      const tower = relations.towerForArcher(unit);
      if (tower) relations.placeArcherOnTower(unit, tower);
    });
    abilities.syncAbilityBadges();
    app.dataset.onlineUnits = String(serverUnits.length);
  }

  function setPerspective() {
    cameraTransition.cancel();
    camera.position.set(0, 16, state.selfSeat === 1 ? 5.2 : -5.2);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0.2, 0);
    controls.update();
    app.dataset.seat = String(state.selfSeat);
    app.dataset.perspectiveResets = String(Number(app.dataset.perspectiveResets ?? 0) + 1);
  }

  function applyState(payload) {
    const previous = state.onlineState;
    const shouldSetPerspective = !previous
      || previous.self.seat !== payload.self.seat
      || previous.state.phase === 'waiting';
    state.onlineState = payload;
    state.selfSeat = payload.self.seat;
    handController.showDeploymentArea(false);
    document.querySelector('#waiting-code').textContent = payload.code;
    document.querySelector('#waiting-room').hidden = false;
    document.querySelector('#match-state').hidden = false;
    if (payload.state.phase === 'waiting') {
      document.querySelector('#waiting-status').textContent = 'Aguardando o rei rival...';
      return;
    }
    callbacks.activatePreferredGraphics?.();
    document.querySelector('#online-lobby').classList.add('closed');
    if (shouldSetPerspective) setPerspective();
    if (previous && payload.self.hand.length > previous.self.hand.length) handController.animateServerDraw();
    handController.renderOnlineHand(payload.self.hand, payload.state.units);
    boardPresentation.reconcileFires(payload.state.fires ?? []);
    reconcileOnlineUnits(payload.state.units);
    boardPresentation.reconcileRoads(payload.state.roads ?? []);
    const me = payload.state.players.find(player => player.seat === state.selfSeat);
    const enemy = payload.state.players.find(player => player.seat !== state.selfSeat);
    if (!me || !enemy) return;
    const seatOne = payload.state.players.find(player => player.seat === 1);
    const seatTwo = payload.state.players.find(player => player.seat === 2);
    alliedKeep.scale.set(seatOne?.baseLevel >= 2 ? 1.45 : 1, 1, 1);
    enemyKeep.scale.set(seatTwo?.baseLevel >= 2 ? 1.45 : 1, 1, 1);
    setResource('#self-energy', me.energy, me.maxEnergy ?? GAME_CONFIG.maxEnergy);
    setResource('#self-health', me.baseHp, GAME_CONFIG.startingBaseHp);
    devController.setKingdomProgressHud(me.citizens ?? 0, me.baseLevel ?? 1, enemy.baseLevel ?? 1);
    state.deckRemaining = me.deckCount;
    document.querySelector('#deck-count').textContent = String(state.deckRemaining);
    handController.syncPhysicalDecks(me.deckCount, enemy.deckCount);
    document.querySelector('.enemy-base-tag i').style.width = `${Math.max(0, enemy.baseHp / GAME_CONFIG.startingBaseHp * 100)}%`;
    document.querySelector('.enemy-base-tag').setAttribute(
      'aria-label',
      `Castelo inimigo nível ${enemy.baseLevel ?? 1}, vida ${enemy.baseHp} de ${GAME_CONFIG.startingBaseHp}`,
    );
    const mine = payload.state.activeSeat === state.selfSeat;
    const finished = payload.state.phase === 'finished';
    document.querySelector('#turn-label').textContent = finished
      ? (payload.state.winnerSeat === state.selfSeat ? 'VITÓRIA' : 'DERROTA')
      : (mine ? 'SEU TURNO' : 'TURNO RIVAL');
    document.querySelector('#end-turn').disabled = !mine || finished;
    devController.syncTurnRoundStatus(payload.state.activeSeat, payload.state.round);
    abilities.syncAbilityBadges();
  }

  function start() {
    socket.addEventListener('connected', () => {
      connectionState.textContent = 'SERVIDOR CONECTADO';
      lobbyError.textContent = '';
      document.querySelectorAll('#create-room,#join-room').forEach(button => { button.disabled = false; });
    });
    socket.addEventListener('disconnected', () => {
      connectionState.textContent = 'RECONECTANDO...';
      lobbyError.textContent = 'Reconectando ao servidor da partida...';
      document.querySelectorAll('#create-room,#join-room').forEach(button => { button.disabled = true; });
    });
    socket.addEventListener(SERVER_EVENTS.ROOM_STATE, event => {
      lobbyError.textContent = '';
      gameError.textContent = '';
      applyState(event.detail);
    });
    socket.addEventListener(SERVER_EVENTS.ERROR, event => {
      const message = String(event.detail.message ?? 'Erro na partida.');
      if (document.querySelector('#online-lobby').classList.contains('closed')) callbacks.showGameError?.(message);
      else lobbyError.textContent = message;
    });
    document.querySelectorAll('#create-room,#join-room').forEach(button => { button.disabled = true; });
    document.querySelector('#room-code').addEventListener('input', event => {
      event.target.value = event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
    });
    document.querySelector('#create-room').addEventListener('click', () => {
      try { socket.createRoom(document.querySelector('#player-name').value, deckBuilder.getDeckCardIds()); }
      catch (error) { lobbyError.textContent = error.message; deckBuilder.open(); }
    });
    document.querySelector('#join-room').addEventListener('click', () => {
      try {
        socket.joinRoom(
          document.querySelector('#room-code').value,
          document.querySelector('#player-name').value,
          deckBuilder.getDeckCardIds(),
        );
      } catch (error) { lobbyError.textContent = error.message; deckBuilder.open(); }
    });
    socket.connect();
    setInterval(() => {
      if (!state.onlineState?.state.turnEndsAt) return;
      const remaining = Math.max(0, state.onlineState.state.turnEndsAt - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor(remaining % 60000 / 1000);
      document.querySelector('#turn-clock').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 250);
  }

  return { start, sendAction, setPerspective, applyState };
}
