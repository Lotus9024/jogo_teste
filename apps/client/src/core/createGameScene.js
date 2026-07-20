import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createGameScene(app) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040606);
  scene.fog = new THREE.FogExp2(0x040606, 0.028);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  app.prepend(renderer.domElement);
  app.dataset.shadows = 'dynamic-soft';

  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 80);
  camera.position.set(0, 16, 5.2);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minZoom = 0.75;
  controls.maxZoom = 1.65;
  controls.minPolarAngle = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.16;
  controls.target.set(0, 0.2, 0);
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xb9b7aa, 0x1b211d, 1.5));
  scene.add(new THREE.AmbientLight(0x697069, 0.24));

  // One real-time directional light behaves like Unity's global sun. The
  // orthographic shadow camera tightly covers the board so the 2048px map is
  // spent on gameplay instead of the distant scenery.
  const sunTarget = new THREE.Object3D();
  sunTarget.position.set(0, 0, 0);
  scene.add(sunTarget);

  const sun = new THREE.DirectionalLight(0xedd6b0, 3.7);
  sun.position.set(-6.5, 13.5, 7.5);
  sun.target = sunTarget;
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -13;
  sun.shadow.camera.right = 13;
  sun.shadow.camera.top = 13;
  sun.shadow.camera.bottom = -13;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 36;
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.045;
  sun.shadow.radius = 3;
  scene.add(sun);

  const cool = new THREE.DirectionalLight(0x637a8c, 1.15);
  cool.position.set(7, 7, -8);
  scene.add(cool);

  function updateDynamicLighting(elapsed) {
    // A subtle orbit keeps the shadows alive without making the board appear
    // to spin through a full day/night cycle during a match.
    const angle = elapsed * 0.035;
    sun.position.set(
      -6.5 + Math.sin(angle) * 1.15,
      13.5 + Math.sin(angle * 0.63) * 0.28,
      7.5 + Math.cos(angle) * 1.15
    );
    sunTarget.position.y = Math.sin(angle * 0.41) * 0.08;
    sunTarget.updateMatrixWorld();
  }

  return { scene, renderer, camera, controls, updateDynamicLighting };
}
