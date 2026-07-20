import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createGameScene(app) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040606);
  scene.fog = new THREE.FogExp2(0x040606, 0.028);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  app.prepend(renderer.domElement);

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

  scene.add(new THREE.HemisphereLight(0xa9a79d, 0x111513, 1.65));
  const sun = new THREE.DirectionalLight(0xe2c69c, 3.7);
  sun.position.set(-6, 13, 7);
  scene.add(sun);
  const cool = new THREE.DirectionalLight(0x596b78, 1.35);
  cool.position.set(7, 7, -8);
  scene.add(cool);

  return { scene, renderer, camera, controls };
}
