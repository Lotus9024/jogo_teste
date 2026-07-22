import { randomUUID } from 'node:crypto';
import { CARD_BY_ID, effectiveCardCost, goblinSpawnHp, isRoadPlacementCell } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { mountableTowerAt } from '../combat.js';
import { deploymentCell, fail, inBase, integer, unitAt, unitsAt, validCell } from '../gameQueries.js';
import { requireTurn } from '../turnLifecycle.js';

export function summonAction(state, player, _opponent, action) {
  requireTurn(state, player);
  const x = integer(action.x), z = integer(action.z);
  const index = player.hand.findIndex(card => card.instanceId === action.cardInstanceId);
  if (index < 0) fail('Esta carta não está na sua mão.');
  const instance = player.hand[index], card = CARD_BY_ID[instance.cardId];
  if (!card) fail('Carta inválida.');
  const tower = mountableTowerAt(state, player, card, x, z);
  const roadBlocker = unitsAt(state, x, z).some(unit => ['construction', 'machine'].includes(CARD_BY_ID[unit.cardId]?.type));
  const roadOccupied = state.roads.some(road => road.x === x && road.z === z);
  if (card.id === 'road') {
    if (!validCell(x, z) || inBase(x, z) || roadBlocker || !isRoadPlacementCell(player.seat, x, z, state.roads, GAME_CONFIG.boardSize)) fail('A Rua precisa estar conectada ao castelo ou a outra Rua do seu reino.');
  } else if (!validCell(x, z) || !deploymentCell(player.seat, x, z) || inBase(x, z) || (unitAt(state, x, z) && !tower) || (roadOccupied && ['construction', 'machine'].includes(card.type))) fail('Escolha uma casa livre a até 2 casas do seu reino.');
  const cost = effectiveCardCost(card.id, player.seat, state.units);
  if (player.energy < cost) fail('Energia insuficiente.');
  player.energy -= cost;
  player.hand.splice(index, 1);
  player.discard.push(instance.cardId);
  if (card.id === 'road') {
    state.roads.push({ id: randomUUID(), ownerSeat: player.seat, x, z, underConstruction: true, buildReadyRound: state.round + card.buildRounds });
    return;
  }
  const hp = card.id === 'goblin' ? goblinSpawnHp(player.seat, x, z, state.units) : card.hp;
  state.units.push({
    id: randomUUID(), ownerSeat: player.seat, cardId: card.id, x, z, hp, maxHp: hp, shield: 0,
    actionUsed: true, abilityUsed: false, abilityReadyTurn: 0, instantUsedRound: 0, instantReadyTurn: 0, empowered: false, mountedOnTowerId: tower?.id ?? null,
    underConstruction: Boolean(card.buildRounds), buildReadyRound: card.buildRounds ? state.round + card.buildRounds : null
  });
}
