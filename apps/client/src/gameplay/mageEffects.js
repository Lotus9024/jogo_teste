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

    effects.push({
      effect,
      age: 0,
      duration: 1.05
    });
  }

  function update(delta) {
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const item = effects[index];
      item.age += delta;
      const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const summonProgress = reduced ? 1 : Math.min(1, item.age / 0.28);
      const fade = item.age > 0.45 ? Math.max(0, 1 - (item.age - 0.45) / 0.60) : 1;
      const eased = 1 - Math.pow(1 - summonProgress, 3);
      const puddle = item.effect.getObjectByName('acidPuddle');
      const ring = item.effect.getObjectByName('acidRing');
      puddle?.scale.setScalar(0.08 + eased * 0.92);
      ring?.scale.setScalar(0.08 + eased * 0.92);
      if (puddle) puddle.material.opacity = 0.25 * fade;
      if (ring) {
        ring.material.opacity = 0.45 * fade;
        ring.rotation.z += reduced ? 0 : delta * 0.3;
      }
      item.effect.traverse(part => {
        if (!part.userData.acidDrop) return;
        part.visible = !reduced;
        part.position.y = 0.08 + Math.abs(Math.sin(item.age * 4 + part.userData.phase)) * 0.08 * (1 - summonProgress * 0.55);
        part.material.opacity = 0.4 * fade;
      });

      if (item.age < item.duration) continue;
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
