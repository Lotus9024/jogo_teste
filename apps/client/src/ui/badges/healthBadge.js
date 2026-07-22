import { createCanvasBadge } from './createCanvasBadge.js';

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

export function ensureBaseHealthBadge(unit) {
  let badge = unit.getObjectByName('healthBadge');
  if (!badge) {
    badge = createCanvasBadge({
      name: 'healthBadge',
      canvasSize: 64,
      position: [
        0.68,
        unit.userData.cardType === 'construction' || unit.userData.cardType === 'machine' ? 2.15 : 2.95,
        0
      ],
      scale: 0.9,
      renderOrder: 12,
      depthTest: true
    });
    unit.add(badge);
  }
  drawHealthBadge(badge, unit.userData.hp);
  return badge;
}

export function updateHealthBadge(unit) {
  const badge = unit.getObjectByName('healthBadge');
  if (badge) drawHealthBadge(badge, unit.userData.hp);
}
