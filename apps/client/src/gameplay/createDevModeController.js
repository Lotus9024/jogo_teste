import { citizensForSeat, completedRoadCount } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { setResource } from '../ui/resourceView.js';
import { createDevToolsController } from './createDevToolsController.js';

export function createDevModeController(options) {
  const {
    state, app, scene, tile, half, units, hoverables, roads, boardPresentation,
    interaction, actions, abilities, handController, cameraTransition, callbacks,
  } = options;
  const toolCallbacks = {
    ...callbacks,
    syncDevKingdomHud: () => syncDevKingdomHud(),
  };
  const tools = createDevToolsController({ ...options, callbacks: toolCallbacks });

  function setKingdomProgressHud(citizens, level, enemyLevel = 1) {
    document.querySelector('#self-citizens').textContent = String(citizens);
    document.querySelector('#self-level').textContent = `LV ${level}`;
    document.querySelector('#enemy-base-level').textContent = `LV ${enemyLevel}`;
    document.querySelector('#level-requirement').textContent = level >= 2
      ? 'Nível 2 alcançado. Você recebeu 2 de energia ao evoluir. Os próximos níveis serão adicionados depois.'
      : `Nível 2: tenha ${GAME_CONFIG.level2CitizenRequirement} cidadãos e ${GAME_CONFIG.level2RoadRequirement} rua concluída em seu reino. Ao evoluir, receba 2 de energia imediatamente.`;
  }

  function syncTurnRoundStatus(turn, roundNumber) {
    document.querySelector('#turn-round-card').hidden = false;
    document.querySelector('#current-turn-number').textContent = String(turn);
    document.querySelector('#current-round-number').textContent = String(roundNumber);
  }

  function localUnitData() {
    return units.map(unit => ({
      ownerSeat: unit.userData.ownerSeat ?? 1,
      cardId: unit.userData.cardId,
      x: Math.round((unit.position.x + half) / tile),
      z: Math.round((unit.position.z + half) / tile),
      underConstruction: Boolean(unit.userData.underConstruction),
    }));
  }

  function syncLocalKingdomHud() {
    const citizens = citizensForSeat(1, localUnitData(), roads, GAME_CONFIG.boardSize);
    const level = citizens >= GAME_CONFIG.level2CitizenRequirement
      && completedRoadCount(1, roads) >= GAME_CONFIG.level2RoadRequirement ? 2 : 1;
    setKingdomProgressHud(citizens, level);
  }

  function syncDevKingdomHud() {
    const citizens = citizensForSeat(state.activePlayer, localUnitData(), roads, GAME_CONFIG.boardSize);
    const enemySeat = state.activePlayer === 1 ? 2 : 1;
    setKingdomProgressHud(citizens, tools.kingdoms[state.activePlayer].baseLevel,
      tools.kingdoms[enemySeat].baseLevel);
    document.querySelector('#level-requirement').textContent = `Nível selecionado manualmente para o Reino ${state.activePlayer}.`;
    setResource('#self-health', tools.kingdoms[state.activePlayer].hp, GAME_CONFIG.startingBaseHp);
    document.querySelector('.enemy-base-tag i').style.width = `${tools.kingdoms[enemySeat].hp / GAME_CONFIG.startingBaseHp * 100}%`;
    document.querySelector('#turn-label').textContent = `REINO ${state.activePlayer} · TURNO ${state.round}`;
    tools.syncSettings();
  }

  function finishLocalRoadsForSeat(seat) {
    let changed = false;
    roads.forEach(road => {
      if (road.underConstruction && road.ownerSeat === seat && road.buildReadyRound <= state.round) {
        road.underConstruction = false;
        changed = true;
      }
    });
    if (changed) boardPresentation.reconcileRoads([...roads]);
  }

  function finishTurnShared() {
    units.filter(unit => unit.userData.underConstruction && unit.userData.ownerSeat === state.activePlayer
      && (state.devInstantBuild || unit.userData.buildReadyRound <= state.round))
      .forEach(unit => handController.applyConstructionState(unit, false));
    finishLocalRoadsForSeat(state.activePlayer);
    units.filter(unit => unit.userData.ownerSeat === state.activePlayer).forEach(unit => {
      unit.userData.actionUsed = false;
      unit.userData.abilityUsed = false;
    });
    syncTurnRoundStatus(state.activePlayer, state.round);
    handController.showDeploymentArea(false);
    abilities.clearMageTargets();
    abilities.syncInstantCommand();
    abilities.syncMageCommands();
    abilities.syncAbilityBadges();
  }

  function endTurn(dev = false) {
    if (!dev && state.onlineState) return callbacks.sendOnlineAction?.({ type: 'end_turn' });
    actions.resolveLocalFires(state.activePlayer);
    if (dev) interaction.clearUnitSelection();
    state.activePlayer = state.activePlayer === 1 ? 2 : 1;
    if (state.activePlayer === 1) state.round += 1;
    if (dev) state.selfSeat = state.activePlayer;
    finishTurnShared();
    if (dev) {
      syncDevKingdomHud();
      cameraTransition.focusBoard({ side: state.activePlayer === 2 ? -1 : 1 });
    } else syncLocalKingdomHud();
  }

  function initializeDevMode() {
    Object.assign(state, { devMode: true, onlineState: null, activePlayer: 1, round: 1, selfSeat: 1 });
    app.dataset.mode = 'dev';
    document.querySelector('#online-lobby').classList.add('closed');
    document.querySelector('#match-state').hidden = false;
    document.querySelector('#turn-clock').textContent = '∞';
    document.querySelector('#end-turn').disabled = false;
    setResource('#self-energy', '∞', '');
    handController.hand.replaceChildren();
    document.querySelector('#hand-count').textContent = '0 CARTAS';
    state.deckRemaining = Number.POSITIVE_INFINITY;
    document.querySelector('#deck-count').textContent = '∞';
    document.querySelector('[data-dev-settings]').hidden = false;
    document.querySelector('#dev-unit-tools').hidden = true;
    units.splice(0).forEach(unit => scene.remove(unit));
    hoverables.splice(0);
    boardPresentation.reconcileRoads([]);
    boardPresentation.reconcileFires([]);
    tools.keepForSeat(1).scale.setScalar(1);
    tools.keepForSeat(2).scale.setScalar(1);
    callbacks.setOnlinePerspective?.();
    syncTurnRoundStatus(state.activePlayer, state.round);
    syncDevKingdomHud();
    handController.showDeploymentArea(false);
    abilities.syncAbilityBadges();
  }

  function mount() {
    tools.mount();
    document.querySelector('#end-turn').addEventListener('click', () => endTurn(state.devMode));
    addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.target.closest?.('input,select,button')) endTurn(state.devMode);
    });
    document.querySelector('#dev-mode').addEventListener('click', initializeDevMode);
  }

  return {
    mount,
    syncDevSettings: tools.syncSettings,
    setKingdomProgressHud,
    syncTurnRoundStatus,
    syncLocalKingdomHud,
    syncDevKingdomHud,
    initializeDevMode,
  };
}
