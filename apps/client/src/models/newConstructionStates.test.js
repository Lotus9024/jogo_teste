import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeRoad, setRoadConstructionState } from '../assets/models/roadModel.js';
import { makeCannon, setCannonConstructionState } from '../assets/models/cannonModel.js';
import { makeTower, setTowerConstructionState } from '../assets/models/towerModel.js';
import { makeWoodenHouse, setWoodenHouseConstructionState } from '../assets/models/woodenHouseModel.js';
import { makeWoodBarrier, setWoodBarrierConstructionState } from '../assets/models/woodBarrierModel.js';
import { makeGoblinTower, setGoblinTowerConstructionState } from '../assets/models/goblinTowerModel.js';
import { makeGoblinAltar, makeMageAltar, makeBuilderArea, setSupportConstructionState } from '../assets/models/supportBuildingModels.js';
import { prepareConstructionUnit } from './prepareConstructionUnit.js';
import { UNIT_MODEL_SCALE } from './createCardUnit.js';

const TILE = 1.08;
const DIRECTIONS = [['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0]];
const MODELS = [
  [makeCannon, setCannonConstructionState, 'cannon', 'cannonUnfittedBarrel'],
  [makeTower, setTowerConstructionState, 'tower', 'towerScaffoldLadder'],
  [makeWoodenHouse, setWoodenHouseConstructionState, 'house', 'houseFloorTimberSupply'],
  [makeWoodBarrier, setWoodBarrierConstructionState, 'barrier', 'barrierUnfittedRails'],
  [makeGoblinTower, setGoblinTowerConstructionState, 'goblinTower', 'goblinTowerUnfinishedFrontPost'],
  [makeGoblinAltar, setSupportConstructionState, 'support', 'goblinAltarEmptySocket'],
  [makeMageAltar, setSupportConstructionState, 'support', 'mageAltarUnfittedObelisk'],
  [makeBuilderArea, setSupportConstructionState, 'support', 'builderUnfinishedBench'],
];

test('as 16 conexões de rua alcançam somente as bordas corretas em XZ, nos dois estados', () => {
  for (const cardId of ['road', 'cobblestone_road']) {
    for (let mask = 0; mask < 16; mask += 1) {
      const connections = Object.fromEntries(DIRECTIONS.map(([key], index) => [key, Boolean(mask & (1 << index))]));
      const road = makeRoad(connections, TILE, { cardId });
      for (const underConstruction of [false, true]) {
        setRoadConstructionState(road, underConstruction);
        const surface = road.getObjectByName(underConstruction ? 'roadConstructionSurface' : cardId === 'road' ? 'dirtRoadSurface' : 'cobblestoneRoadSurface');
        road.updateMatrixWorld(true);
        for (const [key, dx, dz] of DIRECTIONS) {
          const ray = new THREE.Raycaster(new THREE.Vector3(dx * TILE * 0.495, 2, dz * TILE * 0.495), new THREE.Vector3(0, -1, 0));
          const hit = ray.intersectObject(surface, false)[0];
          assert.equal(Boolean(hit), connections[key], `${cardId}/${mask}/${key}: conexão desenhada no lado errado`);
          if (hit) {
            assert.ok(hit.face.normal.y > 0.99, 'a face visível da rua precisa apontar para cima');
            assert.ok(Math.abs(hit.point.y - (underConstruction ? 0.032 : 0.05)) < 0.00001);
          }
        }
        const size = new THREE.Box3().setFromObject(road).getSize(new THREE.Vector3());
        assert.ok(size.x <= TILE * 1.021 && size.z <= TILE * 1.021, 'detalhes ultrapassam a margem de união das casas');
      }
    }
  }
});

test('pavimento mantém superfície única, ligação contínua e detalhes baixos sem magia decorativa', () => {
  const north = makeRoad({ north: true, south: true }, TILE, { cardId: 'cobblestone_road' });
  const south = makeRoad({ north: true, south: true }, TILE, { cardId: 'cobblestone_road' });
  south.position.z = TILE;
  const firstBounds = new THREE.Box3().setFromObject(north.getObjectByName('cobblestoneRoadSurface'));
  const secondBounds = new THREE.Box3().setFromObject(south.getObjectByName('cobblestoneRoadSurface'));
  assert.ok(firstBounds.max.z >= secondBounds.min.z, 'ruas vizinhas deixam uma fresta no centro da ligação');
  assert.equal(north.getObjectByName('roadBuiltParts').children.length, 1);
  assert.ok(north.getObjectByName('roadDressedPavers').isInstancedMesh);
  assert.ok(firstBounds.max.y < 0.10, 'relevo precisa permitir leitura da tropa sobre a rua');
  assert.equal(north.getObjectByName('roadRune'), undefined);
  north.traverse(object => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      assert.equal(material.opacity, 1);
      assert.equal(material.emissive?.getHex() ?? 0, 0, 'rua não deve emitir luz');
    }
  });
});

