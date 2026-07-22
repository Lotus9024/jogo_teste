import { randomUUID } from 'node:crypto';
import { CARD_BY_ID, goblinSpawnHp, isGoblinTroop } from '@tronos/shared/cards';
import { damageUnit, fireTowerVolley, mountedTower } from '../combat.js';
import { fail, inBase, integer, turnIndex, unitAt, validCell } from '../gameQueries.js';
import { requireTurn } from '../turnLifecycle.js';

export function useAbilityAction(state, player, _opponent, action) {
  requireTurn(state, player);
  const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
  const card = CARD_BY_ID[unit.cardId];
  if (card.id === 'goblin_tower') fail('Escolha a casa onde o Goblin será invocado.');
  const tower = mountedTower(state, unit);
  const ability = card.id === 'archer' && tower ? CARD_BY_ID.tower.ability : card.ability;
  if (!ability?.enabled || (unit.abilityReadyTurn ?? 0) > turnIndex(state) || player.energy < ability.cost) fail('Habilidade indisponível.');
  if (unit.actionUsed || unit.underConstruction) fail('Esta unidade já agiu neste turno.');
  if (card.id === 'archer' && tower) fireTowerVolley(state, player, unit, ability);
  if (card.id === 'goblin_altar') {
    state.units.filter(item => item.ownerSeat === player.seat
      && isGoblinTroop(item.cardId)
      && Math.abs(item.x - unit.x) + Math.abs(item.z - unit.z) <= ability.range)
      .forEach(item => { item.bonusMoves = (item.bonusMoves ?? 0) + 1; });
  }
  if (card.id === 'mage_altar') {
    const expires = turnIndex(state) + ability.durationTurns;
    state.units.filter(item => isGoblinTroop(item.cardId)).forEach(item => {
      item.attackPenalty = 1;
      item.attackPenaltyUntilTurn = Math.max(item.attackPenaltyUntilTurn ?? 0, expires);
    });
  }
  player.energy -= ability.cost;
  unit.abilityUsed = true;
  unit.abilityReadyTurn = turnIndex(state) + (ability.cooldownTurns ?? 2);
  unit.actionUsed = true;
}

export function useInstantAction(state, player, _opponent, action) {
  if (state.phase !== 'playing') fail('A partida ainda não começou.');
  const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
  const card = CARD_BY_ID[unit.cardId];
  const instant = card.instant;
  if (!instant?.enabled || (unit.instantReadyTurn ?? 0) > turnIndex(state) || player.energy < instant.cost) fail('Habilidade instantânea indisponível.');
  if (card.id === 'mage') {
    [...state.units]
      .filter(item => item.id !== unit.id && Math.max(Math.abs(item.x - unit.x), Math.abs(item.z - unit.z)) <= instant.radius)
      .forEach(item => damageUnit(state, item, instant.damage));
  }
  player.energy -= instant.cost;
  unit.instantUsedRound = state.round;
  unit.instantReadyTurn = turnIndex(state) + (instant.cooldownTurns ?? 2);
}

export function summonGoblinAction(state, player, _opponent, action) {
  requireTurn(state, player);
  const tower = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Torre Goblin inválida.');
  const card = CARD_BY_ID[tower.cardId];
  if (card.id !== 'goblin_tower' || tower.underConstruction || tower.actionUsed) fail('Habilidade indisponível.');
  const x = integer(action.x), z = integer(action.z);
  if (!validCell(x, z) || inBase(x, z, state) || unitAt(state, x, z)) fail('Escolha uma casa livre da arena.');
  const goblinIndex = player.deck.findIndex(cardId => cardId === 'goblin');
  if (goblinIndex < 0) fail('É necessário ter um Goblin no baralho.');
  if (player.energy < card.ability.cost) fail('Energia insuficiente.');
  player.deck.splice(goblinIndex, 1);
  player.energy -= card.ability.cost;
  const hp = goblinSpawnHp(player.seat, x, z, state.units, 'goblin');
  state.units.push({
    id: randomUUID(), ownerSeat: player.seat, cardId: 'goblin', x, z, hp, maxHp: hp, shield: 0,
    actionUsed: true, abilityUsed: false, abilityReadyTurn: 0, instantUsedRound: 0,
    instantReadyTurn: 0, empowered: false, mountedOnTowerId: null,
    underConstruction: false, buildReadyRound: null
  });
  tower.actionUsed = true;
  tower.abilityUsed = true;
}
