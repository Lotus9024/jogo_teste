import * as THREE from 'three';

export function createDamageEffects(scene) {
  const effects = [];

  function show(position, damage) {
    if (!Number.isFinite(damage) || damage <= 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const context = canvas.getContext('2d');
    context.font = '900 46px Arial'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.lineWidth = 8; context.strokeStyle = 'rgba(35, 4, 4, .92)'; context.strokeText(`-${damage}`, 64, 32);
    context.fillStyle = '#ff4b3e'; context.fillText(`-${damage}`, 64, 32);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position); sprite.position.y += 2.6; sprite.scale.set(1.45, .72, 1); sprite.renderOrder = 30;
    scene.add(sprite); effects.push({ sprite, material, texture, age: 0 });
  }

  function update(delta) {
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const effect = effects[index]; effect.age += delta; effect.sprite.position.y += delta * .9;
      effect.material.opacity = Math.max(0, 1 - effect.age / 1.05);
      if (effect.age >= 1.05) {
        scene.remove(effect.sprite); effect.material.dispose(); effect.texture.dispose(); effects.splice(index, 1);
      }
    }
  }

  return { show, update };
}
