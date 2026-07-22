import { isMountedArcher } from './unitState.js';
import { cardMarkup, cards } from '../ui/cardView.js';

export function createUnitPointerHandlers({
  state, app, renderer, controls, cameraTransition, tile, half,
  boardCoordinates, movementOverlay, actions, abilities, relations, interaction, callbacks,
}) {
  const hoverCard = document.querySelector('#hover-card');

  function pick(event) {
    if (state.justDragged) {
      state.justDragged = false;
      return;
    }
    const abilityHit = interaction.abilityTriggerAtPointer(event);
    if (abilityHit) {
      if (abilityHit.abilityTrigger === 'acid') {
        if (state.selected !== abilityHit.unit) interaction.selectUnit(abilityHit.unit, { cinematic: false });
        abilities.activateMageAcid();
      } else if (abilityHit.abilityTrigger === 'goblin_tower') {
        if (state.selected !== abilityHit.unit) interaction.selectUnit(abilityHit.unit, { cinematic: false });
        abilities.activateGoblinTower();
      } else {
        const archer = relations.archerForTower(abilityHit.unit);
        if (archer) {
          if (state.selected !== archer) interaction.selectUnit(archer, { cinematic: false });
          abilities.activateTowerAbility();
        }
      }
      return;
    }
    const fireMage = interaction.mageFireTriggerAtPointer(event);
    if (fireMage) {
      if (state.selected !== fireMage) interaction.selectUnit(fireMage, { cinematic: false });
      abilities.activateMageFire();
      return;
    }
    if (callbacks.selectedCardElement?.()) {
      callbacks.playSelectedCardAtPointer?.(event);
      return;
    }
    const clickedBaseSeat = state.selected && actions.canCommandUnit(state.selected)
      ? interaction.baseSeatAtPointer(event) : null;
    const enemySeat = state.selected?.userData.ownerSeat === 1 ? 2 : 1;
    if (clickedBaseSeat === enemySeat) {
      const cell = boardCoordinates.baseCellsForSeat(clickedBaseSeat)
        .find(item => movementOverlay.isInteractiveCell(item.x, item.z));
      if (cell) {
        actions.moveOrAttackUnit(state.selected, {
          ...cell, worldX: cell.x * tile - half, worldZ: cell.z * tile - half,
        });
        interaction.clearMovementGrid();
        return;
      }
    }
    const unit = interaction.unitAtPointer(event);
    const destination = interaction.boardCellAtPointer(event);
    if (abilities.isGoblinTowerAiming() && state.selected?.userData.cardId === 'goblin_tower' && destination) {
      abilities.chooseGoblinCell(destination);
      return;
    }
    if (abilities.isMageAiming() && state.selected?.userData.cardId === 'mage' && destination) {
      abilities.toggleMageFireCell(destination);
      return;
    }
    if (state.selected && actions.canCommandUnit(state.selected) && destination && unit !== state.selected) {
      if (!movementOverlay.isInteractiveCell(destination.x, destination.z)) {
        if (unit) interaction.selectUnit(unit);
        return;
      }
      actions.moveOrAttackUnit(state.selected, destination, unit);
      interaction.clearMovementGrid();
      return;
    }
    if (unit) interaction.selectUnit(unit);
  }

  function startDrag(event) {
    if (event.button !== 0) return;
    if (interaction.abilityTriggerAtPointer(event) || interaction.mageFireTriggerAtPointer(event)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const unit = interaction.unitAtPointer(event);
    if (!unit) return;
    if (callbacks.selectedCardElement?.() || (state.selected && state.selected !== unit && actions.canCommandUnit(state.selected))) return;
    if (state.devMode && unit.userData.ownerSeat !== state.activePlayer) {
      interaction.selectUnit(unit, { cinematic: false });
      callbacks.showGameError?.('Passe o turno para controlar este reino.');
      return;
    }
    if (unit.userData.cardType === 'construction' || unit.userData.underConstruction) {
      callbacks.showGameError?.(unit.userData.underConstruction
        ? 'A construção ainda não foi concluída.' : 'Esta construção não pode se mover.');
      return;
    }
    if (isMountedArcher(unit)) {
      interaction.selectUnit(unit, { cinematic: false });
      return;
    }
    if (state.onlineState && (unit.userData.ownerSeat !== state.selfSeat
      || state.onlineState.state.activeSeat !== state.selfSeat || unit.userData.actionUsed)) return;
    event.preventDefault();
    event.stopPropagation();
    cameraTransition.cancel({ restoreControls: false });
    state.dragged = unit;
    state.dragMoved = false;
    controls.enabled = false;
    interaction.selectUnit(unit, { cinematic: false });
    renderer.domElement.setPointerCapture(event.pointerId);
    state.dragged.userData.dragOrigin = state.dragged.position.clone();
    state.dragged.position.y = 0.18;
    interaction.tileMarker.position.set(state.dragged.position.x, 0.075, state.dragged.position.z);
    interaction.tileMarker.visible = true;
    app.dataset.dragging = state.dragged.userData.name;
  }

  function moveDrag(event) {
    if (!state.dragged) return;
    event.preventDefault();
    state.dragMoved = true;
    const point = interaction.dragPointAtPointer(event);
    if (!point) return;
    state.dragged.position.x = point.x;
    state.dragged.position.z = point.z;
    interaction.tileMarker.position.set(point.x, 0.075, point.z);
  }

  function finishDrag(event) {
    if (!state.dragged) return;
    event.preventDefault();
    event.stopPropagation();
    state.dragged.position.y = 0.06;
    controls.enabled = true;
    interaction.tileMarker.visible = false;
    let changedCell = false;
    if (state.dragMoved) {
      const destination = {
        x: Math.round((state.dragged.position.x + half) / tile),
        z: Math.round((state.dragged.position.z + half) / tile),
        worldX: state.dragged.position.x,
        worldZ: state.dragged.position.z,
      };
      const originCell = {
        x: Math.round((state.dragged.userData.dragOrigin.x + half) / tile),
        z: Math.round((state.dragged.userData.dragOrigin.z + half) / tile),
      };
      changedCell = destination.x !== originCell.x || destination.z !== originCell.z;
      if (changedCell && movementOverlay.isInteractiveCell(destination.x, destination.z)) {
        actions.moveOrAttackUnit(state.dragged, destination, null, state.dragged.userData.dragOrigin);
      } else state.dragged.position.copy(state.dragged.userData.dragOrigin);
    }
    app.dataset.lastMoved = `${state.dragged.userData.name}:${state.dragged.position.x.toFixed(2)},${state.dragged.position.z.toFixed(2)}`;
    delete app.dataset.dragging;
    const wasDrag = state.dragMoved && changedCell;
    state.justDragged = true;
    setTimeout(() => { state.justDragged = false; }, 0);
    state.dragged = null;
    if (wasDrag) interaction.clearMovementGrid();
    else interaction.centerCamera();
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
  }

  function showHover(event) {
    if (state.dragged) {
      hoverCard.classList.remove('visible');
      return;
    }
    const object = interaction.hoverableAtPointer(event);
    if (!object) {
      hoverCard.classList.remove('visible');
      hoverCard.setAttribute('aria-hidden', 'true');
      return;
    }
    hoverCard.innerHTML = cardMarkup(cards[object.userData.cardIndex], object.userData.cardIndex);
    const preview = hoverCard.firstElementChild;
    preview.classList.remove('selected');
    preview.tabIndex = -1;
    const hpValue = preview.querySelector('[data-stat="hp"]');
    if (hpValue) hpValue.textContent = String(Math.max(0, object.userData.hp));
    if (object.userData.underConstruction) {
      const remaining = Math.max(1,
        (object.userData.buildReadyRound ?? abilities.currentRound() + 1) - abilities.currentRound());
      preview.querySelector('.card-ability strong').textContent = 'EM CONSTRUÇÃO';
      preview.querySelector('.ability-cost').textContent = `${remaining}R`;
      preview.querySelector('.card-ability p').textContent = `Faltam ${remaining} rodada${remaining === 1 ? '' : 's'} para a conclusão.`;
    }
    hoverCard.style.left = `${Math.min(event.clientX + 18, innerWidth - 262)}px`;
    hoverCard.style.top = `${Math.min(event.clientY + 18, innerHeight - 422)}px`;
    hoverCard.classList.add('visible');
    hoverCard.setAttribute('aria-hidden', 'false');
  }

  function mount() {
    renderer.domElement.addEventListener('click', pick);
    renderer.domElement.addEventListener('pointerdown', startDrag, true);
    renderer.domElement.addEventListener('pointermove', moveDrag, true);
    renderer.domElement.addEventListener('pointermove', showHover);
    renderer.domElement.addEventListener('pointerup', finishDrag, true);
    renderer.domElement.addEventListener('pointercancel', finishDrag, true);
    renderer.domElement.addEventListener('pointerleave', () => hoverCard.classList.remove('visible'));
  }

  return { mount };
}
