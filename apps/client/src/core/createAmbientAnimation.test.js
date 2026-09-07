import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
import { createAmbientAnimation } from './createAmbientAnimation.js';

function createAnimation(units = [], decks = []) {
  return createAmbientAnimation({ units, fireMeshes: [], wisps: [], fireLights: [], physicalDecks: { decks } });
}

test('ambient breathing does not lift construction models off their grounded origin', () => {
  const unit = new Group();
  unit.userData.cardType = 'construction';
  const rig = new Group();
  rig.name = 'rig';
  rig.position.y = -0.23;
  unit.add(rig);
  createAnimation([unit]).update(5);
  assert.equal(rig.position.y, -0.23);
  assert.equal(rig.rotation.z, 0);
});

test('magic parts are cached until structure changes, and new models are discovered', () => {
  const unit = new Group();
  const magic = new Group();
  magic.userData.magic = true;
  unit.add(magic);
  let traversals = 0;
  const original = unit.traverse.bind(unit);
  unit.traverse = callback => { traversals += 1; original(callback); };
  const ambient = createAnimation([unit]);
  ambient.update(1);
  ambient.update(2);
  assert.equal(traversals, 1);
  assert.equal(magic.rotation.y, 3);
  const second = new Group();
  second.userData.magic = true;
  unit.add(second);
  ambient.update(3);
  assert.equal(traversals, 2);
  assert.equal(second.rotation.y, 4.5);
});

test('deck hover converges identically at 30 and 60 frames per second', () => {
  function simulate(fps) {
    const card = new Group();
    card.userData.restY = 0;
    const deck = new Group();
    deck.userData = { getTopCard: () => card, ownerSeat: 1 };
    const ambient = createAnimation([], [deck]);
    for (let frame = 0; frame < fps; frame += 1) ambient.updateDecks(1, 1 / fps);
    return card.position.y;
  }
  assert.ok(Math.abs(simulate(30) - simulate(60)) < 1e-12);
});
