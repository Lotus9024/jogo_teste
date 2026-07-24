import { randomInt, randomUUID } from 'node:crypto';
import { CARD_BY_ID, effectiveCardCost, goblinSpawnHp, isGoblinTroop, isRoadCard, isRoadPlacementCell, royalRequirementError } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { mountableTowerAt } from '../combat.js';
import { applyRoyalWarriorBlessing, castBlizzard, pushBattleEffect } from '../battleEffects.js';
import { deploymentCell, fail, inBase, integer, unitAt, unitsAt, validCell } from '../gameQueries.js';
import { goblinTroopsInBaseArea } from '../kingdomEffects.js';
import { requireTurn } from '../turnLifecycle.js';

export function summonAction(state, player, _opponent, action) {
  requireTurn(state, player);
  const x = integer(action.x), z = integer(action.z);
  const index = player.hand.findIndex(card => card.instanceId === action.cardInstanceId);
  if (index < 0) fail('Esta carta não está na sua mão.');
  const instance = player.hand[index], card = CARD_BY_ID[instance.cardId];
  if (!card) fail('Carta inválida.');
  const tower = mountableTowerAt(state, player, card, x, z);
  const roadCard = isRoadCard(card.id);
  const spellCard = card.type === 'spell';
  const roadBlocker = unitsAt(state, x, z).some(unit => ['construction', 'machine'].includes(CARD_BY_ID[unit.cardId]?.type));
  const roadOccupied = state.roads.some(road => road.x === x && road.z === z);
  if (spellCard) {
    if (!validCell(x, z) || inBase(x, z, state)) fail('Escolha uma casa da arena para lançar o feitiço.');
  } else if (roadCard) {
    if (!validCell(x, z) || !deploymentCell(player.seat, x, z, state) || inBase(x, z, state) || roadBlocker
      || !isRoadPlacementCell(player.seat, x, z, state.roads, GAME_CONFIG.boardSize, player.baseLevel)) {
      fail('A estrada precisa estar na área do reino e conectada ao castelo ou a outra Rua sua.');
    }
  } else if (!validCell(x, z) || !deploymentCell(player.seat, x, z, state) || inBase(x, z, state) || (unitAt(state, x, z) && !tower) || (roadOccupied && ['construction', 'machine'].includes(card.type))) fail('Escolha uma casa livre a até 2 casas do seu reino.');
  if (card.id === 'goblin_house' && state.units.some(unit => {
    const nearbyCard = CARD_BY_ID[unit.cardId];
    return nearbyCard?.house && nearbyCard.category === 'basic'
      && Math.max(Math.abs(unit.x - x), Math.abs(unit.z - z)) === 1;
  })) fail('A Casa Goblin não pode ficar ao lado de outra casa Básica.');
  if (card.id === 'goblin_altar' && goblinTroopsInBaseArea(state, player.seat).length < 2) fail('O Altar Goblin exige duas tropas Goblin na área da sua base.');
  if (card.id === 'mage_altar' && state.units.some(unit => unit.ownerSeat === player.seat && isGoblinTroop(unit.cardId))) fail('O Altar Mago não pode ser usado enquanto você controlar um Goblin na arena.');
  const requirementError = royalRequirementError(card.id, player.seat, state.units, player.citizens ?? 0);
  if (requirementError) fail(requirementError);
  const clonedCardId = card.id === 'goblin_clone' ? player.lastPlayedGoblinTroopCardId : null;
  const clonedCard = clonedCardId ? CARD_BY_ID[clonedCardId] : null;
  if (card.id === 'goblin_clone' && (!clonedCard || !isGoblinTroop(clonedCardId))) fail('Lance uma tropa Goblin antes de usar o Clone Goblin.');
  const swarmCells = [];
  if (card.id === 'goblin_swarm') {
    for (let candidateX = 0; candidateX < GAME_CONFIG.boardSize; candidateX += 1) {
      for (let candidateZ = 0; candidateZ < GAME_CONFIG.boardSize; candidateZ += 1) {
        if (deploymentCell(player.seat, candidateX, candidateZ, state)
          && !inBase(candidateX, candidateZ, state)
          && !unitAt(state, candidateX, candidateZ)) swarmCells.push({ x: candidateX, z: candidateZ });
      }
    }
    if (swarmCells.length < card.summonCount) fail('Não há espaço para o Enxame Goblin.');
  }
  const cost = effectiveCardCost(card.id, player.seat, state.units);
  if (player.energy < cost) fail('Energia insuficiente.');
  player.energy -= cost;
  player.hand.splice(index, 1);
  player.discard.push(instance.cardId);
  if (card.id === 'blizzard') {
    castBlizzard(state, player, card, x, z);
    return;
  }
  if (card.id === 'goblin_swarm') {
    for (let count = 0; count < card.summonCount; count += 1) {
      const selected = swarmCells.splice(randomInt(swarmCells.length), 1)[0];
      const hp = goblinSpawnHp(player.seat, selected.x, selected.z, state.units, card.summonsCardId);
      state.units.push({
        id: randomUUID(), ownerSeat: player.seat, cardId: card.summonsCardId, ...selected, hp, maxHp: hp, shield: 0,
        actionUsed: true, movedThisTurn: false, attackedThisTurn: false,
        abilityUsed: false, abilityReadyTurn: 0, instantUsedRound: 0, instantReadyTurn: 0,
        empowered: false, mountedOnTowerId: null, bonusMoves: 0, bonusAttacks: 0,
        attackPenalty: 0, attackPenaltyUntilTurn: 0, underConstruction: false, buildReadyRound: null
      });
    }
    return;
  }
  if (roadCard) {
    state.roads.push({ id: randomUUID(), cardId: card.id, ownerSeat: player.seat, x, z, underConstruction: true, buildReadyRound: state.round + card.buildRounds });
    return;
  }
  const summonedCard = clonedCard ?? card;
  const hp = isGoblinTroop(summonedCard.id) ? goblinSpawnHp(player.seat, x, z, state.units, summonedCard.id) : summonedCard.hp;
  const summonedUnit = {
    id: randomUUID(), ownerSeat: player.seat, cardId: summonedCard.id, x, z, hp, maxHp: hp, shield: 0,
    actionUsed: clonedCard ? true : card.id !== 'henry', movedThisTurn: false, attackedThisTurn: false,
    abilityUsed: false, abilityReadyTurn: 0, instantUsedRound: 0, instantReadyTurn: 0, empowered: false, mountedOnTowerId: tower?.id ?? null,
    bonusMoves: 0, bonusAttacks: 0, attackPenalty: 0, attackPenaltyUntilTurn: 0, isGoblinClone: Boolean(clonedCard), clonedFromCardId: clonedCardId, cloneDamageBonus: 0,
    movementPenalty: 0, movementPenaltyTurns: 0,
    underConstruction: Boolean(card.buildRounds), buildReadyRound: card.buildRounds ? state.round + card.buildRounds : null
  };
  state.units.push(summonedUnit);
  if (card.id === 'royal_warrior') applyRoyalWarriorBlessing(state, summonedUnit);
  if (clonedCard) {
    pushBattleEffect(state, {
      type: 'goblin_clone_spawn',
      unitId: summonedUnit.id,
      ownerSeat: summonedUnit.ownerSeat,
      x,
      z,
    });
  }
  if (!clonedCard && isGoblinTroop(card.id)) player.lastPlayedGoblinTroopCardId = card.id;
}
