import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const TREE_MODEL = '/assets/models/trees/tree-1.glb';
const BOARD_SCENERY_CLEARANCE = 12;

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function loadTree(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, gltf => resolve(gltf.scene), undefined, reject);
  });
}

function prepareTree(tree) {
  tree.traverse(part => {
    if (!part.isMesh) return;
    const materials = Array.isArray(part.material) ? part.material : [part.material];
    const isLeafMaterial = material => /leaves|leaf|foliage/i.test(material?.name ?? '');
    const leafMaterials = materials.filter(isLeafMaterial);
    if (leafMaterials.length === materials.length) {
      part.visible = false;
      return;
    }
    if (leafMaterials.length) {
      const bareMaterials = materials.map(material => {
        if (!isLeafMaterial(material)) return material;
        const hiddenLeaves = material.clone();
        hiddenLeaves.visible = false;
        return hiddenLeaves;
      });
      part.material = Array.isArray(part.material) ? bareMaterials : bareMaterials[0];
    }
    part.castShadow = true;
    part.receiveShadow = true;
    part.frustumCulled = true;
  });

  tree.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(tree);
  tree.position.y -= bounds.min.y;
  tree.updateMatrixWorld(true);
  return tree;
}

function createPlacements() {
  const random = seededRandom(6412);
  const placements = [];
  const minDistanceSq = 25;

  while (placements.length < 12) {
    const angle = random() * Math.PI * 2;
    const radial = 0.82 + random() * 0.16;
    const candidate = {
      x: Math.cos(angle) * 16.8 * radial,
      z: Math.sin(angle) * 14.25 * radial,
      rotation: random() * Math.PI * 2,
      scale: 0.85 + random() * 0.25
    };
    const overlapsBoard = Math.abs(candidate.x) < BOARD_SCENERY_CLEARANCE
      && Math.abs(candidate.z) < BOARD_SCENERY_CLEARANCE;
    const tooClose = placements.some(tree => {
      const dx = tree.x - candidate.x;
      const dz = tree.z - candidate.z;
      return dx * dx + dz * dz < minDistanceSq;
    });
    if (!overlapsBoard && !tooClose) placements.push(candidate);
  }

  return placements;
}

export function createIslandTrees({ autoLoad = true } = {}) {
  const group = new THREE.Group();
  group.name = 'Árvores personalizadas da ilha';
  group.userData.status = 'loading';

  let started = false;
  function load() {
    if (started) return;
    started = true;
    const loader = new GLTFLoader();
    loadTree(loader, TREE_MODEL)
    .then(model => {
      const treeSource = prepareTree(model);
      createPlacements().forEach(spec => {
        const tree = treeSource.clone(true);
        tree.name = 'Árvore seca fora do tabuleiro';
        tree.position.set(spec.x, -0.54, spec.z);
        tree.rotation.y = spec.rotation;
        tree.scale.setScalar(spec.scale);
        group.add(tree);
      });
      group.userData.status = 'ready';
      group.userData.count = group.children.length;
    })
    .catch(() => {
      group.userData.status = 'failed';
    });
  }
  group.userData.load = load;
  if (autoLoad) load();

  return group;
}
