import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRenderLoop } from './createRenderLoop.js';

function fixture() {
  const document = Object.assign(new EventTarget(), { hidden: false, querySelector: () => null });
  const frames = new Map();
  const timers = new Map();
  let sequence = 0;
  let renders = 0;
  const deltas = [];
  const environment = Object.assign(new EventTarget(), {
    document, innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1,
    requestAnimationFrame: callback => { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: callback => { timers.set(++sequence, callback); return sequence; },
    clearTimeout: id => timers.delete(id),
    matchMedia: () => ({ matches: false }),
  });
  const renderer = {
    domElement: Object.assign(new EventTarget(), { dataset: {} }),
    shadowMap: { enabled: false },
    setSize() {}, setPixelRatio() {}, render: () => { renders += 1; },
  };
  const options = {
    environment, renderer, scene: new THREE.Scene(), camera: new THREE.OrthographicCamera(),
    controls: { update() {} }, cameraTransition: { update() {} },
    damageEffects: { update: delta => deltas.push(delta) }, mageEffects: { update() {} },
    units: [], fireMeshes: [], wisps: [], fireLights: [], physicalDecks: { decks: [] },
    getSelfSeat: () => 1, getGraphicsQuality: () => 'low', getDeckHoverSeat: () => null,
  };
  const loop = createRenderLoop(options);
  const tick = time => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(time));
  };
  return { loop, environment, document, frames, timers, renderer, deltas, tick, renders: () => renders };
}

test('start is idempotent and stop/dispose cancel frames, timers and listeners', () => {
  const f = fixture();
  f.loop.start();
  f.loop.start();
  assert.equal(f.frames.size, 1);
  assert.equal(f.timers.size, 1);
  f.tick(0);
  assert.equal(f.renders(), 1);
  f.loop.stop();
  assert.equal(f.frames.size, 0);
  assert.equal(f.timers.size, 0);
  f.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.frames.size, 0);
  f.loop.start();
  assert.equal(f.frames.size, 1);
  f.loop.dispose();
  f.loop.start();
  assert.equal(f.frames.size, 0);
});

test('hidden tabs stop rendering and resume without advancing effects by hidden wall time', () => {
  const f = fixture();
  f.loop.start();
  f.tick(0);
  f.tick(40);
  assert.equal(f.deltas.at(-1), 0.04);
  f.document.hidden = true;
  f.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.frames.size, 0);
  f.document.hidden = false;
  f.document.dispatchEvent(new Event('visibilitychange'));
  f.tick(180_000);
  assert.equal(f.deltas.at(-1), 0);
  f.tick(185_000);
  assert.equal(f.deltas.at(-1), 0.1);
  f.loop.dispose();
});

test('context loss pauses frames and restored WebGL resumes with a fresh shadow map', () => {
  const f = fixture();
  f.loop.start();
  const event = new Event('webglcontextlost', { cancelable: true });
  f.renderer.domElement.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(f.frames.size, 0);
  assert.equal(f.renderer.domElement.dataset.renderStatus, 'recovering');
  f.renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));
  assert.equal(f.frames.size, 1);
  assert.equal(f.renderer.shadowMap.needsUpdate, true);
  assert.equal(f.renderer.domElement.dataset.renderStatus, 'ready');
  f.loop.dispose();
});
