import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID, CARD_CATEGORY_LABELS, CARD_DEFINITIONS, baseCellsForSeat, citizensForSeat, completedRoadCount, connectedRoadKeys, deploymentDistance, effectiveCardCost, forwardDeltaForSeat, goblinSpawnHp, gridCellsBetween, isBasicCard, isCannonTargetValid, isDeploymentCell, isGoblinCard, isMageCard, isRoadPlacementCell, roadMovementBonus, validateDeckCardIds } from '../src/cards.js';

test('calcula as casas intermediarias de uma linha no tabuleiro', () => {
  assert.deepEqual(gridCellsBetween({ x: 2, z: 2 }, { x: 5, z: 2 }), [{ x: 3, z: 2 }, { x: 4, z: 2 }]);
  assert.deepEqual(gridCellsBetween({ x: 2, z: 2 }, { x: 4, z: 4 }), [{ x: 3, z: 3 }]);
  assert.deepEqual(gridCellsBetween({ x: 2, z: 2 }, { x: 3, z: 2 }), []);
});

test('descrição do arqueiro explica o bloqueio de linha', () => {
  assert.match(CARD_BY_ID.archer.description, /por cima de barreiras, mas não de tropas/i);
});

test('Henry expõe agilidade, entrada pronta e os atributos definidos', () => {
  assert.deepEqual(
    { hp: CARD_BY_ID.henry.hp, damage: CARD_BY_ID.henry.damage, move: CARD_BY_ID.henry.move, cost: CARD_BY_ID.henry.cost, rarity: CARD_BY_ID.henry.rarityClass },
    { hp: 1, damage: 1, move: 1, cost: 4, rarity: 'uncommon' }
  );
  assert.match(CARD_BY_ID.henry.description, /movimentar e atacar.*vice-versa.*mesmo turno/is);
  assert.match(CARD_BY_ID.henry.ability.description, /entra em campo pronto/i);
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
    { cost: CARD_BY_ID.tower.ability.cost, range: CARD_BY_ID.tower.ability.range, damage: CARD_BY_ID.tower.ability.damage, cooldown: CARD_BY_ID.tower.ability.cooldownTurns },
    { cost: 2, range: 3, damage: 2, cooldown: 2 }
  );
  assert.equal(CARD_BY_ID.tower.instant.enabled, false);
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
  assert.match(CARD_BY_ID.cannon.description, /3 de dano central e 1 de dano em área/i);
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
  assert.match(CARD_BY_ID.mage.description, /sem ser bloqueado/i);
  assert.deepEqual(
    { cost: CARD_BY_ID.mage.instant.cost, damage: CARD_BY_ID.mage.instant.damage, radius: CARD_BY_ID.mage.instant.radius, cooldown: CARD_BY_ID.mage.instant.cooldownTurns },
    { cost: 4, damage: 3, radius: 1, cooldown: 2 }
  );
  assert.equal(CARD_BY_ID.mage.instant.name, 'Ácido (Instantâneo)');
  assert.equal(CARD_BY_ID.mage.ability.enabled, false);
});

test('Torre Goblin reduz o custo e fortalece Goblins adjacentes', () => {
  const units = [
    { ownerSeat: 1, cardId: 'goblin', x: 4, z: 4 },
    { ownerSeat: 1, cardId: 'goblin', x: 5, z: 4 },
    { ownerSeat: 2, cardId: 'goblin', x: 6, z: 4 },
    { ownerSeat: 1, cardId: 'goblin_tower', x: 7, z: 7, underConstruction: false },
  ];
  assert.equal(effectiveCardCost('goblin_tower', 1, units), 8);
  assert.equal(effectiveCardCost('goblin_tower', 2, units), 9);
  assert.equal(goblinSpawnHp(1, 7, 6, units), 2);
  assert.equal(goblinSpawnHp(1, 5, 5, units), 1);
  assert.deepEqual(
    { hp: CARD_BY_ID.goblin_tower.hp, cost: CARD_BY_ID.goblin_tower.cost, buildRounds: CARD_BY_ID.goblin_tower.buildRounds, rarity: CARD_BY_ID.goblin_tower.rarityClass },
    { hp: 5, cost: 10, buildRounds: 1, rarity: 'rare' },
  );
});

test('Henry participa das sinergias Goblin e também nasce fortalecido pela Torre', () => {
  const units = [
    { ownerSeat: 1, cardId: 'henry', x: 4, z: 4 },
    { ownerSeat: 1, cardId: 'goblin_tower', x: 7, z: 7, underConstruction: false },
  ];
  assert.equal(effectiveCardCost('goblin_tower', 1, units), 9);
  assert.equal(goblinSpawnHp(1, 7, 6, units, 'henry'), 2);
});

test('categorias abrangem tropas e construções de cada família', () => {
  assert.deepEqual(CARD_CATEGORY_LABELS, { basic: 'BÁSICA', goblin: 'GOBLIN', mage: 'MAGO' });
  assert.equal(CARD_DEFINITIONS.every(card => CARD_CATEGORY_LABELS[card.category]), true);
  assert.equal(isBasicCard('warrior'), true);
  assert.equal(isBasicCard('builder_area'), true);
  assert.equal(isGoblinCard('henry'), true);
  assert.equal(isGoblinCard('goblin_tower'), true);
  assert.equal(isMageCard('mage'), true);
  assert.equal(isMageCard('mage_altar'), true);
  assert.equal(isGoblinCard('warrior'), false);
});

test('castelo nível dois expande uma casa para cada lateral', () => {
  assert.equal(baseCellsForSeat(1, 15, 1).length, 9);
  assert.equal(baseCellsForSeat(1, 15, 2).length, 15);
  assert.equal(baseCellsForSeat(1, 15, 2).some(cell => cell.x === 5 && cell.z === 13), true);
});

test('Deck aceita menos que os limites, mas exige as três raridades disponíveis', () => {
  assert.deepEqual(validateDeckCardIds(['warrior', 'archer', 'mage']), ['warrior', 'archer', 'mage']);
  assert.throws(() => validateDeckCardIds(['warrior', 'archer']), /carta comum, uma incomum e uma rara/);
});
