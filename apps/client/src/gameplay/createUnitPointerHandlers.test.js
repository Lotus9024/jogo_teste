import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnitPointerHandlers } from './createUnitPointerHandlers.js';

function setup(selected = null, { aiming = false } = {}) {
  const listeners = new Map();
  const classes = new Set(['visible']);
  const attributes = new Map();
  const hoverCard = { classList: { remove: name => classes.delete(name) }, setAttribute: (name, value) => attributes.set(name, value) };
  const calls = [];
  const state = { selected };
  const oldDocument = globalThis.document;
  globalThis.document = { querySelector(selector) {
    assert.equal(selector, '#hover-card', 'Castle interaction must not access a popup or custom cursor.');
    return hoverCard;
  } };
  try {
    const handlers = createUnitPointerHandlers({
      state, app: { dataset: {} }, renderer: { domElement: { addEventListener: (name, callback) => {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(callback);
      } } }, controls: {}, cameraTransition: {}, tile: 1, half: 7,
      boardCoordinates: { baseCellsForSeat: () => [{ x: 7, z: 1 }] },
      movementOverlay: { isInteractiveCell: () => true, clear() {}, show() {} },
      actions: { canCommandUnit: () => true, moveOrAttackUnit: (...args) => calls.push(args) },
      abilities: { isGoblinTowerAiming: () => false, isMageAiming: () => aiming,
        toggleMageFireCell: cell => calls.push(['fire', cell]) },
      relations: { archerForTower: () => null },
      interaction: {
        hoverableAtPointer: () => ({ userData: { isCastle: true, ownerSeat: 2 } }),
        abilityTriggerAtPointer: () => null, mageFireTriggerAtPointer: () => null,
        baseSeatAtPointer: () => 2, unitAtPointer: () => null,
        boardCellAtPointer: () => aiming ? { x: 7, z: 1, worldX: 0, worldZ: -6 } : null,
        clearMovementGrid: () => calls.push('clear'),
      },
      callbacks: {},
    });
    handlers.mount();
  } finally { globalThis.document = oldDocument; }
  return { dispatch: name => listeners.get(name)?.forEach(callback => callback({})), calls, classes, attributes };
}

test('hovering and clicking an idle castle do not open or pin any information', () => {
  const { dispatch, calls, classes, attributes } = setup();
  dispatch('pointermove');
  dispatch('click');
  dispatch('pointermove');
  assert.equal(classes.has('visible'), false);
  assert.equal(attributes.get('aria-hidden'), 'true');
  assert.deepEqual(calls, []);
});

test('a castle click still attacks a valid base with the selected troop', () => {
  const unit = { userData: { ownerSeat: 1, cardId: 'warrior' } };
  const { dispatch, calls } = setup(unit);
  dispatch('click');
  assert.equal(calls[0][0], unit);
  assert.deepEqual(calls[0][1], { x: 7, z: 1, worldX: 0, worldZ: -6 });
  assert.equal(calls[1], 'clear');
});

test('aiming a mage at a castle keeps the spell selection path instead of performing a normal attack', () => {
  const unit = { userData: { ownerSeat: 1, cardId: 'mage' } };
  const { dispatch, calls } = setup(unit, { aiming: true });
  dispatch('click');
  assert.deepEqual(calls, [['fire', { x: 7, z: 1, worldX: 0, worldZ: -6 }]]);
});