test('obras têm materiais físicos próprios e alternam sem deslocar peças ou encaixes', () => {
  for (const [factory, toggle, prefix, landmark] of MODELS) {
    const model = factory();
    const built = model.getObjectByName(`${prefix}BuiltParts`);
    const construction = model.getObjectByName(`${prefix}ConstructionParts`);
    assert.ok(construction.getObjectByName(landmark), `${model.name}: estado de obra sem elemento identificável`);
    const before = [built.position.toArray(), construction.position.toArray(), model.getObjectByName('rig').position.toArray()];
    for (const value of [true, false, true]) {
      toggle(model, value);
      assert.equal(construction.visible, value);
      assert.equal(built.visible, !value);
      assert.equal(model.userData.underConstruction, value);
      assert.deepEqual([built.position.toArray(), construction.position.toArray(), model.getObjectByName('rig').position.toArray()], before);
    }
    construction.traverse(object => {
      if (!object.isMesh) return;
      assert.ok([...object.geometry.getAttribute('position').array].every(Number.isFinite));
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        assert.equal(material.opacity, 1, `${model.name}: a obra não usa fantasma transparente`);
        assert.ok(!material.emissive?.getHex() || material.emissiveIntensity <= 0.25, `${model.name}: sinal luminoso compete com a obra`);
      }
    });
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).multiplyScalar(UNIT_MODEL_SCALE);
    assert.ok(size.x <= TILE && size.z <= TILE, `${model.name}: obra invade outra casa`);
  }
});

test('obras de construções continuam aterradas independentemente do modelo concluído', () => {
  for (const [factory, , prefix] of MODELS.filter(([factory]) => factory !== makeCannon)) {
    const model = prepareConstructionUnit(factory());
    for (const suffix of ['BuiltParts', 'ConstructionParts']) {
      const group = model.getObjectByName(prefix + suffix);
      const box = new THREE.Box3().setFromObject(group);
      assert.ok(Math.abs(box.min.y) < 0.001, `${model.name}/${suffix}: não encosta no chão`);
    }
    assert.equal(model.getObjectByName('unitPedestal'), undefined);
    assert.equal(model.getObjectByName('teamPlatform'), undefined);
  }
});

test('tubo em montagem tem parede interna e o recuo do canhão pronto preserva a carroceria', () => {
  const model = makeCannon();
  model.updateMatrixWorld(true);
  const blank = model.getObjectByName('cannonUnfittedBarrel');
  const barrelCenter = blank.getWorldPosition(new THREE.Vector3());
  const throughMuzzle = new THREE.Raycaster(new THREE.Vector3(0, barrelCenter.y, -1.6), new THREE.Vector3(0, 0, 1));
  const boreHit = throughMuzzle.intersectObject(blank, false)[0];
  assert.ok(boreHit, 'o tubo em montagem precisa ter alma interna e fundo');
  assert.ok(boreHit.point.z > 0.15, 'a boca do tubo em montagem deve ficar aberta');
  const assembly = model.getObjectByName('cannonRecoilAssembly');
  const muzzle = model.getObjectByName('cannonMuzzle');
  const trunnion = model.getObjectByName('cannonTrunnion');
  const muzzleBefore = muzzle.getWorldPosition(new THREE.Vector3());
  const mountBefore = trunnion.getWorldPosition(new THREE.Vector3());
  assembly.position.z += 0.05;
  assert.ok(Math.abs(muzzle.getWorldPosition(new THREE.Vector3()).z - muzzleBefore.z - 0.05) < 0.000001);
  assert.deepEqual(trunnion.getWorldPosition(new THREE.Vector3()).toArray(), mountBefore.toArray());
});

test('novos apoios não deixam o piso da Casa nem os pilares da Torre Goblin suspensos', () => {
  const house = prepareConstructionUnit(makeWoodenHouse());
  const floor = house.getObjectByName('houseConstructionParts').getObjectByName('houseFloor');
  assert.ok(Math.abs(new THREE.Box3().setFromObject(floor).min.y) < 0.001);
  const tower = prepareConstructionUnit(makeGoblinTower());
  const patchTop = new THREE.Box3().setFromObject(tower.getObjectByName('goblinTowerWorksite')).max.y;
  const post = tower.getObjectByName('goblinTowerScaffoldPost');
  assert.ok(Math.abs(new THREE.Box3().setFromObject(post).min.y - patchTop) < 0.001);
});
