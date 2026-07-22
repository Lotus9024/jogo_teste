import test from 'node:test';
import assert from 'node:assert/strict';
import { match } from '../test-support/match.js';

test('guerreiro só anda reto e guarda pode andar na diagonal', () => {
  const { rooms, room, first } = match();
  room.state.units.push({ id: 'warrior-1', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false });
  assert.throws(() => rooms.action(room.code, first.id, { type: 'move', unitId: 'warrior-1', x: 5, z: 10 }, room.state.version), /Movimento inválido/);
  rooms.action(room.code, first.id, { type: 'move', unitId: 'warrior-1', x: 6, z: 9 }, room.state.version);
  assert.deepEqual({ x: room.state.units[0].x, z: room.state.units[0].z }, { x: 6, z: 9 });

  const other = match();
  other.room.state.units.push({ id: 'guard-1', ownerSeat: 1, cardId: 'guard', x: 4, z: 9, hp: 4, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false });
  other.rooms.action(other.room.code, other.first.id, { type: 'move', unitId: 'guard-1', x: 5, z: 10 }, other.room.state.version);
  assert.deepEqual({ x: other.room.state.units[0].x, z: other.room.state.units[0].z }, { x: 5, z: 10 });
});

test('não consome a ação ao tentar mover para a própria casa', () => {
  const { rooms, room, first } = match();
  const unit = { id: 'same-cell', ownerSeat: 1, cardId: 'guard', x: 4, z: 9, hp: 4, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false };
  room.state.units.push(unit);
  assert.throws(
    () => rooms.action(room.code, first.id, { type: 'move', unitId: unit.id, x: unit.x, z: unit.z }, room.state.version),
    /Movimento inválido/
  );
  assert.equal(unit.actionUsed, false);
  assert.deepEqual({ x: unit.x, z: unit.z }, { x: 4, z: 9 });
});

test('guerreiro ataca a até dois blocos de distância', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'warrior-range', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-range', ownerSeat: 2, cardId: 'guard', x: 4, z: 11, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'warrior-range', targetUnitId: 'target-range' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'target-range').hp, 2);
});

test('tropas bloqueiam movimento e ataques contra casas atrás delas', () => {
  const movement = match();
  movement.room.state.units.push(
    { id: 'moving-warrior', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'movement-blocker', ownerSeat: 1, cardId: 'guard', x: 5, z: 9, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  assert.throws(
    () => movement.rooms.action(movement.room.code, movement.first.id, { type: 'move', unitId: 'moving-warrior', x: 6, z: 9 }, movement.room.state.version),
    /caminho.*bloqueado/i
  );

  const attack = match();
  attack.room.state.units.push(
    { id: 'attacking-warrior', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'attack-blocker', ownerSeat: 1, cardId: 'guard', x: 5, z: 9, hp: 4, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'blocked-target', ownerSeat: 2, cardId: 'guard', x: 6, z: 9, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  assert.throws(
    () => attack.rooms.action(attack.room.code, attack.first.id, { type: 'attack', unitId: 'attacking-warrior', targetUnitId: 'blocked-target' }, attack.room.state.version),
    /linha de ataque.*bloqueada/i
  );
});
test('unidades corpo a corpo ocupam a casa da criatura eliminada', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'warrior-advance', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-advance', ownerSeat: 2, cardId: 'guard', x: 4, z: 10, hp: 2, shield: 0, actionUsed: false, abilityUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'warrior-advance', targetUnitId: 'target-advance' }, room.state.version);
  assert.equal(room.state.units.some(unit => unit.id === 'target-advance'), false);
  assert.deepEqual(
    { x: room.state.units.find(unit => unit.id === 'warrior-advance').x, z: room.state.units.find(unit => unit.id === 'warrior-advance').z },
    { x: 4, z: 10 }
  );
});

test('habilidades normais e instantâneas estão indisponíveis', () => {
  const { rooms, room, first } = match();
  room.state.units.push({ id: 'warrior-1', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false });
  assert.throws(() => rooms.action(room.code, first.id, { type: 'use_ability', unitId: 'warrior-1' }, room.state.version), /indisponível/);
  assert.throws(() => rooms.action(room.code, first.id, { type: 'use_instant', unitId: 'warrior-1' }, room.state.version), /indisponível/);
});

test('cartas só podem ser lançadas a até duas casas do reino', () => {
  const { rooms, room, first } = match();
  room.state.players[0].hand.push({ instanceId: 'zone-card', cardId: 'wooden_barrier' });
  assert.throws(
    () => rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'zone-card', x: 6, z: 9 }, room.state.version),
    /2 casas/
  );
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'zone-card', x: 6, z: 10 }, room.state.version);
  assert.deepEqual({ x: room.state.units[0].x, z: room.state.units[0].z }, { x: 6, z: 10 });
});
