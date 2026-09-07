import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CARD_DEFINITIONS, CARD_CATEGORY_LABELS } from '@tronos/shared/cards';
import { createCardUnit } from './models/createCardUnit.js';
import { applyConstructionState } from './gameplay/unitState.js';
import './styles/tokens.css';
import './styles/model-studio.css';

const cards = CARD_DEFINITIONS.filter(card => !['spell', 'terrain'].includes(card.type) && card.id !== 'goblin_swarm');
const viewport = document.querySelector('#model-viewport');
const error = document.querySelector('#model-error');
const buildButton = document.querySelector('#model-build');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101216);
scene.fog = new THREE.Fog(0x101216, 12, 24);
const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 40);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch {
  error.textContent = 'Não foi possível iniciar o 3D. Ative a aceleração gráfica do navegador e atualize a página.';
}

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  viewport.append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 1.1;
  controls.maxDistance = 9;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI / 2;
  scene.add(new THREE.HemisphereLight(0xdce2e9, 0x28212d, 2.25));
  const key = new THREE.DirectionalLight(0xffddae, 3.5);
  key.position.set(-3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 15;
  key.shadow.bias = -0.0003;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9e9ad6, 2.8);
  rim.position.set(3, 3, -4);
  scene.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x191a1c, roughness: 0.86 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.015;
  ground.receiveShadow = true;
  scene.add(ground);
  const cache = new Map();
  const rotationStage = new THREE.Group();
  scene.add(rotationStage);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selected;
  let autoRotate = false;
  let underConstruction = false;
  let contextLost = false;
  let disposed = false;
  let animationFrame;
  let lastTime = 0;

  function fitView() {
    if (!selected) return;
    selected.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    selected.traverseVisible(part => { if (part.isMesh) box.union(new THREE.Box3().setFromObject(part)); });
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const length = Math.max(size.y, size.x / camera.aspect, size.z / camera.aspect);
    const distance = length / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.6;
    controls.target.set(0, center.y, 0);
    camera.position.set(distance * 0.53, center.y + distance * 0.3, distance * 0.82);
    camera.lookAt(controls.target);
    controls.update();
  }

  function selectModel(card) {
    if (selected) rotationStage.remove(selected);
    selected = cache.get(card.id);
    if (!selected) {
      selected = createCardUnit(card, CARD_DEFINITIONS.indexOf(card));
      selected.traverse(part => { if (part.isSprite) part.visible = false; });
      if (['construction', 'machine'].includes(card.type)) {
        const selection = selected.getObjectByName('selectionRing');
        if (selection) selection.visible = false;
      }
      selected.rotation.y = selected.userData.modelFrontZ === -1 ? Math.PI : 0;
      cache.set(card.id, selected);
    }
    rotationStage.add(selected);
    rotationStage.rotation.y = 0;
    underConstruction = false;
    applyConstructionState(selected, false, [selected], viewport);
    buildButton.hidden = !selected.getObjectByName('towerConstructionParts')
      && !selected.getObjectByName('barrierConstructionParts') && !selected.getObjectByName('houseConstructionParts')
      && !selected.getObjectByName('goblinTowerConstructionParts') && !selected.getObjectByName('cannonConstructionParts')
      && !selected.getObjectByName('supportConstructionParts');
    buildButton.setAttribute('aria-pressed', 'false');
    buildButton.textContent = 'Ver em construção';
    document.querySelector('#model-title').textContent = card.name;
    document.querySelector('#model-category').textContent = `${CARD_CATEGORY_LABELS[card.category] ?? card.category} · ${card.rarity}`;
    document.querySelector('#model-summary').textContent = card.info;
    document.querySelectorAll('#model-list [data-model-id]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.modelId === card.id)));
    document.title = `${card.name} · Miniaturas de Tronos em Ruínas`;
    history.replaceState(null, '', `?piece=${encodeURIComponent(card.id)}`);
    viewport.dataset.currentModel = card.id;
    fitView();
  }

  for (const card of cards) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.modelId = card.id;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = card.name;
    button.addEventListener('click', () => selectModel(card));
    document.querySelector('#model-list').append(button);
  }
  function resize() {
    const { width, height } = viewport.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fitView();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  resize();
  selectModel(cards.find(card => card.id === new URLSearchParams(location.search).get('piece')) ?? cards[0]);

  document.querySelector('#model-reset').addEventListener('click', () => { rotationStage.rotation.y = 0; fitView(); });
  const rotateButton = document.querySelector('#model-rotate');
  function syncMotionPreference() {
    rotateButton.disabled = reducedMotion.matches;
    rotateButton.title = reducedMotion.matches ? 'Rotação automática desativada pela preferência de movimento reduzido.' : '';
    if (reducedMotion.matches) {
      autoRotate = false;
      rotateButton.setAttribute('aria-pressed', 'false');
      rotateButton.textContent = 'Girar automaticamente';
    }
  }
  reducedMotion.addEventListener('change', syncMotionPreference);
  syncMotionPreference();
  rotateButton.addEventListener('click', event => {
    autoRotate = !autoRotate;
    event.currentTarget.setAttribute('aria-pressed', String(autoRotate));
    event.currentTarget.textContent = autoRotate ? 'Parar rotação' : 'Girar automaticamente';
  });
  buildButton.addEventListener('click', () => {
    underConstruction = !underConstruction;
    applyConstructionState(selected, underConstruction, [selected], viewport);
    buildButton.setAttribute('aria-pressed', String(underConstruction));
    buildButton.textContent = underConstruction ? 'Ver concluída' : 'Ver em construção';
    fitView();
  });
  viewport.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') rotationStage.rotation.y -= Math.PI / 8;
    if (event.key === 'ArrowRight') rotationStage.rotation.y += Math.PI / 8;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const offset = camera.position.clone().sub(controls.target).multiplyScalar(event.key === 'ArrowUp' ? 0.9 : 1.1);
      offset.clampLength(controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset);
    }
  });

  function render(time) {
    if (disposed || contextLost || document.hidden) return;
    const delta = Math.min((time - (lastTime || time)) / 1000, 0.05);
    lastTime = time;
    if (autoRotate && !reducedMotion.matches) rotationStage.rotation.y += delta * 0.35;
    controls.update();
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(render);
  }
  function resume() { cancelAnimationFrame(animationFrame); lastTime = 0; if (!document.hidden && !contextLost && !disposed) animationFrame = requestAnimationFrame(render); }
  document.addEventListener('visibilitychange', resume);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true; cancelAnimationFrame(animationFrame);
    error.textContent = 'Recuperando a visualização 3D…';
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => { contextLost = false; error.textContent = ''; resume(); });
  addEventListener('pagehide', event => {
    if (event.persisted) { cancelAnimationFrame(animationFrame); return; }
    disposed = true;
    cancelAnimationFrame(animationFrame);
    observer.disconnect();
    controls.dispose();
    renderer.dispose();
  });
  addEventListener('pageshow', resume);
  resume();
}
