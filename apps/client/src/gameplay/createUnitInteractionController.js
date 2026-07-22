import * as THREE from 'three';
import { add } from '../core/scenePrimitives.js';
import { createUnitPointerHandlers } from './createUnitPointerHandlers.js';

export function createUnitInteractionController(options) {
  const {
    state, app, scene, renderer, camera, cameraTransition, alliedKeep, enemyKeep,
    tile, half, units, hoverables, boardCoordinates, movementOverlay, abilities,
  } = options;
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const rayPoint = new THREE.Vector3();
  const tileMarker = add(
    new THREE.PlaneGeometry(tile * 0.9, tile * 0.9),
    new THREE.MeshBasicMaterial({
      color: 0xcaa45d, transparent: true, opacity: 0.28,
      depthWrite: false, side: THREE.DoubleSide,
    }), scene, [0, 0.075, 0], [-Math.PI / 2, 0, 0],
  );
  tileMarker.visible = false;
  const devUnitTools = document.querySelector('#dev-unit-tools');

  function updateRay(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);
  }

  function selectableFromHit(hit) {
    if (!hit) return null;
    let unit = hit.object;
    while (unit.parent && !unit.userData.selectable) unit = unit.parent;
    return unit.userData.selectable ? unit : null;
  }

  function unitAtPointer(event) {
    updateRay(event);
    return selectableFromHit(ray.intersectObjects(units, true)[0]);
  }

  function hoverableAtPointer(event) {
    updateRay(event);
    const hit = ray.intersectObjects(hoverables, true)[0];
    if (!hit) return null;
    let object = hit.object;
    while (object.parent && !object.userData.hoverable) object = object.parent;
    return object.userData.hoverable ? object : null;
  }

  function triggerAtPointer(event, triggerName) {
    updateRay(event);
    const hit = ray.intersectObjects(units, true).find(item => item.object.userData[triggerName]);
    if (!hit) return null;
    const trigger = hit.object.userData[triggerName];
    const unit = selectableFromHit(hit);
    return unit ? { unit, trigger } : null;
  }

  function boardCellAtPointer(event) {
    updateRay(event);
    if (!ray.ray.intersectPlane(boardPlane, rayPoint)
      || Math.abs(rayPoint.x) > half + tile / 2 || Math.abs(rayPoint.z) > half + tile / 2) return null;
    const worldX = boardCoordinates.snapToTile(rayPoint.x);
    const worldZ = boardCoordinates.snapToTile(rayPoint.z);
    return {
      x: Math.round((worldX + half) / tile), z: Math.round((worldZ + half) / tile), worldX, worldZ,
    };
  }

  function dragPointAtPointer(event) {
    updateRay(event);
    if (!ray.ray.intersectPlane(boardPlane, rayPoint)) return null;
    return { x: boardCoordinates.snapToTile(rayPoint.x), z: boardCoordinates.snapToTile(rayPoint.z) };
  }

  function baseSeatAtPointer(event) {
    updateRay(event);
    if (ray.intersectObject(alliedKeep, true).length) return 1;
    if (ray.intersectObject(enemyKeep, true).length) return 2;
    return null;
  }

  const clearMovementGrid = () => movementOverlay.clear();

  function syncDevUnitTools() {
    const visible = state.devMode && Boolean(state.selected);
    devUnitTools.hidden = !visible;
    if (!visible) return;
    document.querySelector('#dev-unit-name').textContent = state.selected.userData.name;
    document.querySelectorAll('[data-unit-level]').forEach(button => {
      button.setAttribute('aria-pressed', String(
        Number(button.dataset.unitLevel) === (state.selected.userData.devLevel ?? 1),
      ));
    });
  }

  function clearUnitSelection() {
    if (!state.selected) return;
    const ring = state.selected.getObjectByName('selectionRing');
    if (ring) ring.material.emissiveIntensity = ring.userData.baseEmissiveIntensity ?? 0.75;
    abilities.clearMageTargets();
    state.selected = null;
    clearMovementGrid();
    abilities.syncInstantCommand();
    abilities.syncMageCommands();
    syncDevUnitTools();
  }

  function centerCamera() {
    if (state.cameraCentering) cameraTransition.focusBoard({ side: state.selfSeat === 2 ? -1 : 1 });
  }

  function selectUnit(unit, { cinematic = true } = {}) {
    if (state.selected !== unit) abilities.clearMageTargets();
    const previousRing = state.selected?.getObjectByName('selectionRing');
    if (previousRing) previousRing.material.emissiveIntensity = previousRing.userData.baseEmissiveIntensity ?? 0.75;
    state.selected = unit;
    const ring = unit.getObjectByName('selectionRing');
    if (ring) ring.material.emissiveIntensity = 1.6;
    movementOverlay.show(unit);
    abilities.syncInstantCommand();
    abilities.syncMageCommands();
    syncDevUnitTools();
    if (cinematic) centerCamera();
  }

  const interaction = {
    tileMarker, unitAtPointer, hoverableAtPointer, boardCellAtPointer, dragPointAtPointer,
    baseSeatAtPointer, clearMovementGrid, clearUnitSelection, selectUnit, syncDevUnitTools, centerCamera,
    mageFireTriggerAtPointer: event => triggerAtPointer(event, 'mageFireTrigger')?.unit ?? null,
    abilityTriggerAtPointer: event => {
      const hit = triggerAtPointer(event, 'abilityTrigger');
      return hit ? { unit: hit.unit, abilityTrigger: hit.trigger } : null;
    },
  };
  const pointerHandlers = createUnitPointerHandlers({ ...options, interaction });
  return { ...interaction, mount: pointerHandlers.mount };
}
