import * as THREE from 'three';
import { createBarkMaps, createGrainMaps, texturedStandardMaterial } from '../core/darkFantasySurfaces.js';

const BOARD_SCENERY_CLEARANCE = 12;
const TREE_COUNT = 12;
const TRUNK_SEGMENTS = 3;
const BRANCHES_PER_TREE = 5;
const BRANCH_SEGMENTS = 2;
const TWIGS_PER_BRANCH = 2;
const FINE_TWIGS_PER_BRANCH = 1;
const ROOTS_PER_TREE = 4;
const ROOT_SEGMENTS = 2;
const KNOTS_PER_TREE = 3;
const BROKEN_STUBS_PER_TREE = 2;
const UP = new THREE.Vector3(0, 1, 0);
const barkMaps = createBarkMaps({ bark: [46, 33, 29], highlight: [82, 64, 53], repeat: [4.2, 2.6], seed: 641 });
const branchBarkMaps = createBarkMaps({ bark: [36, 25, 24], highlight: [67, 48, 43], repeat: [5, 3.1], seed: 683 });
const scarMaps = createGrainMaps({ color: [92, 76, 66], repeat: [5.6, 3.5], seed: 743, streak: 0.28 });

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
      height: 0.86 + random() * 0.34,
      girth: 0.42 + random() * 0.4,
      leanX: (random() - 0.5) * 0.34,
      leanZ: (random() - 0.5) * 0.34,
      branchCount: 3 + Math.floor(random() * 3)
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
  const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.31, 1, 10, 6, false);
  const branchGeometry = new THREE.CylinderGeometry(0.068, 0.15, 1, 8, 3, false);
  const twigGeometry = new THREE.CylinderGeometry(0.03, 0.068, 1, 7, 2, false);
  const fineTwigGeometry = new THREE.CylinderGeometry(0.014, 0.036, 1, 6, 1, false);
  const rootGeometry = new THREE.CylinderGeometry(0.04, 0.15, 1, 8, 2, false);
  const knotGeometry = new THREE.DodecahedronGeometry(0.12, 0);
  const stubGeometry = new THREE.CylinderGeometry(0.055, 0.12, 1, 6, 1, false);
  const trunkMaterial = texturedStandardMaterial(barkMaps, {
    color: 0xffffff,
    emissive: 0x030102,
    emissiveIntensity: 0.06,
    roughness: 1,
    metalness: 0,
    flatShading: false,
    bumpScale: 0.11,
  });
  const branchMaterial = texturedStandardMaterial(branchBarkMaps, {
    color: 0xffffff,
    emissive: 0x020102,
    emissiveIntensity: 0.04,
    roughness: 1,
    metalness: 0,
    flatShading: false,
    bumpScale: 0.09,
  });
  const twigMaterial = branchMaterial.clone();
  twigMaterial.color.setHex(0x76666f);
  const fineTwigMaterial = branchMaterial.clone();
  fineTwigMaterial.color.setHex(0x685761);
  const rootMaterial = trunkMaterial.clone();
  rootMaterial.color.setHex(0x6e6268);
  const knotMaterial = texturedStandardMaterial(scarMaps, {
    color: 0x8a7378,
    emissive: 0x090407,
    emissiveIntensity: 0.08,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    bumpScale: 0.055,
  });
  const stubMaterial = branchMaterial.clone();
  stubMaterial.color.setHex(0x8a7477);
  const trunks = new THREE.InstancedMesh(
    trunkGeometry,
    trunkMaterial,
    TREE_COUNT * TRUNK_SEGMENTS
  );
  const branches = new THREE.InstancedMesh(
    branchGeometry,
    branchMaterial,
    TREE_COUNT * BRANCHES_PER_TREE * BRANCH_SEGMENTS
  );
  const twigs = new THREE.InstancedMesh(
    twigGeometry,
    twigMaterial,
    TREE_COUNT * BRANCHES_PER_TREE * TWIGS_PER_BRANCH
  );
  const fineTwigs = new THREE.InstancedMesh(
    fineTwigGeometry,
    fineTwigMaterial,
    TREE_COUNT * BRANCHES_PER_TREE * FINE_TWIGS_PER_BRANCH
  );
  const roots = new THREE.InstancedMesh(
    rootGeometry,
    rootMaterial,
    TREE_COUNT * ROOTS_PER_TREE * ROOT_SEGMENTS
  );
  const knots = new THREE.InstancedMesh(knotGeometry, knotMaterial, TREE_COUNT * KNOTS_PER_TREE);
  const brokenStubs = new THREE.InstancedMesh(
    stubGeometry,
    stubMaterial,
    TREE_COUNT * BROKEN_STUBS_PER_TREE
  );
  trunks.name = 'Troncos secos com casca';
  branches.name = 'Galhos secos principais';
  twigs.name = 'Ramificações secas';
  fineTwigs.name = 'Gravetos secos finos';
  roots.name = 'Raízes expostas';
  knots.name = 'Nós e cicatrizes da madeira';
  brokenStubs.name = 'Galhos secos quebrados';
  const treeRotation = new THREE.Quaternion();
  const treeScale = new THREE.Vector3();
  const treePosition = new THREE.Vector3();
  const placementMatrix = new THREE.Matrix4();
  const rootPlacementMatrix = new THREE.Matrix4();
  const detailMatrix = new THREE.Matrix4();
  const detailLocalMatrix = new THREE.Matrix4();
  const detailQuaternion = new THREE.Quaternion();
  const detailEuler = new THREE.Euler();
  let trunkIndex = 0;
  let branchIndex = 0;
  let twigIndex = 0;
  let fineTwigIndex = 0;
  let rootIndex = 0;
  let knotIndex = 0;
  let stubIndex = 0;

  createPlacements().forEach((spec, treeIndex) => {
    treeRotation.setFromAxisAngle(UP, spec.rotation);
    treeScale.set(
      spec.scale * spec.girth,
      spec.scale * spec.height,
      spec.scale * spec.girth
    );
    treePosition.set(spec.x, -0.54, spec.z);
    placementMatrix.compose(treePosition, treeRotation, treeScale);
    rootPlacementMatrix.compose(
      treePosition,
      treeRotation,
      new THREE.Vector3(spec.scale, spec.scale * spec.height, spec.scale)
    );

    const trunkRandom = seededRandom(7100 + treeIndex * 131);
    const trunkPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(
        spec.leanX * 0.2 + (trunkRandom() - 0.5) * 0.07,
        0.92 + trunkRandom() * 0.16,
        spec.leanZ * 0.2 + (trunkRandom() - 0.5) * 0.07
      ),
      new THREE.Vector3(
        spec.leanX * 0.58 + (trunkRandom() - 0.5) * 0.09,
        1.82 + trunkRandom() * 0.18,
        spec.leanZ * 0.58 + (trunkRandom() - 0.5) * 0.09
      ),
      new THREE.Vector3(
        spec.leanX + (trunkRandom() - 0.5) * 0.08,
        2.82 + trunkRandom() * 0.16,
        spec.leanZ + (trunkRandom() - 0.5) * 0.08
      )
    ];
    [1, 0.78, 0.58].forEach((thickness, segment) => {
      trunks.setMatrixAt(
        trunkIndex,
        createSegmentMatrix(
          trunkPoints[segment],
          trunkPoints[segment + 1],
          thickness,
          placementMatrix
        )
      );
      trunkIndex += 1;
    });

    const branchSpecs = [
      [[0.03, 1.15, 0], [0.92, 2.12, 0.12], 1],
      [[0.05, 1.42, 0], [-0.78, 2.35, 0.26], 0.9],
      [[0.06, 1.72, -0.02], [0.28, 2.55, -0.82], 0.82],
      [[0.07, 1.92, -0.02], [-0.18, 2.72, 0.72], 0.75],
      [[0.07, 2.18, -0.03], [0.67, 2.78, -0.24], 0.66],
      [[0.08, 2.28, -0.03], [-0.48, 2.9, -0.3], 0.62]
    ];
    const branchRandom = seededRandom(8100 + treeIndex * 97);
    branchSpecs.slice(0, spec.branchCount).forEach(([start, end, thickness], primaryIndex) => {
      const branchStart = new THREE.Vector3(...start);
      const trunkProgress = THREE.MathUtils.clamp(branchStart.y / 2.95, 0, 1);
      branchStart.x += spec.leanX * Math.pow(trunkProgress, 1.12);
      branchStart.z += spec.leanZ * Math.pow(trunkProgress, 1.12);
      const branchDelta = new THREE.Vector3(
        end[0] - start[0],
        end[1] - start[1],
        end[2] - start[2]
      );
      const radialDelta = new THREE.Vector3(branchDelta.x, 0, branchDelta.z)
        .applyAxisAngle(UP, (branchRandom() - 0.5) * 0.58)
        .multiplyScalar(0.84 + branchRandom() * 0.34);
      const branchEnd = branchStart.clone().add(new THREE.Vector3(
        radialDelta.x,
        branchDelta.y * (0.9 + branchRandom() * 0.18),
        radialDelta.z
      ));
      const branchMid = branchStart.clone().lerp(branchEnd, 0.54).add(new THREE.Vector3(
        (branchRandom() - 0.5) * 0.13,
        0.03 + branchRandom() * 0.11,
        (branchRandom() - 0.5) * 0.13
      ));
      branches.setMatrixAt(
        branchIndex,
        createSegmentMatrix(
          branchStart,
          branchMid,
          thickness * (0.76 + branchRandom() * 0.18),
          placementMatrix
        )
      );
      branchIndex += 1;
      branches.setMatrixAt(
        branchIndex,
        createSegmentMatrix(
          branchMid,
          branchEnd,
          thickness * (0.56 + branchRandom() * 0.14),
          placementMatrix
        )
      );
      branchIndex += 1;

      for (let twig = 0; twig < TWIGS_PER_BRANCH; twig += 1) {
        const twigStart = branchStart.clone().lerp(branchEnd, 0.55 + twig * 0.18);
        const side = (twig + primaryIndex) % 2 ? -1 : 1;
        const twigEnd = branchEnd.clone().add(new THREE.Vector3(
          side * (0.22 + branchRandom() * 0.32),
          0.24 + branchRandom() * 0.42,
          (branchRandom() - 0.5) * 0.54
        ));
        twigs.setMatrixAt(
          twigIndex,
          createSegmentMatrix(twigStart, twigEnd, 0.68 + branchRandom() * 0.2, placementMatrix)
        );
        twigIndex += 1;
      }

      for (let fork = 0; fork < FINE_TWIGS_PER_BRANCH; fork += 1) {
        const side = (fork + primaryIndex) % 2 ? -1 : 1;
        const fineStart = branchStart.clone().lerp(branchEnd, 0.82 + fork * 0.1);
        const fineEnd = branchEnd.clone().add(new THREE.Vector3(
          side * (0.3 + branchRandom() * 0.26),
          0.42 + branchRandom() * 0.36,
          (branchRandom() - 0.5) * 0.7
        ));
        fineTwigs.setMatrixAt(
          fineTwigIndex,
          createSegmentMatrix(fineStart, fineEnd, 0.78 + branchRandom() * 0.16, placementMatrix)
        );
        fineTwigIndex += 1;
      }
    });

    for (let root = 0; root < ROOTS_PER_TREE; root += 1) {
      const angle = root / ROOTS_PER_TREE * Math.PI * 2 + (branchRandom() - 0.5) * 0.42;
      const middleAngle = angle + (branchRandom() - 0.5) * 0.24;
      const endAngle = middleAngle + (branchRandom() - 0.5) * 0.3;
      const length = 0.58 + branchRandom() * 0.42;
      const rootStart = new THREE.Vector3(0, 0.1, 0);
      const rootMiddle = new THREE.Vector3(
        Math.cos(middleAngle) * length * (0.43 + branchRandom() * 0.12),
        0.01 + branchRandom() * 0.045,
        Math.sin(middleAngle) * length * (0.43 + branchRandom() * 0.12)
      );
      const rootEnd = new THREE.Vector3(
        Math.cos(endAngle) * length,
        -0.08 - branchRandom() * 0.08,
        Math.sin(endAngle) * length
      );
      roots.setMatrixAt(
        rootIndex,
        createSegmentMatrix(rootStart, rootMiddle, 0.82 + branchRandom() * 0.12, rootPlacementMatrix)
      );
      rootIndex += 1;
      roots.setMatrixAt(
        rootIndex,
        createSegmentMatrix(rootMiddle, rootEnd, 0.5 + branchRandom() * 0.11, rootPlacementMatrix)
      );
      rootIndex += 1;
    }

    for (let knot = 0; knot < KNOTS_PER_TREE; knot += 1) {
      const angle = knot / KNOTS_PER_TREE * Math.PI * 2 + branchRandom() * 0.62;
      const knotHeight = 0.48 + knot * 0.67 + branchRandom() * 0.25;
      const knotProgress = knotHeight / 2.95;
      detailEuler.set(branchRandom() * 0.25, angle, (branchRandom() - 0.5) * 0.35);
      detailQuaternion.setFromEuler(detailEuler);
      detailLocalMatrix.compose(
        new THREE.Vector3(
          Math.cos(angle) * 0.2 + spec.leanX * knotProgress,
          knotHeight,
          Math.sin(angle) * 0.2 + spec.leanZ * knotProgress
        ),
        detailQuaternion,
        new THREE.Vector3(1.1 + branchRandom() * 0.45, 0.34, 0.42)
      );
      detailMatrix.multiplyMatrices(rootPlacementMatrix, detailLocalMatrix);
      knots.setMatrixAt(knotIndex, detailMatrix);
      knotIndex += 1;
    }

    for (let stub = 0; stub < BROKEN_STUBS_PER_TREE; stub += 1) {
      const angle = stub / BROKEN_STUBS_PER_TREE * Math.PI * 2 + branchRandom() * 0.65;
      const stubHeight = 0.68 + stub * 0.68 + branchRandom() * 0.28;
      const stubProgress = stubHeight / 2.95;
      const start = new THREE.Vector3(
        Math.cos(angle) * 0.08 + spec.leanX * stubProgress,
        stubHeight,
        Math.sin(angle) * 0.08 + spec.leanZ * stubProgress
      );
      const end = start.clone().add(new THREE.Vector3(
        Math.cos(angle) * (0.2 + branchRandom() * 0.18),
        0.13 + branchRandom() * 0.18,
        Math.sin(angle) * (0.2 + branchRandom() * 0.18)
      ));
      brokenStubs.setMatrixAt(
        stubIndex,
        createSegmentMatrix(start, end, 0.72 + branchRandom() * 0.16, placementMatrix)
      );
      stubIndex += 1;
    }
  });
  trunks.count = trunkIndex;
  branches.count = branchIndex;
  twigs.count = twigIndex;
  fineTwigs.count = fineTwigIndex;
  roots.count = rootIndex;
  knots.count = knotIndex;
  brokenStubs.count = stubIndex;

  [trunks, branches, twigs, fineTwigs, roots, knots, brokenStubs].forEach(mesh => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.computeBoundingSphere();
  });

  return { trunks, branches, twigs, fineTwigs, roots, knots, brokenStubs };
}

export function createIslandTrees({ autoLoad = true } = {}) {
  const group = new THREE.Group();
  group.name = 'Árvores antigas texturizadas da ilha';
  group.userData.status = 'waiting';

  let started = false;
  function load() {
    if (started) return;
    started = true;
    const { trunks, branches, twigs, fineTwigs, roots, knots, brokenStubs } = createTreeInstances();
    group.add(trunks, branches, twigs, fineTwigs, roots, knots, brokenStubs);
    group.userData.status = 'ready';
    group.userData.count = TREE_COUNT;
    group.userData.drawCalls = 7;
  }

  group.userData.load = load;
  if (autoLoad) load();

  return group;
}
