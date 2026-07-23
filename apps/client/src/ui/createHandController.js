import { effectiveCardCost } from '@tronos/shared/cards';
import { cardMarkup, cards } from './cardView.js';
import { createCardSummoningController } from './createCardSummoningController.js';
import { createCardDiscardController } from './createCardDiscardController.js';
import { createDeckController } from './createDeckController.js';
import { createDevCardGallery } from './createDevCardGallery.js';

export function createHandController(options) {
  const {
    state, app, renderer, controls, cameraTransition, deploymentOverlay, interaction, callbacks,
  } = options;
  const hand = document.querySelector('#card-hand');
  const bottomCommand = document.querySelector('.bottom-command');
  let cardDrag = null;
  let suppressCardClick = false;
  const selectedCardElement = () => hand.querySelector('.game-card.selected');
  const deploymentSeat = () => state.onlineState ? state.selfSeat : state.activePlayer;
  const showDeploymentArea = (emphasized = false) => deploymentOverlay.show(deploymentSeat(), emphasized);

  function syncBottomCommand() {
    const covered = cardDrag || hand.querySelector('.game-card:hover') || selectedCardElement();
    bottomCommand.classList.toggle('hidden-by-card', Boolean(covered));
  }

  Object.assign(callbacks, { showDeploymentArea, syncBottomCommand });
  const gallery = createDevCardGallery({
    state, app, controls, hand, showGameError: message => callbacks.showGameError?.(message),
  });
  const summoning = createCardSummoningController({ ...options, hand });
  const deck = createDeckController({ ...options, hand, gallery });
  const discard = createCardDiscardController({
    state, app, hand, controls, callbacks, selectedCardElement,
  });

  function playSelectedCardAtPointer(event) {
    return summoning.playSelectedCardAtPointer(event, selectedCardElement());
  }

  function renderOnlineHand(instances, serverUnits = []) {
    hand.replaceChildren();
    for (const instance of instances) {
      const index = cards.findIndex(card => card.id === instance.cardId);
      if (index < 0 || !/^[-0-9a-f]{36}$/i.test(instance.instanceId)) continue;
      const holder = document.createElement('div');
      const card = cards[index];
      const cost = effectiveCardCost(card.id, state.selfSeat, serverUnits);
      holder.innerHTML = cardMarkup({ ...card, baseCost: card.cost, effectiveCost: cost }, index);
      const node = holder.firstElementChild;
      node.dataset.instance = instance.instanceId;
      hand.appendChild(node);
    }
    document.querySelector('#hand-count').textContent = `${hand.children.length} CARTAS`;
    syncBottomCommand();
  }

  function mountCardSelection() {
    hand.addEventListener('pointerover', event => {
      if (event.target.closest('.game-card')) syncBottomCommand();
    });
    hand.addEventListener('pointerout', event => {
      if (event.target.closest('.game-card')) requestAnimationFrame(syncBottomCommand);
    });
    hand.addEventListener('click', event => {
      const card = event.target.closest('.game-card');
      if (!card || suppressCardClick) return;
      const wasSelected = card.classList.contains('selected');
      hand.querySelectorAll('.game-card').forEach(element => element.classList.remove('selected'));
      if (!wasSelected) {
        card.classList.add('selected');
        interaction.clearUnitSelection();
      }
      showDeploymentArea(!wasSelected);
      syncBottomCommand();
    });
    hand.addEventListener('dragstart', event => event.preventDefault());
  }

  function mountCardDragging() {
    hand.addEventListener('pointerdown', event => {
      const card = event.target.closest('.game-card');
      if (!card || event.button !== 0 || summoning.isCasting()
        || (state.onlineState && state.onlineState.state.activeSeat !== state.selfSeat)) return;
      event.preventDefault();
      cameraTransition.cancel({ restoreControls: false });
      card.setPointerCapture(event.pointerId);
      controls.enabled = false;
      cardDrag = {
        card,
        index: Number(card.dataset.card),
        instanceId: card.dataset.instance,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        tile: null,
        overDiscard: false,
      };
      discard.setDragging(true);
      showDeploymentArea(true);
      syncBottomCommand();
    });
    addEventListener('pointermove', event => {
      if (!cardDrag) return;
      const distance = Math.hypot(event.clientX - cardDrag.startX, event.clientY - cardDrag.startY);
      if (!cardDrag.moved && distance < 7) return;
      if (!cardDrag.moved) {
        cardDrag.moved = true;
        cardDrag.card.classList.add('aiming');
      }
      cardDrag.overDiscard = discard.isPointerOver(event);
      discard.setPointerOver(cardDrag.overDiscard);
      if (cardDrag.overDiscard) {
        cardDrag.tile = null;
        interaction.tileMarker.visible = false;
        return;
      }
      cardDrag.tile = summoning.cardTileAtPointer(event, cardDrag.index);
      interaction.tileMarker.visible = Boolean(cardDrag.tile);
      if (cardDrag.tile) {
        interaction.tileMarker.position.set(cardDrag.tile.worldX, 0.075, cardDrag.tile.worldZ);
        interaction.tileMarker.material.color.setHex(cardDrag.tile.valid ? 0x6cad78 : 0xa54239);
      }
    });
    addEventListener('pointerup', () => {
      if (!cardDrag) return;
      const drag = cardDrag;
      cardDrag = null;
      discard.setDragging(false);
      controls.enabled = true;
      interaction.tileMarker.visible = false;
      if (drag.moved) {
        suppressCardClick = true;
        if (drag.overDiscard) discard.discard(drag.card);
        else if (drag.tile?.valid) {
          summoning.animateCardSummon(drag.card, drag.tile,
            () => summoning.commitSummon(drag.card, drag.index, drag.tile));
        } else drag.card.classList.remove('aiming');
        setTimeout(() => {
          suppressCardClick = false;
          showDeploymentArea(false);
          syncBottomCommand();
        }, 0);
      } else {
        drag.card.classList.remove('aiming');
        showDeploymentArea(Boolean(selectedCardElement()));
        syncBottomCommand();
      }
    });
  }

  function mount() {
    hand.replaceChildren();
    document.querySelector('#hand-count').textContent = `${hand.children.length} CARTAS`;
    showDeploymentArea(false);
    mountCardSelection();
    mountCardDragging();
    discard.mount();
    deck.mount();
  }

  return {
    mount,
    hand,
    gallery,
    selectedCardElement,
    playSelectedCardAtPointer,
    showDeploymentArea,
    syncBottomCommand,
    makeSummonedUnit: summoning.makeSummonedUnit,
    renderOnlineHand,
    animateServerDraw: deck.animateServerDraw,
    syncPhysicalDecks: deck.syncCounts,
    applyConstructionState: summoning.applyConstructionState,
  };
}
