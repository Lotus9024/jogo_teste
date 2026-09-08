import * as THREE from 'three';
import { add } from '../core/scenePrimitives.js';
import { createCastleMaterials } from './castle/createCastleMaterials.js';
import { createCastleArchitecture, createCastleCourtyard } from './castle/createCastleArchitecture.js';

export const CASTLE_VISUAL_SIZE_COUNT = 6;

export function castleFootprintForVisualSize(size, boardSize = 15) {
  const normalizedSize = THREE.MathUtils.clamp(Math.round(Number(size) || 1), 1, CASTLE_VISUAL_SIZE_COUNT);
  const largestOddFootprint = boardSize % 2 === 0 ? boardSize - 1 : boardSize;
  return Math.min(1 + normalizedSize * 2, largestOddFootprint);
}

export function castleCenterCellForFootprint(seat, footprint, boardSize = 15, playerCount = 2) {
  const inset = Math.floor(footprint / 2);
  const far = boardSize - 1 - inset;
  if (playerCount <= 2) {
    return { x: Math.floor(boardSize / 2), z: seat === 1 ? far : inset };
  }
  return {
    1: { x: inset, z: far },
    2: { x: inset, z: inset },
    3: { x: far, z: inset },
    4: { x: far, z: far },
  }[seat] ?? null;
}

function createKeep(tile, accent, enemy = false) {
  const keep = new THREE.Group();
  const materials = createCastleMaterials(accent, enemy);
  const footprint = add(new THREE.BoxGeometry(tile * 3, 0.16, tile * 3), materials.dark, keep, [0, 0.02, 0]);
  footprint.name = 'Limite visual da base';

  const courtyard = createCastleCourtyard(materials);
  courtyard.scale.setScalar(tile);
  keep.add(courtyard);

  // Animation owns this neutral rig; the footprint and status anchor stay fixed.
  const structure = new THREE.Group();
  structure.name = 'castleStructure';
  const architecture = createCastleArchitecture(materials, enemy);
  architecture.scale.setScalar(tile);
  structure.add(architecture);
  keep.add(structure);

  const statusAnchor = new THREE.Object3D();
  statusAnchor.name = 'castleStatusAnchor';
  statusAnchor.position.y = (enemy ? 3.12 : 3.03) * tile;
  keep.add(statusAnchor);

  keep.name = enemy ? 'Cidadela da Noite Rubra' : 'Fortaleza do Corvo Negro';
  keep.userData = {
    hoverable: true,
    isCastle: true,
    name: keep.name,
    role: 'BASE 3×3 · NÍVEL 1',
    hp: enemy ? 16 : 18,
    maxHp: 20,
    damage: 0,
    move: 0,
    cost: '—',
    ability: enemy ? 'Pacto de Sangue' : 'Vigia do Corvo',
    abilityUsed: false,
    entranceLocalDirection: [0, 0, 1],
    visualSize: 1,
    footprintCells: 3,
    description: enemy
      ? 'A cidadela alimenta suas tropas com a névoa violeta.'
      : 'As sentinelas do corvo revelam invasores nas casas vizinhas.',
  };
  return keep;
}

export function createCastleKeeps(board, { tile, half }) {
  const alliedKeep = createKeep(tile, 0x49356f);
  const enemyKeep = createKeep(tile, 0x713154, true);
  const thirdKeep = createKeep(tile, 0x356f53);
  const fourthKeep = createKeep(tile, 0x73582d, true);
  const keeps = [alliedKeep, enemyKeep, thirdKeep, fourthKeep];
  const kingdomNames = ['Reino do Corvo Negro', 'Reino da Noite Rubra', 'Reino do Bosque', 'Reino do Sol Velado'];
  const rulerNames = ['Rei do Corvo', 'Rainha da Noite', 'Rei do Bosque', 'Rainha do Sol Velado'];
  keeps.forEach((keep, index) => Object.assign(keep.userData, {
    ownerSeat: index + 1,
    kingdomName: kingdomNames[index],
    rulerName: rulerNames[index],
    currentLevel: 1,
  }));
  const boardSize = Math.round(half * 2 / tile) + 1;
  let currentPlayerCount = 2;

  function faceCenter(keep) {
    keep.rotation.y = Math.atan2(-keep.position.x, -keep.position.z);
    // The castle faces the center, while its registered square stays on the grid.
    keep.getObjectByName('Limite visual da base').rotation.y = -keep.rotation.y;
  }

  function setVisualSize(seat, size = 1) {
    const keep = keeps[seat - 1];
    if (!keep) return null;
    const footprint = castleFootprintForVisualSize(size, boardSize);
    const center = castleCenterCellForFootprint(seat, footprint, boardSize, currentPlayerCount);
    if (!center) return null;
    const horizontalScale = footprint / 3;
    const verticalScale = 1 + (horizontalScale - 1) * 0.16;
    keep.scale.set(horizontalScale, verticalScale, horizontalScale);
    keep.position.set(center.x * tile - half, 0.06, center.z * tile - half);
    keep.userData.visualSize = THREE.MathUtils.clamp(Math.round(Number(size) || 1), 1, CASTLE_VISUAL_SIZE_COUNT);
    keep.userData.footprintCells = footprint;
    keep.userData.role = `BASE ${footprint}×${footprint} · NÍVEL ${keep.userData.currentLevel ?? 1}`;
    faceCenter(keep);
    return { footprint, center, horizontalScale };
  }

  function setPlayerCount(playerCount = 2) {
    currentPlayerCount = playerCount <= 2 ? 2 : Math.min(4, playerCount);
    keeps.forEach((keep, index) => setVisualSize(index + 1, keep.userData.visualSize ?? 1));
    keeps.forEach((keep, index) => { keep.visible = index < playerCount; });
  }

  board.add(...keeps);
  setPlayerCount(2);
  return { alliedKeep, enemyKeep, keeps, setPlayerCount, setVisualSize };
}
