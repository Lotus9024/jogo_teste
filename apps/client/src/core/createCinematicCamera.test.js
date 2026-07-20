import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createCinematicCamera } from './createCinematicCamera.js';

function createApp() {
  const classes = new Set();
  const styles = new Map();
  return {
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    style: {
      setProperty: (name, value) => styles.set(name, value),
      removeProperty: (name) => styles.delete(name),
    },
    dataset: {},
  };
}

function createControls() {
  return {
    enabled: true,
    target: new THREE.Vector3(0, 0.18, 0),
    update() {},
  };
}

test('does not restart the camera animation when it is already above the board', () => {
  globalThis.matchMedia = () => ({ matches: false });
  const camera = new THREE.OrthographicCamera();
  const controls = createControls();
  const app = createApp();
  camera.position.set(0, 17.2, 5.4);
  camera.zoom = 1.05;

  const transition = createCinematicCamera({ camera, controls, app });
  transition.focusBoard({ side: 1 });

  assert.equal(transition.active, false);
  assert.equal(app.classList.contains('camera-transitioning'), false);
  assert.equal(app.dataset.cameraTransition, 'complete');
  assert.equal(app.dataset.cameraProgress, '1.000');
});

test('keeps small camera adjustments inside the focus range without animation', () => {
  globalThis.matchMedia = () => ({ matches: false });
  const camera = new THREE.OrthographicCamera();
  const controls = createControls();
  const app = createApp();
  camera.position.set(0.5, 17.1, 5.5);
  camera.zoom = 1.03;
  const expectedPosition = camera.position.clone();

  const transition = createCinematicCamera({ camera, controls, app });
  transition.focusBoard({ side: 1 });

  assert.equal(transition.active, false);
  assert.deepEqual(camera.position.toArray(), expectedPosition.toArray());
  assert.equal(camera.zoom, 1.03);
  assert.equal(app.classList.contains('camera-transitioning'), false);
});

test('still animates when the camera has not reached the final frame', () => {
  globalThis.matchMedia = () => ({ matches: false });
  const camera = new THREE.OrthographicCamera();
  const controls = createControls();
  const app = createApp();
  camera.position.set(0, 14, 4);
  camera.zoom = 1;

  const transition = createCinematicCamera({ camera, controls, app });
  transition.focusBoard({ side: 1 });

  assert.equal(transition.active, true);
  assert.equal(app.classList.contains('camera-transitioning'), true);
});
