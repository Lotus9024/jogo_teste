import * as THREE from 'three';
import { CARD_DEFINITIONS, CARD_BY_ID, ORTHOGONAL_DIRECTIONS, baseCellsForSeat, cellKey } from '@tronos/shared/cards';
import { makeFireHazard } from '../src/assets/models/fireHazardModel.js';
import { makeRoad } from '../src/assets/models/roadModel.js';
import { createGameScene } from '../src/core/createGameScene.js';
import { createCardUnit } from '../src/models/createCardUnit.js';
import { applyConstructionState, setUnitTeamColor } from '../src/gameplay/unitState.js';
import { updateHealthBadge } from '../src/ui/unitHealthBadge.js';
import { createWorld } from '../src/world/createWorld.js';

const app = document.querySelector('#game');
const source = new URLSearchParams(location.search).get('source') ?? 'http://127.0.0.1:4310';
const { scene, renderer, camera, controls, updateDynamicLighting } = createGameScene(app);
const { tile, half, alliedKeep, enemyKeep, wisps, fireLights, updateTerrain } = createWorld(scene, renderer);
const units = [];
const byId = new Map();
const roadMeshes = [];
const fireMeshes = [];
let previous = null;
let latest = null;

camera.position.set(0, 18.5, 7.3);
camera.lookAt(0, 0, 0);
controls.target.set(0, 0.2, 0);
controls.enablePan = false;
controls.update();

const $ = selector => document.querySelector(selector);

function player(seat) { return latest?.state.players.find(item => item.seat === seat); }
function unitName(data) { return CARD_BY_ID[data.cardId]?.name ?? data.cardId; }

function describeChange(before, after) {
  if (!before) return 'Os dois exércitos se preparam para a batalha.';
  if (after.state.phase === 'finished' && before.state.phase !== 'finished') return `A base do jogador P${after.state.winnerSeat === 1 ? 2 : 1} foi destruída.`;
  const oldUnits = new Map(before.state.units.map(unit => [unit.id, unit]));
  const newUnits = new Map(after.state.units.map(unit => [unit.id, unit]));
  const oldRoads = new Map((before.state.roads ?? []).map(road => [road.id, road]));
  for (const road of after.state.roads ?? []) {
    const old = oldRoads.get(road.id);
    if (!old) return `P${road.ownerSeat} iniciou uma Rua em ${road.x},${road.z}.`;
    if (old.underConstruction && !road.underConstruction) return `A Rua de P${road.ownerSeat} foi concluída.`;
  }
  const oldFires = new Set((before.state.fires ?? []).map(fire => fire.id));
  const newFire = (after.state.fires ?? []).find(fire => !oldFires.has(fire.id));
  if (newFire) return `O Mago de P${newFire.ownerSeat} incendiou ${newFire.x},${newFire.z}.`;
  for (const unit of after.state.units) {
    const old = oldUnits.get(unit.id);
    if (!old) return `P${unit.ownerSeat} invocou ${unitName(unit)} em ${unit.x},${unit.z}.`;
    if (unit.hp < old.hp) return `${unitName(unit)} de P${unit.ownerSeat} sofreu ${old.hp - unit.hp} de dano.`;
    if (unit.x !== old.x || unit.z !== old.z) return `${unitName(unit)} de P${unit.ownerSeat} moveu para ${unit.x},${unit.z}.`;
    if (unit.mountedOnTowerId && !old.mountedOnTowerId) return `Arqueiro de P${unit.ownerSeat} subiu na Torre.`;
  }
  for (const unit of before.state.units) if (!newUnits.has(unit.id)) return `${unitName(unit)} de P${unit.ownerSeat} foi derrotado.`;
  for (const seat of [1, 2]) {
    const oldPlayer = before.state.players.find(item => item.seat === seat);
    const newPlayer = after.state.players.find(item => item.seat === seat);
    if (oldPlayer && newPlayer?.baseHp < oldPlayer.baseHp) return `A base de P${seat} sofreu ${oldPlayer.baseHp - newPlayer.baseHp} de dano.`;
  }
  if (before.state.activeSeat !== after.state.activeSeat) return `P${after.state.activeSeat} iniciou seu turno.`;
  return 'O estado da batalha foi atualizado.';
}

function updateHud() {
  const blue = player(1), red = player(2);
  $('#room-code').textContent = `SALA ${latest.code}`;
  $('#round-label').textContent = `RODADA ${latest.state.round}`;
  $('#turn-label').textContent = latest.state.phase === 'finished' ? 'PARTIDA ENCERRADA' : `TURNO · ${player(latest.state.activeSeat)?.name ?? `P${latest.state.activeSeat}`}`;
  $('#blue-name').textContent = blue?.name ?? 'Codex Azul';
  $('#red-name').textContent = red?.name ?? 'Codex Vermelho';
  $('#blue-hp').textContent = blue?.baseHp ?? 10;
  $('#red-hp').textContent = red?.baseHp ?? 10;
  $('#blue-energy').textContent = blue?.energy ?? 10;
  $('#red-energy').textContent = red?.energy ?? 10;
  $('#blue-max-energy').textContent = blue?.maxEnergy ?? 10;
  $('#red-max-energy').textContent = red?.maxEnergy ?? 10;
  $('#blue-level').textContent = blue?.baseLevel ?? 1;
  $('#red-level').textContent = red?.baseLevel ?? 1;
  $('#blue-citizens').textContent = blue?.citizens ?? 0;
  $('#red-citizens').textContent = red?.citizens ?? 0;
  alliedKeep.userData.hp = blue?.baseHp ?? 10;
  enemyKeep.userData.hp = red?.baseHp ?? 10;
  if (latest.state.phase === 'finished') {
    $('#winner').hidden = false;
    $('#winner-name').textContent = player(latest.state.winnerSeat)?.name ?? `P${latest.state.winnerSeat}`;
  }
}

