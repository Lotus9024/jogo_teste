import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeGoblin } from '../assets/models/goblinModel.js';
import { makeGoblinClone } from '../assets/models/goblinCloneModel.js';
import { makeGoblinBomber } from '../assets/models/goblinBomberModel.js';
import { makeHenry } from '../assets/models/henryModel.js';
import { setUnitOwnerFacing, setUnitTeamColor } from '../gameplay/unitState.js';
import { UNIT_MODEL_SCALE } from './createCardUnit.js';

const CREATURES = [
  ['goblin', makeGoblin], ['goblin_clone', makeGoblinClone],
  ['goblin_bomber', makeGoblinBomber], ['henry', makeHenry],
];
const TILE_SIZE = 1.08;

test('criaturas cabem na casa em todos os assentos e conservam frente e encaixes do jogo', () => {
  for (const [cardId, factory] of CREATURES) {
    const model = factory();
    assert.equal(model.userData.modelFrontZ, -1);
    assert.equal(model.userData.selectable, true);
    assert.deepEqual([model.userData.hp, model.userData.damage, model.userData.move], [1, 1, 1]);
    for (const anchor of ['rig', 'unitPedestal', 'teamPlatform', 'selectionRing']) {
      assert.ok(model.getObjectByName(anchor), `${cardId}: falta encaixe ${anchor}`);
    }
    model.scale.setScalar(UNIT_MODEL_SCALE);
    for (const playerCount of [2, 3, 4]) {
      for (let seat = 1; seat <= playerCount; seat += 1) {
        setUnitOwnerFacing(model, cardId, seat, playerCount);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        assert.ok(size.x <= TILE_SIZE && size.z <= TILE_SIZE, `${cardId}: invade vizinho no assento ${seat}/${playerCount}`);
        assert.ok(box.min.y >= -0.005, `${cardId}: peça abaixo do pedestal`);
        assert.ok(size.y >= 0.8 && size.y <= 1.4, `${cardId}: altura ilegível na escala de jogo`);
      }
    }
  }
});

test('esculturas mantêm geometria finita e orçamento de renderização limitado', () => {
  for (const [cardId, factory] of CREATURES) {
    const model = factory();
    let triangles = 0, meshes = 0;
    model.traverse(object => {
      if (!object.isMesh) return;
      meshes += 1;
      const position = object.geometry.getAttribute('position');
      const normals = object.geometry.getAttribute('normal');
      assert.ok(position && normals, `${cardId}/${object.name}: geometria sem normais`);
      assert.ok([...position.array, ...normals.array].every(Number.isFinite), `${cardId}/${object.name}: geometria inválida`);
      triangles += (object.geometry.index?.count ?? position.count) / 3;
    });
    assert.ok(meshes <= 120, `${cardId}: ${meshes} malhas acima do orçamento`);
    assert.ok(triangles <= 8_000, `${cardId}: ${triangles} triângulos acima do orçamento`);
  }
});

test('visual arcano do Clone não modifica materiais do Goblin nem o sinal do reino', () => {
  const original = makeGoblin();
  const sourceHead = original.getObjectByName('head');
  const sourceColor = sourceHead.material.color.getHex();
  const clone = makeGoblinClone();
  const cloneHead = clone.getObjectByName('head');
  assert.notEqual(cloneHead.material, sourceHead.material);
  assert.notEqual(cloneHead.material.color.getHex(), sourceColor);
  cloneHead.material.color.setHex(0x223344);
  assert.equal(sourceHead.material.color.getHex(), sourceColor);
  assert.equal(makeGoblin().getObjectByName('head').material.color.getHex(), sourceColor);
  setUnitTeamColor(clone, 0xff352f);
  assert.equal(clone.getObjectByName('teamPlatform').material.color.getHex(), 0xff352f);
  assert.equal(clone.getObjectByName('selectionRing').material.color.getHex(), 0xff352f);
  assert.equal(sourceHead.material.color.getHex(), sourceColor);
});

test('bombas, lâminas e rostos permanecem ligados ao rig animado das criaturas', () => {
  for (const [factory, anchors] of [
    [makeGoblin, ['goblinDagger', 'goblinDaggerHand', 'goblinLootSack', 'goblinNose']],
    [makeGoblinBomber, ['goblinBomb', 'bomberExplosiveBackpack', 'bomberBombHand', 'bomberFace']],
    [makeHenry, ['henryLeftBlade', 'henryRightBlade', 'henryScarf', 'henryFace']],
    [makeGoblinClone, ['goblinDagger', 'cloneChestSeal', 'goblinFace']],
  ]) {
    const model = factory(), rig = model.getObjectByName('rig');
    for (const anchor of anchors) {
      const object = rig.getObjectByName(anchor);
      assert.ok(object, `${model.name}: ${anchor} não acompanha a animação do rig`);
      const before = object.getWorldPosition(new THREE.Vector3());
      rig.position.x += 0.125;
      const after = object.getWorldPosition(new THREE.Vector3());
      assert.ok(Math.abs(after.x - before.x - 0.125) < 0.000001);
      rig.position.x -= 0.125;
    }
  }
});
