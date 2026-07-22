import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMagicSky } from './createMagicSky.js';
import { pixelRatioForQuality } from './gameSettings.js';

export function createGameScene(app, { quality = 'high' } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b11);
  scene.fog = new THREE.FogExp2(0x111923, 0.0185);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatioForQuality(quality));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  app.prepend(renderer.domElement);
  app.dataset.shadows = 'dynamic-soft';

  // The HDRI is rendered on a 68-unit sphere. Its rear hemisphere can sit
  // farther than 80 units from the elevated camera, especially on wide views,
  // so keep the far plane beyond the complete sky dome.
  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 180);
  camera.position.set(0, 16, 5.2);
  camera.lookAt(0, 0, 0);
  scene.add(camera);
  const magicSky = createMagicSky(scene, renderer, app, { quality });

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

  scene.add(new THREE.HemisphereLight(0xaec8dc, 0x39434a, 2.15));
  scene.add(new THREE.AmbientLight(0x8799a9, 0.46));

  // One real-time directional light behaves like Unity's global sun. The
  // orthographic shadow camera tightly covers the board so the 2048px map is
  // spent on gameplay instead of the distant scenery.
  const sunTarget = new THREE.Object3D();
  sunTarget.position.set(0, 0, 0);
  scene.add(sunTarget);

  const sun = new THREE.DirectionalLight(0xddeaf4, 3.65);
  sun.position.set(-7.8, 14.2, -5.4);
  sun.target = sunTarget;
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
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

  const cool = new THREE.DirectionalLight(0x7898ae, 1.32);
  cool.position.set(7, 7, -8);
  scene.add(cool);

  const indirectWarmth = new THREE.DirectionalLight(0xd9b692, 0.5);
  indirectWarmth.position.set(-8, 4.5, 6);
  scene.add(indirectWarmth);

  function updateDynamicLighting(elapsed) {
    magicSky.update(elapsed);
  }

  function setGraphicsQuality(nextQuality) {
    const low = nextQuality === 'low';
    renderer.setPixelRatio(pixelRatioForQuality(nextQuality));
    renderer.shadowMap.enabled = !low;
    sun.castShadow = !low;
    renderer.shadowMap.needsUpdate = !low;
    magicSky.setQuality(nextQuality);
    app.dataset.graphicsQuality = nextQuality;
    app.dataset.shadows = low ? 'disabled' : 'static-soft';
  }

  setGraphicsQuality(quality);
  return { scene, renderer, camera, controls, updateDynamicLighting, setGraphicsQuality };
}