function roadConnections(road, allRoads) {
  const bases = new Set(baseCellsForSeat(road.ownerSeat, latest.state.board.size).map(cell => cellKey(cell.x, cell.z)));
  const owned = new Set(allRoads.filter(item => item.ownerSeat === road.ownerSeat && !item.underConstruction).map(item => cellKey(item.x, item.z)));
  const names = ['east', 'west', 'south', 'north'];
  return Object.fromEntries(ORTHOGONAL_DIRECTIONS.map((direction, index) => {
    const key = cellKey(road.x + direction.x, road.z + direction.z);
    return [names[index], owned.has(key) || bases.has(key)];
  }));
}

function reconcileRoads(serverRoads) {
  roadMeshes.splice(0).forEach(mesh => scene.remove(mesh));
  serverRoads.forEach(road => {
    const mesh = makeRoad(roadConnections(road, serverRoads), tile, { underConstruction: Boolean(road.underConstruction) });
    mesh.position.set(road.x * tile - half, 0.072, road.z * tile - half);
    roadMeshes.push(mesh);
    scene.add(mesh);
  });
}

function reconcileFires(serverFires) {
  fireMeshes.splice(0).forEach(mesh => scene.remove(mesh));
  serverFires.forEach(fire => {
    const mesh = makeFireHazard(tile);
    mesh.position.set(fire.x * tile - half, 0.079, fire.z * tile - half);
    fireMeshes.push(mesh);
    scene.add(mesh);
  });
}

function makeUnit(data) {
  const card = CARD_BY_ID[data.cardId];
  const index = CARD_DEFINITIONS.findIndex(item => item.id === data.cardId);
  const unit = createCardUnit(card, index);
  unit.userData.serverUnitId = data.id;
  unit.userData.ownerSeat = data.ownerSeat;
  setUnitTeamColor(unit, data.ownerSeat === 1 ? 0x168cff : 0xff352f);
  scene.add(unit);
  units.push(unit);
  byId.set(data.id, unit);
  return unit;
}

function reconcile(serverUnits) {
  const present = new Set(serverUnits.map(unit => unit.id));
  for (const [id, unit] of byId) {
    if (present.has(id)) continue;
    byId.delete(id);
    units.splice(units.indexOf(unit), 1);
    scene.remove(unit);
  }
  for (const data of serverUnits) {
    const unit = byId.get(data.id) ?? makeUnit(data);
    unit.userData.hp = data.hp;
    unit.userData.actionUsed = data.actionUsed;
    unit.userData.mountedOnTowerId = data.mountedOnTowerId;
    unit.userData.underConstruction = data.underConstruction;
    updateHealthBadge(unit);
    applyConstructionState(unit, Boolean(data.underConstruction), units, app);
    unit.userData.targetPosition = new THREE.Vector3(data.x * tile - half, data.mountedOnTowerId ? 1.25 : 0.06, data.z * tile - half);
    if (!unit.userData.positioned) {
      unit.position.copy(unit.userData.targetPosition);
      unit.userData.positioned = true;
    }
  }
}

async function poll() {
  try {
    const response = await fetch(`${source}/state`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.snapshot) throw new Error('Aguardando sala das IAs');
    latest = data.snapshot;
    if (!previous || previous.state.version !== latest.state.version) {
      $('#last-action').textContent = describeChange(previous, latest);
      reconcileRoads(latest.state.roads ?? []);
      reconcileFires(latest.state.fires ?? []);
      reconcile(latest.state.units);
      updateHud();
      previous = structuredClone(latest);
    }
    $('#connection').className = 'connection';
    $('#connection').textContent = 'AO VIVO';
  } catch (error) {
    $('#connection').className = 'connection error';
    $('#connection').textContent = 'AGUARDANDO IAs';
  } finally {
    setTimeout(poll, 250);
  }
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  controls.update();
  updateDynamicLighting(elapsed);
  updateTerrain(elapsed);
  units.forEach((unit, index) => {
    if (unit.userData.targetPosition) unit.position.lerp(unit.userData.targetPosition, 0.12);
    const rig = unit.getObjectByName('rig');
    if (rig) {
      rig.position.y = 0.18 + Math.sin(elapsed * 1.35 + index * 1.7) * 0.012;
      rig.rotation.z = Math.sin(elapsed * 0.8 + index) * 0.006;
    }
  });
  wisps.forEach((wisp, index) => {
    wisp.position.x = wisp.userData.baseX + Math.sin(elapsed * 0.12 + index) * 0.55;
    wisp.material.opacity = 0.012 + index * 0.003 + Math.sin(elapsed * 0.35 + index) * 0.004;
  });
  fireLights.forEach((light, index) => {
    const pulse = 0.91 + Math.sin(elapsed * 7.4 + light.userData.phase) * 0.065 + Math.sin(elapsed * 13.1 + index) * 0.025;
    light.intensity = light.userData.baseIntensity * pulse;
  });
  fireMeshes.forEach(group => group.traverse(part => {
    if (!part.userData.flame) return;
    const pulse = 0.82 + Math.sin(elapsed * 8 + part.userData.phase) * 0.18;
    part.scale.set(pulse, 0.88 + Math.sin(elapsed * 10 + part.userData.phase) * 0.16, pulse);
  }));
  renderer.render(scene, camera);
}

function resize() {
  const aspect = innerWidth / innerHeight;
  const view = innerWidth < 700 ? 12.6 : 11.45;
  camera.left = -view * aspect;
  camera.right = view * aspect;
  camera.top = view;
  camera.bottom = -view;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

addEventListener('resize', resize);
resize();
poll();
animate();
