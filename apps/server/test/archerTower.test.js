import test from 'node:test';
import assert from 'node:assert/strict';
import { match } from '../test-support/match.js';

test('arqueiro ataca somente a três ou quatro blocos e não ocupa a casa da vítima', () => {
  const near = match();
  near.room.state.units.push(
    { id: 'archer-near', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-near', ownerSeat: 2, cardId: 'guard', x: 4, z: 11, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  assert.throws(() => near.rooms.action(near.room.code, near.first.id, { type: 'attack', unitId: 'archer-near', targetUnitId: 'target-near' }, near.room.state.version), /fora de alcance/);

  const valid = match();
  valid.room.state.units.push(
    { id: 'archer-valid', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-valid', ownerSeat: 2, cardId: 'guard', x: 4, z: 12, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  valid.rooms.action(valid.room.code, valid.first.id, { type: 'attack', unitId: 'archer-valid', targetUnitId: 'target-valid' }, valid.room.state.version);
  assert.equal(valid.room.state.units.find(unit => unit.id === 'target-valid').hp, 3);

  const edge = match();
  edge.room.state.units.push(
    { id: 'archer-edge', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-edge', ownerSeat: 2, cardId: 'guard', x: 4, z: 13, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  edge.rooms.action(edge.room.code, edge.first.id, { type: 'attack', unitId: 'archer-edge', targetUnitId: 'target-edge' }, edge.room.state.version);
  assert.equal(edge.room.state.units.find(unit => unit.id === 'target-edge').hp, 3);

  const far = match();
  far.room.state.units.push(
    { id: 'archer-far', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-far', ownerSeat: 2, cardId: 'guard', x: 4, z: 14, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  assert.throws(() => far.rooms.action(far.room.code, far.first.id, { type: 'attack', unitId: 'archer-far', targetUnitId: 'target-far' }, far.room.state.version), /fora de alcance/);

  const kill = match();
  kill.room.state.units.push(
    { id: 'archer-kill', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-kill', ownerSeat: 2, cardId: 'guard', x: 4, z: 12, hp: 1, shield: 0, actionUsed: false, abilityUsed: false }
  );
  kill.rooms.action(kill.room.code, kill.first.id, { type: 'attack', unitId: 'archer-kill', targetUnitId: 'target-kill' }, kill.room.state.version);
  assert.equal(kill.room.state.units.some(unit => unit.id === 'target-kill'), false);
  assert.deepEqual(
    { x: kill.room.state.units.find(unit => unit.id === 'archer-kill').x, z: kill.room.state.units.find(unit => unit.id === 'archer-kill').z },
    { x: 4, z: 9 }
  );
});

test('arqueiro ataca por cima de barreiras, mas não de tropas', () => {
  const barrierLine = match();
  barrierLine.room.state.units.push(
    { id: 'archer-over-barrier', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false },
    { id: 'barrier-between', ownerSeat: 2, cardId: 'wooden_barrier', x: 4, z: 10, hp: 3, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'target-over-barrier', ownerSeat: 2, cardId: 'guard', x: 4, z: 12, hp: 4, shield: 0, actionUsed: false }
  );
  barrierLine.rooms.action(barrierLine.room.code, barrierLine.first.id, { type: 'attack', unitId: 'archer-over-barrier', targetUnitId: 'target-over-barrier' }, barrierLine.room.state.version);
  assert.equal(barrierLine.room.state.units.find(unit => unit.id === 'target-over-barrier').hp, 3);

  const troopLine = match();
  troopLine.room.state.units.push(
    { id: 'archer-behind-troop', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false },
    { id: 'troop-between', ownerSeat: 1, cardId: 'guard', x: 4, z: 10, hp: 4, shield: 0, actionUsed: false },
    { id: 'target-behind-troop', ownerSeat: 2, cardId: 'guard', x: 4, z: 12, hp: 4, shield: 0, actionUsed: false }
  );
  assert.throws(
    () => troopLine.rooms.action(troopLine.room.code, troopLine.first.id, { type: 'attack', unitId: 'archer-behind-troop', targetUnitId: 'target-behind-troop' }, troopLine.room.state.version),
    /linha de ataque.*bloqueada/i
  );
});

test('arqueiro ataca o castelo inimigo quando está no alcance', () => {
  const { rooms, room, first } = match();
  room.state.units.push({ id: 'archer-base', ownerSeat: 1, cardId: 'archer', x: 7, z: 5, hp: 2, shield: 0, actionUsed: false, abilityUsed: false });
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'archer-base', targetBaseSeat: 2 }, room.state.version);
  assert.equal(room.state.players[1].baseHp, 9);
});

test('arqueiro na torre ataca através de unidades à frente', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'tower-shot', ownerSeat: 1, cardId: 'tower', x: 7, z: 5, hp: 5, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'archer-tower-shot', ownerSeat: 1, cardId: 'archer', x: 7, z: 5, hp: 2, shield: 0, actionUsed: false, mountedOnTowerId: 'tower-shot' },
    { id: 'tower-shot-blocker', ownerSeat: 1, cardId: 'guard', x: 7, z: 4, hp: 4, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'archer-tower-shot', targetBaseSeat: 2 }, room.state.version);
  assert.equal(room.state.players[1].baseHp, 9);
});
test('arqueiro pode subir na torre e recebe mais um de alcance', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'tower-built', ownerSeat: 1, cardId: 'tower', x: 6, z: 10, hp: 5, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'archer-mount', ownerSeat: 1, cardId: 'archer', x: 6, z: 9, hp: 2, shield: 0, actionUsed: false, instantUsedRound: 0 },
    { id: 'range-five', ownerSeat: 2, cardId: 'guard', x: 6, z: 5, hp: 4, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'move', unitId: 'archer-mount', x: 6, z: 10 }, room.state.version);
  const archer = room.state.units.find(unit => unit.id === 'archer-mount');
  assert.equal(archer.mountedOnTowerId, 'tower-built');
  archer.actionUsed = false;
  assert.throws(
    () => rooms.action(room.code, first.id, { type: 'move', unitId: 'archer-mount', x: 6, z: 9 }, room.state.version),
    /arqueiro montado não pode se mover/i
  );
  assert.deepEqual({ x: archer.x, z: archer.z, tower: archer.mountedOnTowerId }, { x: 6, z: 10, tower: 'tower-built' });
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'archer-mount', targetUnitId: 'range-five' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'range-five').hp, 3);
});

