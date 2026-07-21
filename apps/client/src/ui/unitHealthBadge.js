import * as THREE from 'three';

function drawHealthBadge(sprite, hp) {
  const { canvas, context, texture } = sprite.userData;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = 'bold 52px Arial';
  context.fillStyle = '#e3544a';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('♥', 32, 34);
  context.font = 'bold 20px Arial';
  context.fillStyle = '#fff7e8';
  context.fillText(String(Math.max(0, hp)), 32, 32);
  texture.needsUpdate = true;
}

export function ensureHealthBadge(unit) {
  let badge = unit.getObjectByName('healthBadge');
  if (!badge) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false });
    badge = new THREE.Sprite(material);
    badge.name = 'healthBadge';
    badge.position.set(0.68, unit.userData.cardType === 'construction' || unit.userData.cardType === 'machine' ? 2.15 : 2.95, 0);
    badge.scale.set(0.9, 0.9, 1);
    badge.renderOrder = 12;
    badge.userData = { canvas, context, texture };
    unit.add(badge);
  }
  drawHealthBadge(badge, unit.userData.hp);
  return badge;
}

export function updateHealthBadge(unit) {
  const badge = unit.getObjectByName('healthBadge');
  if (badge) drawHealthBadge(badge, unit.userData.hp);
}
