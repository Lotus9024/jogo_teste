import { CARD_BY_ID } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { setArcherMountedState } from '../models/unitModels.js';
import { isMountedArcher, setUnitOwnerFacing, setUnitTeamColor } from '../gameplay/unitState.js';
import { cards } from '../ui/cardView.js';
import { cardIconMarkup } from '../ui/cardIcon.js';
import { setResource } from '../ui/resourceView.js';
import { ensureAbilityBadge, updateHealthBadge } from '../ui/unitHealthBadge.js';
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
  battleAnimations,
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
  const events = new EventTarget();
  const lobbyError = document.querySelector('#lobby-error');
  const gameError = document.querySelector('#game-error');

  function emit(type, detail = {}) {
    events.dispatchEvent(new CustomEvent(type, { detail }));
  }

  function sendAction(action) {
    if (state.onlineState && !state.onlineState.self?.spectator) {
      socket.sendAction(action, state.onlineState.state.version);
    }
  }

  function syncOnlineUnitData(unit, data, card, index) {
    const motionState = {
      isMoving: unit.userData.isMoving,
      cloneAnimating: unit.userData.cloneAnimating,
    };
    unit.userData = {
      ...unit.userData,
      ...motionState,
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
      bonusAttacks: data.bonusAttacks ?? 0,
      attackPenalty: data.attackPenalty ?? 0,
      movementPenalty: data.movementPenalty ?? 0,
      movementPenaltyTurns: data.movementPenaltyTurns ?? 0,
      abilityUsed: data.abilityUsed,
      abilityReadyTurn: data.abilityReadyTurn ?? 0,
      instantUsedRound: data.instantUsedRound,
      instantReadyTurn: data.instantReadyTurn ?? 0,
      isGoblinClone: Boolean(data.isGoblinClone),
      clonedFromCardId: data.clonedFromCardId ?? null,
      cloneDamageBonus: data.cloneDamageBonus ?? 0,
      mountedOnTowerId: data.mountedOnTowerId,
      buildReadyRound: data.buildReadyRound,
      attackRange: card.attackRange,
      damage: card.damage,
    };
    ensureAbilityBadge(unit);
    updateHealthBadge(unit);
    setUnitTeamColor(unit, data.ownerSeat === 1 ? 0x168cff : 0xff352f);
    handController.applyConstructionState(unit, Boolean(data.underConstruction));
    setUnitOwnerFacing(unit, data.cardId, data.ownerSeat);
    return unit;
  }

  function onlineUnit(data) {
    const index = cards.findIndex(card => card.id === data.cardId);
    const unit = handController.makeSummonedUnit(index);
    const card = cards[index];
    syncOnlineUnitData(unit, data, card, index);
    unit.position.set(data.x * tile - half, 0.06, data.z * tile - half);
    setArcherMountedState(unit, false);
    return unit;
  }

  function reconcileOnlineUnits(serverUnits, effects = []) {
    const nextById = new Map(serverUnits.map(data => [data.id, data]));
    const previousUnits = [...units];
    const existingById = new Map(previousUnits.map(unit => [unit.userData.serverUnitId, unit]));
    previousUnits.forEach(unit => {
      const next = nextById.get(unit.userData.serverUnitId);
      const lost = Math.max(0, unit.userData.hp - (next?.hp ?? 0));
      if (lost) damageEffects.show(unit.position, lost);
    });
    interaction.clearMovementGrid();
    abilities.clearMageTargets();
    state.selected = null;
    abilities.syncInstantCommand();
    abilities.syncMageCommands();
    const preserveFromEffects = battleAnimations.preserveIdsForEffects(effects);
    const nextUnits = [];
    serverUnits.forEach(data => {
      let unit = existingById.get(data.id);
      const target = battleAnimations.worldPoint(data.x, data.z);
      if (unit) {
        const index = cards.findIndex(card => card.id === data.cardId);
        syncOnlineUnitData(unit, data, cards[index], index);
        setArcherMountedState(unit, false);
        if (!data.mountedOnTowerId && unit.position.distanceToSquared(target) > 0.0001) {
          battleAnimations.slideUnit(unit, target);
        }
      } else {
        unit = onlineUnit(data);
        scene.add(unit);
      }
      nextUnits.push(unit);
    });
    previousUnits.forEach(unit => {
      if (nextById.has(unit.userData.serverUnitId)) return;
      const id = unit.userData.serverUnitId;
      if (preserveFromEffects.has(id) || battleAnimations.isUnitProtected(id)) {
        nextUnits.push(unit);
        return;
      }
      scene.remove(unit);
    });
    units.splice(0, units.length, ...nextUnits);
    hoverables.splice(0, hoverables.length, ...nextUnits.filter(unit => unit.userData.hoverable));
    units.filter(isMountedArcher).forEach(unit => {
      const tower = relations.towerForArcher(unit);
      if (!tower) return;
      const towerCard = CARD_BY_ID[tower.userData.cardId];
      unit.userData.attackRange = CARD_BY_ID.archer.attackRange + (towerCard.archerRangeBonus ?? 1);
      unit.userData.damage = CARD_BY_ID.archer.damage + (towerCard.archerDamageBonus ?? 0);
      relations.placeArcherOnTower(unit, tower);
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
    const spectator = Boolean(payload.self?.spectator);
    const selfSeat = spectator ? (payload.self?.perspectiveSeat ?? 1) : payload.self.seat;
    const shouldSetPerspective = !previous
      || previous.self?.seat !== payload.self?.seat
      || previous.state.phase === 'waiting';
    state.onlineState = payload;
    state.selfSeat = selfSeat;
    handController.showDeploymentArea(false);
    document.querySelector('#waiting-code').textContent = payload.code;
    document.querySelector('#match-state').hidden = false;
    syncMageAltarChoice(payload.self);
    if (payload.state.phase === 'waiting') {
      document.querySelector('#waiting-status').textContent = 'Aguardando o rei rival...';
      emit('waiting', { code: payload.code });
      return;
    }
    callbacks.activatePreferredGraphics?.();
    document.querySelector('#online-lobby').classList.add('closed');
    document.querySelector('.card-dock').hidden = spectator;
    document.querySelector('.bottom-command').hidden = spectator;
    app.dataset.spectator = String(spectator);
    emit('match-started', { spectator });
    if (shouldSetPerspective) setPerspective();
    const currentHand = payload.self?.hand ?? [];
    const previousHand = previous?.self?.hand ?? [];
    if (!spectator && previous && currentHand.length > previousHand.length) handController.animateServerDraw();
    handController.renderOnlineHand(currentHand, payload.state.units);
    boardPresentation.reconcileFires(payload.state.fires ?? []);
    const battleEffects = payload.state.effects ?? [];
    reconcileOnlineUnits(payload.state.units, battleEffects);
    battleAnimations.reconcileSnowstorms(payload.state.snowstorms ?? []);
    battleAnimations.processServerEffects(battleEffects);
    boardPresentation.reconcileRoads(payload.state.roads ?? []);
    const me = payload.state.players.find(player => player.seat === state.selfSeat);
    const enemy = payload.state.players.find(player => player.seat !== state.selfSeat);
    if (!me || !enemy) return;
    const seatOne = payload.state.players.find(player => player.seat === 1);
    const seatTwo = payload.state.players.find(player => player.seat === 2);
    alliedKeep.scale.set(seatOne?.baseLevel >= 2 ? 5 / 3 : 1, 1, 1);
    enemyKeep.scale.set(seatTwo?.baseLevel >= 2 ? 5 / 3 : 1, 1, 1);
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
    const mine = !spectator && payload.state.activeSeat === state.selfSeat;
    const finished = payload.state.phase === 'finished';
    document.querySelector('#turn-label').textContent = spectator
      ? (finished ? `VITÓRIA ${payload.state.winnerSeat === 1 ? 'AZUL' : 'VERMELHA'}` : 'ESPECTANDO')
      : finished
        ? (payload.state.winnerSeat === state.selfSeat ? 'VITÓRIA' : 'DERROTA')
        : (mine ? 'SEU TURNO' : 'TURNO RIVAL');
    document.querySelector('#end-turn').disabled = !mine || finished;
    devController.syncTurnRoundStatus(payload.state.activeSeat, payload.state.round);
    abilities.syncAbilityBadges();
  }

  function syncMageAltarChoice(self) {
    const modal = document.querySelector('#mage-altar-choice');
    const choices = document.querySelector('#mage-altar-choice-cards');
    const pending = self?.pendingMageAltarChoices ?? 0;
    modal.hidden = pending < 1;
    if (!pending) {
      choices.replaceChildren();
      return;
    }
    choices.innerHTML = (self.deckChoices ?? []).map(cardId => {
      const card = CARD_BY_ID[cardId];
      return card ? `<button data-mage-altar-card="${card.id}" class="rarity-${card.rarityClass}">${cardIconMarkup(card)}<span>${card.name}</span><small>${card.rarity}</small></button>` : '';
    }).join('');
  }

  function start() {
    document.querySelector('#mage-altar-choice-cards').addEventListener('click', event => {
      const button = event.target.closest('[data-mage-altar-card]');
      if (button) sendAction({ type: 'choose_deck_card', cardId: button.dataset.mageAltarCard });
    });
    socket.addEventListener('connected', () => {
      lobbyError.textContent = '';
      emit('connected');
    });
    socket.addEventListener('disconnected', () => {
      emit('disconnected');
    });
    socket.addEventListener(SERVER_EVENTS.ROOM_DIRECTORY, event => emit('directory', event.detail));
    socket.addEventListener(SERVER_EVENTS.ROOM_STATE, event => {
      lobbyError.textContent = '';
      gameError.textContent = '';
      applyState(event.detail);
    });
    socket.addEventListener(SERVER_EVENTS.ERROR, event => {
      const message = String(event.detail.message ?? 'Erro na partida.');
      if (document.querySelector('#online-lobby').classList.contains('closed')) callbacks.showGameError?.(message);
      else lobbyError.textContent = message;
      emit('session-error', { message });
    });
    setInterval(() => {
      if (!state.onlineState?.state.turnEndsAt) return;
      const remaining = Math.max(0, state.onlineState.state.turnEndsAt - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor(remaining % 60000 / 1000);
      document.querySelector('#turn-clock').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 250);
  }

  return {
    start,
    sendAction,
    setPerspective,
    applyState,
    addEventListener: (...args) => events.addEventListener(...args),
    setTicketProvider: provider => socket.setTicketProvider(provider),
    connect: () => { void socket.connect(); },
    disconnect: () => socket.disconnect(),
    requestRooms: () => socket.requestRooms(),
    createRoom: options => socket.createRoom(options),
    joinRoom: code => socket.joinRoom(code),
    spectateRoom: code => socket.spectateRoom(code),
    createAiRoom: () => socket.createAiRoom(),
    leaveRoom: () => socket.leaveRoom(),
  };
}
