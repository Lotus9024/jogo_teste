import * as THREE from 'three';

const CONSTRUCTION_PARTS_PATTERN = /Parts$/;

function removeModelPart(root, name) {
  const part = root.getObjectByName(name);
  if (part) part.removeFromParent();
}

function groundObject(object) {
  object.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(object);
  if (!Number.isFinite(bounds.min.y)) return;

  object.position.y -= bounds.min.y;
  object.updateWorldMatrix(true, true);
}

export function prepareConstructionUnit(unit) {
  removeModelPart(unit, 'unitPedestal');
  removeModelPart(unit, 'teamPlatform');

  const selectionRing = unit.getObjectByName('selectionRing');
  if (selectionRing) selectionRing.position.y = 0.035;

  const rig = unit.getObjectByName('rig');
  if (!rig) return unit;

  const stateGroups = rig.children.filter(
    (child) => child.isGroup && CONSTRUCTION_PARTS_PATTERN.test(child.name)
  );

  if (stateGroups.length > 0) {
    stateGroups.forEach(groundObject);
  } else {
    groundObject(rig);
  }

  return unit;
}
