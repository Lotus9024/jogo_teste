import * as THREE from 'three';
import { CARD_BY_ID } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { setArcherMountedState } from '../models/unitModels.js';
import { cards } from '../ui/cardView.js';
import { updateHealthBadge } from '../ui/unitHealthBadge.js';

export function createDevToolsController({
  state = {}, scene, alliedKeep, enemyKeep, units = [], hoverables = [], boardPresentation,
  relations, interaction, handController, callbacks,
}) {
  state.devBaseLevels ??= { 1: 1, 2: 1 };
  const kingdoms = {
    1: { baseLevel: state.devBaseLevels?.[1] ?? 1, baseSize: 1, hp: GAME_CONFIG.startingBaseHp, manualBaseLevel: false },
    2: { baseLevel: state.devBaseLevels?.[2] ?? 1, baseSize: 1, hp: GAME_CONFIG.startingBaseHp, manualBaseLevel: false },
  };
  const keepForSeat = seat => seat === 1 ? alliedKeep : enemyKeep;

  function setBaseLevel(seat, level, { manual = false, notify = true } = {}) {
    const kingdom = kingdoms[seat];
    if (!kingdom) return;
    kingdom.baseLevel = THREE.MathUtils.clamp(Math.round(level), 1, 4);
    if (manual) kingdom.manualBaseLevel = true;
    state.devBaseLevels[seat] = kingdom.baseLevel;
    const keep = keepForSeat(seat);
    if (keep) {
      keep.userData.currentLevel = kingdom.baseLevel;
      keep.userData.role = `BASE 3×3 · NÍVEL ${kingdom.baseLevel}`;
      const levelDetails = keep.getObjectByName('castleLevelTwoDetails');
      if (levelDetails) levelDetails.visible = kingdom.baseLevel >= 2;
      const gateLight = keep.getObjectByName('Luz violeta do portão');
      if (gateLight) gateLight.intensity = kingdom.baseLevel >= 2 ? 7 : 5.2;
    }
    if (!notify) return;
    callbacks.syncDevKingdomHud?.();
    handController.showDeploymentArea(Boolean(handController.selectedCardElement()));
  }

  function syncSettings() {
    if (!state.devMode) return;
    const kingdom = kingdoms[state.activePlayer];
    document.querySelector('#dev-base-size').textContent = String(kingdom.baseSize);
    document.querySelectorAll('[data-base-level]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.baseLevel) === kingdom.baseLevel));
    });
    document.querySelectorAll('[data-dev-settings] [data-card-level]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.cardLevel) === state.devCardLevel));
    });
    const instantBuild = document.querySelector('#dev-instant-build');
    instantBuild.setAttribute('aria-pressed', String(state.devInstantBuild));
    instantBuild.textContent = state.devInstantBuild ? 'LIGADO' : 'DESLIGADO';
  }

  function removeUnit(unit) {
    if (!unit) return;
    const removedId = relations.towerId(unit);
    units.splice(units.indexOf(unit), 1);
    hoverables.splice(hoverables.indexOf(unit), 1);
    scene.remove(unit);
    units.filter(candidate => candidate.userData.mountedOnTowerId === removedId).forEach(candidate => {
      candidate.userData.mountedOnTowerId = null;
      candidate.userData.attackRange = CARD_BY_ID[candidate.userData.cardId].attackRange;
      candidate.position.y = 0.06;
      setArcherMountedState(candidate, false);
    });
    if (state.selected === unit) interaction.clearUnitSelection();
    callbacks.syncDevKingdomHud?.();
  }

  function damageBase(seat, amount) {
    const kingdom = kingdoms[seat];
    if (!kingdom || !Number.isFinite(amount) || amount <= 0) return null;
    kingdom.hp = Math.max(0, kingdom.hp - amount);
    const keep = keepForSeat(seat);
    if (keep) keep.userData.baseHp = kingdom.hp;
    callbacks.syncDevKingdomHud?.();
    return kingdom.hp;
  }

  function mount() {
    document.querySelector('#dev-base-size-minus').addEventListener('click', () => {
      const kingdom = kingdoms[state.activePlayer];
      kingdom.baseSize = THREE.MathUtils.clamp(kingdom.baseSize - 1, 1, 6);
      keepForSeat(state.activePlayer).scale.setScalar(0.85 + kingdom.baseSize * 0.15);
      syncSettings();
    });
    document.querySelector('#dev-base-size-plus').addEventListener('click', () => {
      const kingdom = kingdoms[state.activePlayer];
      kingdom.baseSize = THREE.MathUtils.clamp(kingdom.baseSize + 1, 1, 6);
      keepForSeat(state.activePlayer).scale.setScalar(0.85 + kingdom.baseSize * 0.15);
      syncSettings();
    });
    document.querySelectorAll('[data-base-level]').forEach(button => {
      button.addEventListener('click', () => {
        setBaseLevel(state.activePlayer, Number(button.dataset.baseLevel), { manual: true });
      });
    });
    document.querySelectorAll('[data-dev-settings] [data-card-level]').forEach(button => {
      button.addEventListener('click', () => {
        state.devCardLevel = Number(button.dataset.cardLevel);
        syncSettings();
        if (handController.gallery.isOpen()) handController.gallery.render();
        if (handController.gallery.isDetailOpen()) {
          handController.gallery.showDetail(handController.gallery.selectedIndex());
        }
      });
    });
    document.querySelector('#dev-instant-build').addEventListener('click', () => {
      state.devInstantBuild = !state.devInstantBuild;
      if (state.devInstantBuild) {
        units.filter(unit => unit.userData.ownerSeat === state.activePlayer && unit.userData.underConstruction)
          .forEach(unit => handController.applyConstructionState(unit, false));
      }
      syncSettings();
      callbacks.syncDevKingdomHud?.();
    });
    document.querySelector('#dev-delete-unit').addEventListener('click', () => {
      if (state.devMode) removeUnit(state.selected);
    });
    document.querySelectorAll('[data-unit-level]').forEach(button => {
      button.addEventListener('click', () => {
        if (!state.devMode || !state.selected) return;
        const level = Number(button.dataset.unitLevel);
        const card = cards[state.selected.userData.cardIndex];
        const multiplier = 1 + (level - 1) * 0.25;
        state.selected.userData.devLevel = level;
        if (card.hp !== null) {
          state.selected.userData.maxHp = Math.ceil(card.hp * multiplier);
          state.selected.userData.hp = state.selected.userData.maxHp;
          updateHealthBadge(state.selected);
        }
        state.selected.userData.damage = Math.ceil((card.damage ?? 0) * multiplier);
        interaction.syncDevUnitTools();
      });
    });
    document.querySelector('#dev-clear-board').addEventListener('click', () => {
      if (!state.devMode) return;
      interaction.clearUnitSelection();
      units.splice(0).forEach(unit => scene.remove(unit));
      hoverables.splice(0);
      boardPresentation.reconcileRoads([]);
      boardPresentation.reconcileFires([]);
      callbacks.syncDevKingdomHud?.();
      callbacks.showGameError?.('Tabuleiro de testes limpo.');
    });
  }

  return { mount, syncSettings, kingdoms, keepForSeat, setBaseLevel, damageBase };
}
