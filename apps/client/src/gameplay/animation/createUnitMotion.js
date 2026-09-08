import * as THREE from 'three';

const WEAPONS = new Set(['warriorSword', 'guardSpear', 'goblinDagger', 'henryLeftBlade', 'henryRightBlade',
  'operatorForgeHammer', 'citizenPitchfork', 'mageStaff', 'archerBow', 'cannonRecoilAssembly', 'cannonBarrel', 'cannonMuzzle', 'cannonBore']);
const snapshot = part => ({ part, position: part.position.clone(), rotation: part.rotation.clone(), scale: part.scale.clone() });
const restore = state => {
  state.part.position.copy(state.position);
  state.part.rotation.copy(state.rotation);
  state.part.scale.copy(state.scale);
};

/** Poses live below the logical unit root: board coordinates and anchors never move. */
export function createUnitMotion({ reducedMotion = () => false } = {}) {
  const active = new Map();

  function entry(unit) {
    let pose = active.get(unit);
    if (pose) return pose;
    const rig = unit?.getObjectByName('castleStructure') ?? unit?.getObjectByName('rig');
    if (!rig) return null;
    const weapons = [], feet = [], wheels = [];
    const cannonAssembly = rig.getObjectByName('cannonRecoilAssembly');
    rig.traverse(part => {
      if (WEAPONS.has(part.name) && !(cannonAssembly && part.name.startsWith('cannon') && part !== cannonAssembly)) weapons.push(snapshot(part));
      if (/(Thigh|Shin|Boot|LeftBoot|RightBoot)$/.test(part.name)) feet.push(snapshot(part));
      if (part.name === 'cannonWheel') wheels.push(snapshot(part));
    });
    pose = { unit, rig: snapshot(rig), weapons, feet, wheels, walk: null, action: null,
      fixed: Boolean(unit.userData.isCastle || ['construction', 'machine', 'terrain'].includes(unit.userData.cardType)
        || unit.userData.cardId === 'cannon') };
    unit.userData.presentationAnimating = true;
    active.set(unit, pose);
    return pose;
  }

  function reset(pose) {
    restore(pose.rig);
    [...pose.weapons, ...pose.feet, ...pose.wheels].forEach(restore);
  }

  function play(unit, kind, { duration = kind === 'impact' ? 0.20 : 0.34, targetPosition } = {}) {
    const pose = entry(unit);
    if (!pose) return false;
    let turn = 0;
    if (targetPosition && !pose.fixed) {
      const direction = targetPosition.clone().sub(unit.position).applyQuaternion(unit.quaternion.clone().invert());
      const facing = (unit.userData.modelFrontZ ?? 1) < 0 ? Math.PI : 0;
      const angle = Math.atan2(direction.x, direction.z) - facing;
      turn = THREE.MathUtils.clamp(Math.atan2(Math.sin(angle), Math.cos(angle)), -0.7, 0.7);
    }
    pose.action = { kind, turn, elapsed: 0, duration: reducedMotion() ? Math.min(duration, 0.14) : duration };
    return true;
  }

  function walk(unit, progress, distance, charge = false) {
    const pose = entry(unit);
    if (!pose) return;
    pose.walk = progress >= 1 ? null : { progress, distance, charge };
  }

  function update(delta) {
    for (const [unit, pose] of active) {
      reset(pose);
      const mild = reducedMotion();
      if (pose.walk && !mild) {
        const { progress, distance, charge } = pose.walk;
        const stride = Math.sin(progress * Math.PI * Math.max(2, Math.ceil(distance * 3)));
        const envelope = Math.sin(progress * Math.PI);
        if (!pose.fixed) {
          pose.rig.part.position.y += Math.abs(stride) * 0.028 * envelope;
          pose.rig.part.rotation.x += envelope * (charge ? 0.15 : 0.055) * (unit.userData.modelFrontZ ?? 1);
          pose.feet.forEach(state => {
            const side = Math.sign(state.position.x) || 1;
            state.part.rotation.x += stride * side * 0.18 * envelope;
          });
        }
        pose.wheels.forEach(state => { state.part.rotation.x += progress * distance * 3; });
      }
      if (pose.action) {
        const action = pose.action;
        action.elapsed += delta;
        const progress = Math.min(1, action.elapsed / action.duration);
        const pulse = Math.sin(progress * Math.PI);
        const strength = mild ? 0.2 : 1;
        if (action.kind === 'impact') {
          pose.rig.part.rotation.z += Math.sin(progress * Math.PI * 2) * (pose.fixed ? 0.016 : 0.055) * strength;
        } else if (action.kind === 'spawn') {
          if (!pose.fixed) {
            pose.rig.part.scale.copy(pose.rig.scale).multiplyScalar(1 - (1 - progress) * 0.16 * strength);
            pose.rig.part.position.y -= (1 - progress) * 0.08 * strength;
          }
        } else {
          if (!pose.fixed) {
            pose.rig.part.rotation.x -= pulse * 0.045 * strength * (unit.userData.modelFrontZ ?? 1);
            pose.rig.part.rotation.y += pulse * action.turn * strength;
          }
          pose.weapons.forEach(state => {
            const part = state.part;
            if (part.name.startsWith('cannon')) part.position.z += pulse * 0.105 * strength;
            else if (part.name === 'archerBow') {
              part.rotation.y += pulse * 0.085 * strength;
              part.position.z -= pulse * 0.035 * strength;
            } else if (['guardSpear', 'citizenPitchfork'].includes(part.name)) {
              part.rotation.x += pulse * 0.18 * strength;
              part.position.z += pulse * 0.085 * strength * (unit.userData.modelFrontZ ?? 1);
            } else {
              const left = /Left/.test(part.name) ? -1 : 1;
              part.rotation.x -= pulse * (part.name === 'mageStaff' ? 0.20 : 0.56) * strength;
              part.rotation.z += pulse * 0.12 * left * strength;
            }
          });
        }
        if (progress >= 1) pose.action = null;
      }
      if (!pose.walk && !pose.action) {
        reset(pose);
        unit.userData.presentationAnimating = false;
        active.delete(unit);
      }
    }
  }

  function cancel(unit) {
    const pose = active.get(unit);
    if (!pose) return;
    reset(pose);
    unit.userData.presentationAnimating = false;
    active.delete(unit);
  }

  function clear() {
    [...active.keys()].forEach(cancel);
  }

  return { play, walk, update, cancel, clear };
}
