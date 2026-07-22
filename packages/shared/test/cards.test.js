import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID, citizensForSeat, completedRoadCount, connectedRoadKeys, deploymentDistance, forwardDeltaForSeat, gridCellsBetween, isCannonTargetValid, isDeploymentCell, isRoadPlacementCell, roadMovementBonus } from '../src/cards.js';

test('calcula as casas intermediarias de uma linha no tabuleiro', () => {
  assert.deepEqual(gridCellsBetween({ x: 2, z: 2 }, { x: 5, z: 2 }), [{ x: 3, z: 2 }, { x: 4, z: 2 }]);
  assert.deepEqual(gridCellsBetween({ x: 2, z: 2 }, { x: 4, z: 4 }), [{ x: 3, z: 3 }]);
  assert.deepEqual(gridCellsBetween({ x: 2, z: 2 }, { x: 3, z: 2 }), []);
});

test('descrição do arqueiro explica o bloqueio de linha', () => {
  assert.match(CARD_BY_ID.archer.description, /por cima de barreiras, mas não de tropas/i);
});

test('zona de lançamento ocupa somente as duas casas ao redor do reino', () => {
  assert.equal(isDeploymentCell(1, 6, 11), true);
  assert.equal(isDeploymentCell(1, 6, 10), true);
  assert.equal(isDeploymentCell(1, 6, 9), false);
  assert.equal(isDeploymentCell(1, 6, 12), false);
  assert.equal(isDeploymentCell(2, 8, 3), true);
  assert.equal(isDeploymentCell(2, 8, 4), true);
  assert.equal(deploymentDistance(2, { x: 8, z: 5 }), 3);
});

test('torre expõe construção e rajada cardinal', () => {
  assert.equal(CARD_BY_ID.tower.hp, 5);
  assert.equal(CARD_BY_ID.tower.cost, 7);
  assert.equal(CARD_BY_ID.tower.buildRounds, 2);
  assert.deepEqual(
    { cost: CARD_BY_ID.tower.instant.cost, range: CARD_BY_ID.tower.instant.range, damage: CARD_BY_ID.tower.instant.damage },
    { cost: 2, range: 3, damage: 2 }
  );
});

test('canhão usa frente relativa ao dono e alcance de três a seis casas', () => {
  assert.deepEqual(forwardDeltaForSeat(1), { x: 0, z: -1 });
  assert.deepEqual(forwardDeltaForSeat(2), { x: 0, z: 1 });
  const cannon = { x: 7, z: 8, ownerSeat: 1 };
  assert.equal(isCannonTargetValid(cannon, { x: 7, z: 5 }), true);
  assert.equal(isCannonTargetValid(cannon, { x: 7, z: 2 }), true);
  assert.equal(isCannonTargetValid(cannon, { x: 7, z: 1 }), false);
  assert.equal(isCannonTargetValid(cannon, { x: 7, z: 6 }), false);
  assert.equal(isCannonTargetValid(cannon, { x: 8, z: 5 }), false);
});

test('canhão separa dano direto do dano em área', () => {
  assert.equal(CARD_BY_ID.cannon.hp, 1);
  assert.equal(CARD_BY_ID.cannon.damage, 3);
  assert.equal(CARD_BY_ID.cannon.cost, 8);
  assert.equal(CARD_BY_ID.cannon.areaDamage, 1);
  assert.equal(CARD_BY_ID.cannon.areaRadius, 1);
  assert.match(CARD_BY_ID.cannon.description, /oito casas imediatamente ao redor/i);
  assert.match(CARD_BY_ID.cannon.description, /não atravessa tropas nem construções/i);
});

test('ruas formam uma rede conectada ao castelo e não possuem vida', () => {
  const roads = [{ ownerSeat: 1, x: 7, z: 11 }, { ownerSeat: 1, x: 7, z: 10 }, { ownerSeat: 1, x: 2, z: 2 }, { ownerSeat: 1, x: 8, z: 11, underConstruction: true }];
  assert.equal(CARD_BY_ID.road.hp, null);
  assert.equal(CARD_BY_ID.road.indestructible, true);
  assert.equal(CARD_BY_ID.road.buildRounds, 1);
  assert.deepEqual([...connectedRoadKeys(1, roads)].sort(), ['7:10', '7:11']);
  assert.equal(isRoadPlacementCell(1, 7, 9, roads), true);
  assert.equal(isRoadPlacementCell(1, 2, 3, roads), false);
  assert.equal(roadMovementBonus(7, 10, roads), 1);
  assert.equal(roadMovementBonus(8, 11, roads), 0);
  assert.equal(completedRoadCount(1, roads), 3);
});

test('casa concluída fornece cidadãos e recebe bônus quando ligada por Rua', () => {
  const houses = [
    { ownerSeat: 1, cardId: 'wooden_house', x: 6, z: 11, underConstruction: false },
    { ownerSeat: 1, cardId: 'wooden_house', x: 8, z: 11, underConstruction: true }
  ];
  assert.equal(citizensForSeat(1, houses, []), 3);
  assert.equal(citizensForSeat(1, houses, [{ ownerSeat: 1, x: 7, z: 11 }]), 4);
});

test('Mago é raro e expõe fogo e ácido com os atributos definidos', () => {
  assert.deepEqual(
    { hp: CARD_BY_ID.mage.hp, damage: CARD_BY_ID.mage.damage, move: CARD_BY_ID.mage.move, cost: CARD_BY_ID.mage.cost, range: CARD_BY_ID.mage.attackRange, cells: CARD_BY_ID.mage.maxFireCells, rarity: CARD_BY_ID.mage.rarityClass },
    { hp: 2, damage: 2, move: 1, cost: 6, range: 4, cells: 2, rarity: 'rare' }
  );
  assert.match(CARD_BY_ID.mage.description, /mesmo com unidades à frente/i);
  assert.deepEqual(
    { cost: CARD_BY_ID.mage.ability.cost, damage: CARD_BY_ID.mage.ability.damage, radius: CARD_BY_ID.mage.ability.radius },
    { cost: 4, damage: 3, radius: 1 }
  );
});
