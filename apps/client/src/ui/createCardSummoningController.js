import * as THREE from 'three';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { isDeploymentCell, isRoadCard, isRoadPlacementCell } from '@tronos/shared/cards';
import { createCardUnit } from '../models/createCardUnit.js';
import { applyConstructionState as applyUnitConstructionState, setUnitOwnerFacing, setUnitTeamColor } from '../gameplay/unitState.js';
import { cards } from './cardView.js';

export function createCardSummoningController({
  state, app, scene, camera, tile, half, units, hoverables, roads, hand,
  boardCoordinates, boardPresentation, interaction, actions, abilities, callbacks,
}) {
  const summonFlightPoint = new THREE.Vector3();
  let cardCasting = false;
  const applyConstructionState = (unit, underConstruction) => {
    applyUnitConstructionState(unit, underConstruction, units, app);
  };
  const deploymentSeat = () => state.onlineState ? state.selfSeat : state.activePlayer;

  function cardTileAtPointer(event, cardIndex) {
    const cell = interaction.boardCellAtPointer(event);
    if (!cell || !Number.isInteger(cardIndex)) return null;
    const card = cards[cardIndex];
    const occupants = boardCoordinates.unitsAtCell(cell.x, cell.z);
    const tower = occupants.find(unit => unit.userData.cardId === 'tower'
      && unit.userData.ownerSeat === deploymentSeat() && !unit.userData.underConstruction);
    const mountable = card.id === 'archer' && tower && occupants.length === 1;
    const roadCard = isRoadCard(card.id);
    const roadBlocker = occupants.some(unit => ['construction', 'machine'].includes(unit.userData.cardType));
    const roadOccupied = roads.some(road => road.x === cell.x && road.z === cell.z);
    const valid = roadCard
      ? !boardCoordinates.baseSeatAtCell(cell.x, cell.z) && !roadBlocker
        && isRoadPlacementCell(deploymentSeat(), cell.x, cell.z, roads, GAME_CONFIG.boardSize)
      : isDeploymentCell(deploymentSeat(), cell.x, cell.z, GAME_CONFIG.boardSize)
        && (!occupants.length || mountable)
        && !(roadOccupied && ['construction', 'machine'].includes(card.type));
    return { ...cell, valid, mountableTower: tower ?? null };
  }

  const makeSummonedUnit = cardIndex => createCardUnit(cards[cardIndex], cardIndex);

  function summonCard(cardIndex, x, z, mountableTower = null, level = state.devCardLevel) {
    const card = cards[cardIndex];
    if (isRoadCard(card.id)) {
      boardPresentation.reconcileRoads([...roads, {
        id: `local-road-${roads.length + 1}`,
        cardId: card.id,
        ownerSeat: state.activePlayer,
        x: Math.round((x + half) / tile),
        z: Math.round((z + half) / tile),
        underConstruction: !state.devInstantBuild,
        buildReadyRound: state.round + card.buildRounds,
      }]);
      callbacks.syncDevKingdomHud?.();
      return;
    }
    if (card.id === 'goblin_swarm') {
      const goblinIndex = cards.findIndex(item => item.id === card.summonsCardId);
      const candidates = [];
      for (let cellX = 0; cellX < GAME_CONFIG.boardSize; cellX += 1) {
        for (let cellZ = 0; cellZ < GAME_CONFIG.boardSize; cellZ += 1) {
          if (isDeploymentCell(state.activePlayer, cellX, cellZ, GAME_CONFIG.boardSize)
            && !boardCoordinates.baseSeatAtCell(cellX, cellZ)
            && !boardCoordinates.unitAtCell(cellX, cellZ)) candidates.push({ x: cellX, z: cellZ });
        }
      }
      for (let count = 0; count < card.summonCount && candidates.length; count += 1) {
        const cell = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
        summonCard(goblinIndex, cell.x * tile - half, cell.z * tile - half, null, level);
      }
      interaction.clearMovementGrid();
      return;
    }
    const unit = makeSummonedUnit(cardIndex);
    unit.position.set(x, 0.06, z);
    unit.userData.ownerSeat = state.activePlayer;
    unit.userData.devLevel = level;
    setUnitOwnerFacing(unit, card.id, state.activePlayer);
    setUnitTeamColor(unit, state.activePlayer === 1 ? 0x168cff : 0xff352f);
    units.push(unit);
    hoverables.push(unit);
    scene.add(unit);
    if (card.id === 'wooden_house') boardPresentation.reconcileRoads(roads);
    if (card.buildRounds && !state.devInstantBuild) {
      unit.userData.buildReadyRound = state.round + card.buildRounds;
      applyConstructionState(unit, true);
    }
    if (card.id === 'archer' && mountableTower) actions.mountArcherLocally(unit, mountableTower);
    else interaction.selectUnit(unit, { cinematic: false });
    callbacks.syncDevKingdomHud?.();
    abilities.syncAbilityBadges();
  }

  function animateCardSummon(cardNode, tileInfo, onCommit) {
    if (cardCasting) return false;
    cardCasting = true;
    const rect = cardNode.getBoundingClientRect();
    const flight = cardNode.cloneNode(true);
    flight.classList.remove('selected', 'aiming');
    flight.classList.add('summon-card-flight');
    Object.assign(flight.style, {
      left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    });
    document.body.appendChild(flight);
    cardNode.classList.remove('aiming');
    cardNode.classList.add('casting');
    summonFlightPoint.set(tileInfo.worldX, 0.5, tileInfo.worldZ).project(camera);
    const targetX = (summonFlightPoint.x * 0.5 + 0.5) * innerWidth;
    const targetY = (-summonFlightPoint.y * 0.5 + 0.5) * innerHeight;
    const dx = targetX - (rect.left + rect.width / 2);
    const dy = targetY - (rect.top + rect.height / 2);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    app.dataset.cardFlight = 'active';
    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      onCommit();
    };
    const keyframes = reduced
      ? [{ transform: 'scale(1)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.16)`, opacity: 0 }]
      : [
          { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 },
          { offset: 0.08, transform: 'translate(-5px,1px) rotate(-2.4deg) scale(1.015)' },
          { offset: 0.16, transform: 'translate(5px,-1px) rotate(2.4deg) scale(1.015)' },
          { offset: 0.24, transform: 'translate(-4px,0) rotate(-1.8deg) scale(1.02)' },
          { offset: 0.32, transform: 'translate(3px,-8px) rotate(1.2deg) scale(1.03)' },
          { offset: 0.72, transform: `translate(${dx * 0.78}px,${dy * 0.68 - 42}px) rotate(-7deg) scale(.72)`, opacity: 0.95 },
          { transform: `translate(${dx}px,${dy}px) rotate(-14deg) scale(.16)`, opacity: 0 },
        ];
    const motion = flight.animate(keyframes, {
      duration: reduced ? 180 : 720, easing: 'cubic-bezier(.2,.72,.18,1)', fill: 'forwards',
    });
    setTimeout(commit, reduced ? 45 : 280);
    motion.finished.catch(() => {}).finally(() => {
      commit();
      flight.remove();
      cardNode.classList.remove('casting');
      cardCasting = false;
      app.dataset.cardFlight = 'done';
      callbacks.syncBottomCommand?.();
    });
    return true;
  }

  function commitSummon(cardNode, index, tileInfo) {
    if (state.onlineState) {
      callbacks.sendOnlineAction?.({
        type: 'summon', cardInstanceId: cardNode.dataset.instance, x: tileInfo.x, z: tileInfo.z,
      });
      return;
    }
    summonCard(index, tileInfo.worldX, tileInfo.worldZ, tileInfo.mountableTower,
      Number(cardNode.dataset.cardLevel) || 1);
    cardNode.remove();
    document.querySelector('#hand-count').textContent = `${hand.querySelectorAll('.game-card').length} CARTAS`;
  }

  function playSelectedCardAtPointer(event, cardNode) {
    if (!cardNode) return false;
    if (state.onlineState && state.onlineState.state.activeSeat !== state.selfSeat) {
      callbacks.showGameError?.('Aguarde o seu turno.');
      return true;
    }
    const index = Number(cardNode.dataset.card);
    const tileInfo = cardTileAtPointer(event, index);
    if (!tileInfo?.valid) {
      callbacks.showGameError?.(isRoadCard(cards[index].id)
        ? 'Conecte a estrada ao castelo ou a outra Rua do seu reino.'
        : 'Escolha uma casa livre a até 2 casas do seu reino.');
      return true;
    }
    if (!animateCardSummon(cardNode, tileInfo, () => commitSummon(cardNode, index, tileInfo))) return true;
    cardNode.classList.remove('selected');
    callbacks.showDeploymentArea?.(false);
    callbacks.syncBottomCommand?.();
    return true;
  }

  return {
    isCasting: () => cardCasting,
    cardTileAtPointer,
    makeSummonedUnit,
    applyConstructionState,
    animateCardSummon,
    commitSummon,
    playSelectedCardAtPointer,
  };
}
