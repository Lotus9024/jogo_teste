import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMagicSky } from './createMagicSky.js';

export function createGameScene(app) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10071c);
  scene.fog = new THREE.FogExp2(0x0c0915, 0.0215);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.46;
  app.prepend(renderer.domElement);
  app.dataset.shadows = 'dynamic-soft';

  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 80);
  camera.position.set(0, 16, 5.2);
  camera.lookAt(0, 0, 0);
  scene.add(camera);
  const magicSky = createMagicSky(scene, renderer, app, camera);

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

  scene.add(new THREE.HemisphereLight(0xd8caef, 0x42384d, 1.9));
  scene.add(new THREE.AmbientLight(0x9c90ae, 0.42));

  // One real-time directional light behaves like Unity's global sun. The
  // orthographic shadow camera tightly covers the board so the 2048px map is
  // spent on gameplay instead of the distant scenery.
  const sunTarget = new THREE.Object3D();
  sunTarget.position.set(0, 0, 0);
  scene.add(sunTarget);

  const sun = new THREE.DirectionalLight(0xf1dbb8, 4.15);
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
  sun.shadow.radius = 4;
  scene.add(sun);

  const cool = new THREE.DirectionalLight(0x9380c8, 1.46);
  cool.position.set(7, 7, -8);
  scene.add(cool);

  const indirectWarmth = new THREE.DirectionalLight(0xffbd85, 0.58);
  indirectWarmth.position.set(-8, 4.5, 6);
  scene.add(indirectWarmth);

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
    magicSky.update(elapsed);
  }

  return { scene, renderer, camera, controls, updateDynamicLighting };
}
