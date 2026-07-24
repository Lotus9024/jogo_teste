import * as THREE from 'three';

const BOARD_SCENERY_CLEARANCE = 12;
const TREE_COUNT = 12;
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
  const minDistanceSq = 25;

  while (placements.length < TREE_COUNT) {
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
    treeScale.setScalar(spec.scale);
    treePosition.set(spec.x, -0.54, spec.z);
    placementMatrix.compose(treePosition, treeRotation, treeScale);

    trunks.setMatrixAt(
      treeIndex,
      createSegmentMatrix(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.08, 2.85, -0.03),
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
    branchSpecs.forEach(([start, end, thickness]) => {
      branches.setMatrixAt(
        branchIndex,
        createSegmentMatrix(
          new THREE.Vector3(...start),
          new THREE.Vector3(...end),
          thickness,
          placementMatrix
        )
      );
      branchIndex += 1;
    });
  });

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
