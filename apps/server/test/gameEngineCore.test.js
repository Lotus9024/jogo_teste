import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { match } from '../test-support/match.js';

test('inicia com sete cartas privadas e dez de energia', () => {
  const { room } = match();
  assert.equal(room.state.players[0].hand.length, 7);
  assert.equal(room.state.players[1].hand.length, 7);
  assert.equal(room.state.players[0].energy, 10);
  assert.equal(room.state.players[0].maxEnergy, 10);
  assert.equal(room.state.players[0].baseHp, 10);
  assert.equal(GAME_CONFIG.turnDurationSeconds, 120);
});

test('invocação válida consome a carta e energia no servidor', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  player.hand[0].cardId = 'warrior';
  const instance = player.hand[0], cost = CARD_BY_ID[instance.cardId].cost;
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: instance.instanceId, x: 6, z: 10 }, room.state.version);
  assert.equal(player.hand.length, 6);
  assert.equal(player.energy, 10 - cost);
  assert.equal(room.state.units[0].ownerSeat, 1);
});

test('rejeita ação fora do turno, replay e posição adulterada', () => {
  const { rooms, room, first, second } = match();
  room.state.players[1].hand[0].cardId = 'warrior';
  const secondCard = room.state.players[1].hand[0];
  assert.throws(() => rooms.action(room.code, second.id, { type: 'summon', cardInstanceId: secondCard.instanceId, x: 2, z: 5 }, room.state.version), /turno/);
  const oldVersion = room.state.version;
  rooms.action(room.code, first.id, { type: 'end_turn' }, oldVersion);
  assert.throws(() => rooms.action(room.code, second.id, { type: 'end_turn' }, oldVersion), /estado/);
  assert.throws(() => rooms.action(room.code, second.id, { type: 'summon', cardInstanceId: secondCard.instanceId, x: 2, z: 12 }, room.state.version), /2 casas/);
});

test('passar turno compra carta, entrega energia e reinicia o relógio', () => {
  const { rooms, room, first } = match();
  room.state.players[1].energy = 7;
  const previousDeadline = room.state.turnEndsAt;
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.activeSeat, 2);
  assert.equal(room.state.players[1].energy, 10);
  assert.equal(room.state.players[1].hand.length, 7);
  assert.ok(room.state.turnEndsAt >= previousDeadline);
});

test('cartas usam os atributos definidos', () => {
  assert.deepEqual(
    Object.fromEntries(Object.values(CARD_BY_ID).map(card => [card.id, {
      hp: card.hp, damage: card.damage, move: card.move, movementType: card.movementType, cost: card.cost
    }])),
    {
      warrior: { hp: 2, damage: 2, move: 2, movementType: 'straight', cost: 5 },
      guard: { hp: 3, damage: 1, move: 1, movementType: 'any', cost: 5 },
      henry: { hp: 1, damage: 1, move: 1, movementType: 'any', cost: 4 },
      archer: { hp: 2, damage: 1, move: 1, movementType: 'any', cost: 6 },
      wooden_barrier: { hp: 3, damage: 0, move: 0, movementType: 'none', cost: 2 },
      tower: { hp: 5, damage: 0, move: 0, movementType: 'none', cost: 7 },
      operator: { hp: 1, damage: 0, move: 1, movementType: 'any', cost: 3 },
      citizen: { hp: 1, damage: 1, move: 1, movementType: 'any', cost: 3 },
      cannon: { hp: 1, damage: 3, move: 1, movementType: 'forward', cost: 8 },
      wooden_house: { hp: 1, damage: 0, move: 0, movementType: 'none', cost: 3 },
      goblin_house: { hp: 1, damage: 0, move: 0, movementType: 'none', cost: 4 },
      road: { hp: null, damage: 0, move: 0, movementType: 'none', cost: 1 },
      goblin: { hp: 1, damage: 1, move: 1, movementType: 'any', cost: 2 },
      goblin_swarm: { hp: 1, damage: 1, move: 1, movementType: 'any', cost: 4 },
      goblin_bomber: { hp: 1, damage: 1, move: 1, movementType: 'straight', cost: 4 },
      goblin_clone: { hp: 1, damage: 1, move: 1, movementType: 'straight', cost: 4 },
      goblin_tower: { hp: 5, damage: 0, move: 0, movementType: 'none', cost: 8 },
      mage: { hp: 2, damage: 2, move: 1, movementType: 'any', cost: 6 },
      goblin_altar: { hp: 1, damage: 0, move: 0, movementType: 'none', cost: 5 },
      mage_altar: { hp: 1, damage: 0, move: 0, movementType: 'none', cost: 6 },
      builder_area: { hp: 1, damage: 0, move: 0, movementType: 'none', cost: 7 },
      cobblestone_road: { hp: null, damage: 0, move: 0, movementType: 'none', cost: 5 }
    }
  );
  assert.deepEqual(
    { minAttackRange: CARD_BY_ID.warrior.minAttackRange, attackRange: CARD_BY_ID.warrior.attackRange },
    { minAttackRange: 1, attackRange: 2 }
  );
  Object.values(CARD_BY_ID).forEach(card => {
    assert.equal(card.ability.enabled, ['tower', 'goblin_house', 'goblin_bomber', 'goblin_tower', 'goblin_altar', 'mage_altar'].includes(card.id));
    assert.equal(card.instant.enabled, ['mage', 'goblin_clone'].includes(card.id));
  });
  assert.deepEqual(
    { minAttackRange: CARD_BY_ID.archer.minAttackRange, attackRange: CARD_BY_ID.archer.attackRange, ability: CARD_BY_ID.archer.ability.name },
    { minAttackRange: 3, attackRange: 4, ability: 'Nenhuma' }
  );
  assert.deepEqual(
    { rarity: CARD_BY_ID.archer.rarity, rarityClass: CARD_BY_ID.archer.rarityClass },
    { rarity: 'INCOMUM', rarityClass: 'uncommon' }
  );
  assert.equal(CARD_BY_ID.wooden_barrier.buildRounds, 1);
  assert.equal(CARD_BY_ID.tower.buildRounds, 2);
  assert.deepEqual(
    { minAttackRange: CARD_BY_ID.cannon.minAttackRange, attackRange: CARD_BY_ID.cannon.attackRange, areaRadius: CARD_BY_ID.cannon.areaRadius, buildRounds: CARD_BY_ID.cannon.buildRounds },
    { minAttackRange: 3, attackRange: 6, areaRadius: 1, buildRounds: 2 }
  );
});
