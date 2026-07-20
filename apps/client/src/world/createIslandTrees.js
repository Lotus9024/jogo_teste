import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const TREE_MODELS = [
  '/assets/models/trees/tree-1.glb',
  '/assets/models/trees/tree-2.glb'
];

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
    const hasLeaves = materials.some(material => material?.name.includes('leaves'));
    materials.forEach(material => {
      if (!material?.name.includes('leaves')) return;
      material.transparent = false;
      material.alphaTest = 0.42;
      material.depthWrite = true;
      material.side = THREE.DoubleSide;
      material.emissive.setHex(0x183516);
      material.emissiveIntensity = 0.34;
      material.needsUpdate = true;
    });
    part.castShadow = !hasLeaves;
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
    const radial = 0.73 + random() * 0.19;
    const candidate = {
      x: Math.cos(angle) * 16.8 * radial,
      z: Math.sin(angle) * 14.25 * radial,
      rotation: random() * Math.PI * 2,
      scale: 0.85 + random() * 0.25,
      variant: placements.length % 2
    };
    const tooClose = placements.some(tree => {
      const dx = tree.x - candidate.x;
      const dz = tree.z - candidate.z;
      return dx * dx + dz * dz < minDistanceSq;
    });
    if (!tooClose) placements.push(candidate);
  }

  return placements;
}

export function createIslandTrees() {
  const group = new THREE.Group();
  group.name = 'Árvores personalizadas da ilha';
  group.userData.status = 'loading';

  const loader = new GLTFLoader();
  Promise.all(TREE_MODELS.map(url => loadTree(loader, url)))
    .then(models => {
      const trees = models.map(prepareTree);
      createPlacements().forEach(spec => {
        const tree = trees[spec.variant].clone(true);
        tree.name = `Árvore personalizada ${spec.variant + 1}`;
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

  return group;
}
