import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3 } from 'three';
import { fitGameViewport } from './fitGameViewport.js';

test('board fits portrait, landscape and desktop in the lobby and each starting perspective', () => {
  for (const [width, height] of [[390, 844], [844, 390], [1440, 1000]]) {
    for (const pose of [[3.1, 14.8, 10.2], [0, 16, 5.2], [0, 16, -5.2], [-5.2, 16, 5.2]]) {
      const camera = new OrthographicCamera(-6, 6, 6, -6, 0.1, 180);
      camera.position.set(...pose);
      camera.lookAt(0, 0.32, 0);
      const quaternion = camera.quaternion.clone();
      fitGameViewport(camera, width, height);
      for (const x of [-8.6, 8.6]) {
        for (const z of [-8.6, 8.6]) {
          const corner = new Vector3(x, 0, z).project(camera);
          assert.ok(Math.abs(corner.x) < 1, `${width}x${height}: horizontal corner ${corner.x}`);
          assert.ok(Math.abs(corner.y) < 1, `${width}x${height}: vertical corner ${corner.y}`);
        }
      }
      assert.deepEqual(camera.position.toArray(), pose);
      assert.ok(camera.quaternion.equals(quaternion));
      assert.equal(camera.zoom, 1);
    }
  }
});

test('desktop retains its established framing and resizing preserves player zoom', () => {
  const camera = new OrthographicCamera();
  camera.position.set(3.1, 14.8, 10.2);
  camera.lookAt(0, 0.32, 0);
  camera.zoom = 1.35;
  fitGameViewport(camera, 1440, 1000);
  assert.equal(camera.top, 11.45);
  assert.equal(camera.zoom, 1.35);
});
