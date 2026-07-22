import test from 'node:test';
import assert from 'node:assert/strict';
import { match } from '../test-support/match.js';

test('Mago incendeia uma ou duas casas e o fogo persiste pelo turno rival', () => {
  const { rooms, room, first, second } = match();
  room.state.units.push(
    { id: 'mage-fire', ownerSeat: 1, cardId: 'mage', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'fire-blocker', ownerSeat: 1, cardId: 'guard', x: 7, z: 7, hp: 4, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'fire-target', ownerSeat: 2, cardId: 'guard', x: 7, z: 5, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'mage_fire', unitId: 'mage-fire', cells: [{ x: 7, z: 5 }, { x: 8, z: 5 }] }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'fire-target').hp, 2);
  assert.equal(room.state.units.find(unit => unit.id === 'fire-blocker').hp, 4);
  assert.equal(room.state.fires.length, 2);
  assert.equal(room.state.units.find(unit => unit.id === 'mage-fire').actionUsed, true);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.fires.length, 2);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'fire-target').hp, 1);
  assert.equal(room.state.fires.length, 0);
});

test('tropa que entra no fogo sofre um dano apenas uma vez', () => {
  const { rooms, room, first, second } = match();
  room.state.units.push(
    { id: 'mage-entry', ownerSeat: 1, cardId: 'mage', x: 7, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'entry-target', ownerSeat: 2, cardId: 'guard', x: 7, z: 5, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'mage_fire', unitId: 'mage-entry', cells: [{ x: 7, z: 6 }] }, room.state.version);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'move', unitId: 'entry-target', x: 7, z: 6 }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'entry-target').hp, 3);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'entry-target').hp, 3);
  assert.equal(room.state.fires.length, 0);
});

test('círculo ácido do Mago é instantâneo e recarrega após dois turnos', () => {
  const { rooms, room, first, second } = match();
  room.state.units.push(
    { id: 'mage-acid', ownerSeat: 1, cardId: 'mage', x: 7, z: 8, hp: 2, shield: 0, actionUsed: true, instantReadyTurn: 0 },
    { id: 'acid-ally', ownerSeat: 1, cardId: 'guard', x: 6, z: 8, hp: 4, shield: 0, actionUsed: false },
    { id: 'acid-enemy', ownerSeat: 2, cardId: 'guard', x: 8, z: 9, hp: 4, shield: 0, actionUsed: false },
    { id: 'acid-safe', ownerSeat: 2, cardId: 'guard', x: 9, z: 8, hp: 4, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, first.id, { type: 'use_instant', unitId: 'mage-acid' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'acid-ally').hp, 1);
  assert.equal(room.state.units.find(unit => unit.id === 'acid-enemy').hp, 1);
  assert.equal(room.state.units.find(unit => unit.id === 'acid-safe').hp, 4);
  assert.equal(room.state.units.find(unit => unit.id === 'mage-acid').hp, 2);
  assert.equal(room.state.players[0].energy, 6);
  assert.equal(room.state.units.find(unit => unit.id === 'mage-acid').instantReadyTurn, 3);
  assert.throws(() => rooms.action(room.code, first.id, { type: 'use_instant', unitId: 'mage-acid' }, room.state.version), /indisponível/);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.throws(() => rooms.action(room.code, first.id, { type: 'use_instant', unitId: 'mage-acid' }, room.state.version), /indisponível/);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, first.id, { type: 'use_instant', unitId: 'mage-acid' }, room.state.version);
  assert.equal(room.state.units.some(unit => ['acid-ally', 'acid-enemy'].includes(unit.id)), false);
});

test('Mago rejeita fogo duplicado, distante ou com mais de duas casas', () => {
  const { rooms, room, first } = match();
  room.state.units.push({ id: 'mage-invalid', ownerSeat: 1, cardId: 'mage', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, abilityUsed: false });
  for (const cells of [[{ x: 7, z: 5 }, { x: 7, z: 5 }], [{ x: 7, z: 3 }], [{ x: 7, z: 5 }, { x: 8, z: 5 }, { x: 9, z: 5 }]]) {
    assert.throws(() => rooms.action(room.code, first.id, { type: 'mage_fire', unitId: 'mage-invalid', cells }, room.state.version));
  }
});