test('rajada da torre funciona no próprio turno e recarrega após uma rodada', () => {
  const { rooms, room, first, second } = match();
  room.state.units.push(
    { id: 'tower-seat-2', ownerSeat: 2, cardId: 'tower', x: 7, z: 4, hp: 5, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'archer-seat-2', ownerSeat: 2, cardId: 'archer', x: 7, z: 4, hp: 2, shield: 0, actionUsed: false, abilityReadyTurn: 0, mountedOnTowerId: 'tower-seat-2' },
    { id: 'east', ownerSeat: 1, cardId: 'guard', x: 9, z: 4, hp: 4, shield: 0 },
    { id: 'west', ownerSeat: 1, cardId: 'guard', x: 5, z: 4, hp: 4, shield: 0 },
    { id: 'south', ownerSeat: 1, cardId: 'guard', x: 7, z: 6, hp: 4, shield: 0 },
    { id: 'north', ownerSeat: 1, cardId: 'guard', x: 7, z: 2, hp: 4, shield: 0 }
  );
  assert.throws(() => rooms.action(room.code, second.id, { type: 'use_ability', unitId: 'archer-seat-2' }, room.state.version), /turno/);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'use_ability', unitId: 'archer-seat-2' }, room.state.version);
  for (const id of ['east', 'west', 'south', 'north']) assert.equal(room.state.units.find(unit => unit.id === id).hp, 2);
  assert.equal(room.state.players[1].energy, 8);
  assert.equal(room.state.units.find(unit => unit.id === 'archer-seat-2').abilityReadyTurn, 3);
  assert.throws(() => rooms.action(room.code, second.id, { type: 'use_ability', unitId: 'archer-seat-2' }, room.state.version), /indisponível/);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.throws(() => rooms.action(room.code, second.id, { type: 'use_ability', unitId: 'archer-seat-2' }, room.state.version), /turno/);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'use_ability', unitId: 'archer-seat-2' }, room.state.version);
  assert.equal(room.state.units.some(unit => ['east', 'west', 'south', 'north'].includes(unit.id)), false);
});
