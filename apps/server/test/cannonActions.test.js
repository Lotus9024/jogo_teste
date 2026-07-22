import test from 'node:test';
import assert from 'node:assert/strict';
import { match } from '../test-support/match.js';

test('canhão exige operador exatamente atrás para disparar', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'cannon-1', ownerSeat: 1, cardId: 'cannon', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'target-1', ownerSeat: 2, cardId: 'guard', x: 7, z: 4, hp: 8, shield: 0, actionUsed: false }
  );
  assert.throws(
    () => rooms.action(room.code, first.id, { type: 'attack', unitId: 'cannon-1', targetUnitId: 'target-1' }, room.state.version),
    /Operador disponível/
  );
  room.state.units.push({ id: 'operator-1', ownerSeat: 1, cardId: 'operator', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false });
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'cannon-1', targetUnitId: 'target-1' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'target-1').hp, 5);
  assert.equal(room.state.units.find(unit => unit.id === 'operator-1').actionUsed, true);
});

test('canhão dispara somente para frente entre três e seis casas', () => {
  for (const [id, x, z] of [['near', 7, 6], ['side', 10, 8], ['far', 7, 1]]) {
    const { rooms, room, first } = match();
    room.state.units.push(
      { id: 'cannon-range', ownerSeat: 1, cardId: 'cannon', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
      { id: 'operator-range', ownerSeat: 1, cardId: 'operator', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false },
      { id, ownerSeat: 2, cardId: 'guard', x, z, hp: 8, shield: 0, actionUsed: false }
    );
    assert.throws(
      () => rooms.action(room.code, first.id, { type: 'attack', unitId: 'cannon-range', targetUnitId: id }, room.state.version),
      /fora de alcance/
    );
  }
});

test('explosão do canhão causa 3 no impacto e 1 nas oito casas ao redor', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'cannon-area', ownerSeat: 1, cardId: 'cannon', x: 7, z: 9, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'operator-area', ownerSeat: 1, cardId: 'operator', x: 7, z: 10, hp: 1, shield: 0, actionUsed: false },
    { id: 'impact', ownerSeat: 2, cardId: 'guard', x: 7, z: 5, hp: 8, shield: 0, actionUsed: false },
    { id: 'enemy-splash', ownerSeat: 2, cardId: 'guard', x: 8, z: 5, hp: 8, shield: 0, actionUsed: false },
    { id: 'ally-splash', ownerSeat: 1, cardId: 'guard', x: 8, z: 6, hp: 8, shield: 0, actionUsed: false },
    { id: 'safe', ownerSeat: 1, cardId: 'guard', x: 9, z: 5, hp: 8, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'cannon-area', targetUnitId: 'impact' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'impact').hp, 5);
  for (const id of ['enemy-splash', 'ally-splash']) assert.equal(room.state.units.find(unit => unit.id === id).hp, 7);
  assert.equal(room.state.units.find(unit => unit.id === 'safe').hp, 8);
});

test('selecionar o canhão avança a formação uma casa e consome as duas ações', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'cannon-move', ownerSeat: 1, cardId: 'cannon', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'operator-move', ownerSeat: 1, cardId: 'operator', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'move', unitId: 'cannon-move', x: 7, z: 7 }, room.state.version);
  const cannon = room.state.units.find(unit => unit.id === 'cannon-move');
  const operator = room.state.units.find(unit => unit.id === 'operator-move');
  assert.deepEqual({ x: cannon.x, z: cannon.z, actionUsed: cannon.actionUsed }, { x: 7, z: 7, actionUsed: true });
  assert.deepEqual({ x: operator.x, z: operator.z, actionUsed: operator.actionUsed }, { x: 7, z: 8, actionUsed: true });
});

