import * as THREE from 'three';
import { makeAcidCircle } from '../assets/models/acidEffectModel.js';

export function createMageEffects(scene, tileSize) {
  const effects = [];

  function castAcid(mage) {
    if (!mage) return;
    const effect = makeAcidCircle(tileSize);
    effect.position.copy(mage.position);
    effect.position.y = 0.085;
    scene.add(effect);

    const staff = mage.getObjectByName('mageStaff');
    const rig = mage.getObjectByName('rig');
    effects.push({
      effect,
      mage,
      staff,
      rig,
      baseStaffRotation: staff?.rotation.z ?? 0,
      baseRigRotation: rig?.rotation.y ?? 0,
      age: 0,
      duration: 2.8
    });
  }

  function update(delta) {
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const item = effects[index];
      item.age += delta;
      const summonProgress = Math.min(1, item.age / 0.48);
      const fade = item.age > 2.05 ? Math.max(0, 1 - (item.age - 2.05) / 0.75) : 1;
      const eased = 1 - Math.pow(1 - summonProgress, 3);
      const puddle = item.effect.getObjectByName('acidPuddle');
      const ring = item.effect.getObjectByName('acidRing');
      puddle?.scale.setScalar(0.08 + eased * 0.92);
      ring?.scale.setScalar(0.08 + eased * 0.92);
      if (puddle) puddle.material.opacity = 0.58 * fade;
      if (ring) {
        ring.material.opacity = 0.82 * fade;
        ring.rotation.z += delta * 0.7;
      }
      item.effect.traverse(part => {
        if (!part.userData.acidDrop) return;
        part.position.y = 0.08 + Math.abs(Math.sin(item.age * 6 + part.userData.phase)) * 0.24 * (1 - summonProgress * 0.55);
        part.material.opacity = 0.9 * fade;
      });

      if (item.staff) item.staff.rotation.z = item.baseStaffRotation - Math.sin(Math.min(1, item.age / 0.42) * Math.PI) * 0.62;
      if (item.rig && item.age < 0.72) item.rig.rotation.y = item.baseRigRotation + Math.sin(Math.min(1, item.age / 0.72) * Math.PI) * 0.5;

      if (item.age < item.duration) continue;
      if (item.staff) item.staff.rotation.z = item.baseStaffRotation;
      if (item.rig) item.rig.rotation.y = item.baseRigRotation;
      scene.remove(item.effect);
      item.effect.traverse(part => {
        part.geometry?.dispose?.();
        part.material?.dispose?.();
      });
      effects.splice(index, 1);
    }
  }

  return { castAcid, update };
}
