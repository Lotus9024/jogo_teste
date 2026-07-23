import { randomInt, randomUUID } from 'node:crypto';
import { CARD_BY_ID, effectiveCardCost, goblinSpawnHp, isGoblinTroop, isRoadCard, isRoadPlacementCell } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { mountableTowerAt } from '../combat.js';
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
  const roadBlocker = unitsAt(state, x, z).some(unit => ['construction', 'machine'].includes(CARD_BY_ID[unit.cardId]?.type));
  const roadOccupied = state.roads.some(road => road.x === x && road.z === z);
  if (roadCard) {
    if (!validCell(x, z) || inBase(x, z, state) || roadBlocker || !isRoadPlacementCell(player.seat, x, z, state.roads, GAME_CONFIG.boardSize)) fail('A estrada precisa estar conectada ao castelo ou a outra Rua do seu reino.');
  } else if (!validCell(x, z) || !deploymentCell(player.seat, x, z, state) || inBase(x, z, state) || (unitAt(state, x, z) && !tower) || (roadOccupied && ['construction', 'machine'].includes(card.type))) fail('Escolha uma casa livre a até 2 casas do seu reino.');
  if (card.id === 'goblin_altar' && goblinTroopsInBaseArea(state, player.seat).length < 2) fail('O Altar Goblin exige duas tropas Goblin na área da sua base.');
  if (card.id === 'mage_altar' && state.units.some(unit => unit.ownerSeat === player.seat && isGoblinTroop(unit.cardId))) fail('O Altar Mago não pode ser usado enquanto você controlar um Goblin na arena.');
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
  const hp = isGoblinTroop(card.id) ? goblinSpawnHp(player.seat, x, z, state.units, card.id) : card.hp;
  state.units.push({
    id: randomUUID(), ownerSeat: player.seat, cardId: card.id, x, z, hp, maxHp: hp, shield: 0,
    actionUsed: card.id !== 'henry', movedThisTurn: false, attackedThisTurn: false,
    abilityUsed: false, abilityReadyTurn: 0, instantUsedRound: 0, instantReadyTurn: 0, empowered: false, mountedOnTowerId: tower?.id ?? null,
    bonusMoves: 0, bonusAttacks: 0, attackPenalty: 0, attackPenaltyUntilTurn: 0,
    underConstruction: Boolean(card.buildRounds), buildReadyRound: card.buildRounds ? state.round + card.buildRounds : null
  });
}