test('formação não avança se o canhão agiu ou a casa frontal está ocupada', () => {
  const acted = match();
  acted.room.state.units.push(
    { id: 'cannon-acted', ownerSeat: 1, cardId: 'cannon', x: 7, z: 8, hp: 2, shield: 0, actionUsed: true, underConstruction: false },
    { id: 'operator-acted', ownerSeat: 1, cardId: 'operator', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false }
  );
  assert.throws(() => acted.rooms.action(acted.room.code, acted.first.id, { type: 'move', unitId: 'cannon-acted', x: 7, z: 7 }, acted.room.state.version), /já agiu/);

  const blocked = match();
  blocked.room.state.units.push(
    { id: 'cannon-blocked', ownerSeat: 1, cardId: 'cannon', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'operator-blocked', ownerSeat: 1, cardId: 'operator', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false },
    { id: 'blocker', ownerSeat: 2, cardId: 'guard', x: 7, z: 7, hp: 4, shield: 0, actionUsed: false }
  );
  assert.throws(() => blocked.rooms.action(blocked.room.code, blocked.first.id, { type: 'move', unitId: 'cannon-blocked', x: 7, z: 7 }, blocked.room.state.version), /bloqueada/);
});

test('canhão pode disparar em casa vazia e atingir a área ao redor', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'cannon-empty', ownerSeat: 1, cardId: 'cannon', x: 7, z: 9, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'operator-empty', ownerSeat: 1, cardId: 'operator', x: 7, z: 10, hp: 1, shield: 0, actionUsed: false },
    { id: 'splash-empty', ownerSeat: 2, cardId: 'guard', x: 8, z: 5, hp: 8, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'cannon-empty', x: 7, z: 5 }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'splash-empty').hp, 7);
  assert.equal(room.state.units.find(unit => unit.id === 'operator-empty').actionUsed, true);
});

test('tropas e construções bloqueiam o tiro do canhão', () => {
  for (const [blockerId, blockerCardId] of [['troop-blocker', 'guard'], ['building-blocker', 'wooden_barrier']]) {
    const { rooms, room, first } = match();
    room.state.units.push(
      { id: `cannon-${blockerId}`, ownerSeat: 1, cardId: 'cannon', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false, underConstruction: false },
      { id: `operator-${blockerId}`, ownerSeat: 1, cardId: 'operator', x: 7, z: 10, hp: 1, shield: 0, actionUsed: false },
      { id: blockerId, ownerSeat: 1, cardId: blockerCardId, x: 7, z: 7, hp: 4, shield: 0, actionUsed: false, underConstruction: false },
      { id: `target-${blockerId}`, ownerSeat: 2, cardId: 'guard', x: 7, z: 5, hp: 8, shield: 0, actionUsed: false }
    );
    assert.throws(
      () => rooms.action(room.code, first.id, { type: 'attack', unitId: `cannon-${blockerId}`, targetUnitId: `target-${blockerId}` }, room.state.version),
      /linha de ataque.*bloqueada/i
    );
  }

  const emptyCell = match();
  emptyCell.room.state.units.push(
    { id: 'cannon-blocked-empty', ownerSeat: 1, cardId: 'cannon', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'operator-blocked-empty', ownerSeat: 1, cardId: 'operator', x: 7, z: 10, hp: 1, shield: 0, actionUsed: false },
    { id: 'construction-blocked-empty', ownerSeat: 2, cardId: 'tower', x: 7, z: 7, hp: 5, shield: 0, actionUsed: false, underConstruction: false }
  );
  assert.throws(
    () => emptyCell.rooms.action(emptyCell.room.code, emptyCell.first.id, { type: 'attack', unitId: 'cannon-blocked-empty', x: 7, z: 5 }, emptyCell.room.state.version),
    /linha de ataque.*bloqueada/i
  );
});

test('canhão permanece em construção por duas rodadas', () => {
  const { rooms, room, first, second } = match();
  room.state.players[0].hand.push({ instanceId: 'cannon-card', cardId: 'cannon' });
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'cannon-card', x: 6, z: 10 }, room.state.version);
  const cannon = room.state.units[0];
  assert.equal(cannon.underConstruction, true);
  assert.equal(cannon.buildReadyRound, 3);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(cannon.underConstruction, true);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(cannon.underConstruction, false);
});
