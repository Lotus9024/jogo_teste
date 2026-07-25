import * as THREE from 'three';

const BOARD_SCENERY_CLEARANCE = 12;
const TREE_COUNT = 9;
const BRANCHES_PER_TREE = 6;
const UP = new THREE.Vector3(0, 1, 0);

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createPlacements() {
  const random = seededRandom(6412);
  const placements = [];
  const minDistanceSq = 12.25;
  let attempts = 0;

  while (placements.length < TREE_COUNT && attempts < 600) {
    attempts += 1;
    const candidate = {
      x: (random() * 2 - 1) * 15.8,
      z: (random() * 2 - 1) * 13.35,
      rotation: random() * Math.PI * 2,
      scale: 0.82 + random() * 0.32,
      height: 0.9 + random() * 0.24,
      girth: 0.54 + random() * 0.34,
      leanX: (random() - 0.5) * 0.34,
      leanZ: (random() - 0.5) * 0.34,
      branchCount: 4 + Math.floor(random() * 3)
    };
    const normalizedRadius = (candidate.x / 16.8) ** 2 + (candidate.z / 14.25) ** 2;
    const overlapsBoard = Math.abs(candidate.x) < BOARD_SCENERY_CLEARANCE
      && Math.abs(candidate.z) < BOARD_SCENERY_CLEARANCE;
    const tooClose = placements.some(tree => {
      const dx = tree.x - candidate.x;
      const dz = tree.z - candidate.z;
      return dx * dx + dz * dz < minDistanceSq;
    });
    if (normalizedRadius < 0.55 || normalizedRadius > 0.94) continue;
    if (!overlapsBoard && !tooClose) placements.push(candidate);
  }

  return placements;
}

function createSegmentMatrix(start, end, thickness, placement) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const rotation = new THREE.Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
  const localMatrix = new THREE.Matrix4().compose(
    midpoint,
    rotation,
    new THREE.Vector3(thickness, direction.length(), thickness)
  );
  return new THREE.Matrix4().multiplyMatrices(placement, localMatrix);
}

function createTreeInstances() {
  const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1, 5, 1, false);
  const branchGeometry = new THREE.CylinderGeometry(0.11, 0.17, 1, 5, 1, false);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x261711,
    roughness: 1,
    metalness: 0
  });
  const branchMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d110d,
    roughness: 1,
    metalness: 0
  });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, TREE_COUNT);
  const branches = new THREE.InstancedMesh(
    branchGeometry,
    branchMaterial,
    TREE_COUNT * BRANCHES_PER_TREE
  );
  const treeRotation = new THREE.Quaternion();
  const treeScale = new THREE.Vector3();
  const treePosition = new THREE.Vector3();
  const placementMatrix = new THREE.Matrix4();
  let branchIndex = 0;

  createPlacements().forEach((spec, treeIndex) => {
    treeRotation.setFromAxisAngle(UP, spec.rotation);
    treeScale.set(
      spec.scale * spec.girth,
      spec.scale * spec.height,
      spec.scale * spec.girth
    );
    treePosition.set(spec.x, -0.54, spec.z);
    placementMatrix.compose(treePosition, treeRotation, treeScale);

    trunks.setMatrixAt(
      treeIndex,
      createSegmentMatrix(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(spec.leanX, 2.85, spec.leanZ),
        1,
        placementMatrix
      )
    );

    const branchSpecs = [
      [[0.03, 1.15, 0], [0.92, 2.12, 0.12], 1],
      [[0.05, 1.42, 0], [-0.78, 2.35, 0.26], 0.9],
      [[0.06, 1.72, -0.02], [0.28, 2.55, -0.82], 0.82],
      [[0.07, 1.92, -0.02], [-0.18, 2.72, 0.72], 0.75],
      [[0.07, 2.18, -0.03], [0.67, 2.78, -0.24], 0.66],
      [[0.08, 2.28, -0.03], [-0.48, 2.9, -0.3], 0.62]
    ];
    const branchRandom = seededRandom(8100 + treeIndex * 97);
    branchSpecs.slice(0, spec.branchCount).forEach(([start, end, thickness]) => {
      const variedEnd = [
        end[0] * (0.84 + branchRandom() * 0.34),
        end[1] * (0.94 + branchRandom() * 0.1),
        end[2] * (0.84 + branchRandom() * 0.34)
      ];
      branches.setMatrixAt(
        branchIndex,
        createSegmentMatrix(
          new THREE.Vector3(...start),
          new THREE.Vector3(...variedEnd),
          thickness * (0.72 + branchRandom() * 0.24),
          placementMatrix
        )
      );
      branchIndex += 1;
    });
  });
  branches.count = branchIndex;

  [trunks, branches].forEach(mesh => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.computeBoundingSphere();
  });

  return { trunks, branches };
}

export function createIslandTrees({ autoLoad = true } = {}) {
  const group = new THREE.Group();
  group.name = 'Árvores low-poly da ilha';
  group.userData.status = 'waiting';

  let started = false;
  function load() {
    if (started) return;
    started = true;
    const { trunks, branches } = createTreeInstances();
    group.add(trunks, branches);
    group.userData.status = 'ready';
    group.userData.count = TREE_COUNT;
    group.userData.drawCalls = 2;
  }

  group.userData.load = load;
  if (autoLoad) load();

  return group;
}
