import { createCanvasBadge } from './createCanvasBadge.js';

function drawMageFireBadge(sprite, active = false, cooling = false) {
  const { canvas, context, texture } = sprite.userData;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '46px "Segoe UI Emoji", Arial';
  context.filter = cooling ? 'grayscale(1)' : 'none';
  context.shadowColor = cooling ? 'rgba(120, 125, 122, .25)' : active ? '#ffcf45' : 'rgba(255, 89, 25, .35)';
  context.shadowBlur = cooling ? 2 : active ? 18 : 5;
  context.globalAlpha = cooling ? 0.48 : active ? 1 : 0.72;
  context.fillText('🔥', 32, 34);
  context.globalAlpha = 1;
  context.shadowBlur = 0;
  context.filter = 'none';
  sprite.userData.cooling = cooling;
  texture.needsUpdate = true;
}

export function ensureMageFireBadge(unit) {
  if (unit.userData.cardId !== 'mage') return null;
  let badge = unit.getObjectByName('mageFireBadge');
  if (badge) return badge;
  badge = createCanvasBadge({
    name: 'mageFireBadge',
    canvasSize: 64,
    position: [-0.68, 2.95, 0],
    scale: 0.78,
    renderOrder: 13,
    depthTest: true,
    userData: { mageFireTrigger: true, active: false, cooling: false }
  });
  unit.add(badge);
  drawMageFireBadge(badge, false);
  return badge;
}

export function setMageFireBadgeActive(unit, active) {
  const badge = ensureMageFireBadge(unit);
  if (!badge || badge.userData.active === active) return;
  badge.userData.active = active;
  drawMageFireBadge(badge, active, badge.userData.cooling);
}

export function setMageFireBadgeCooling(unit, cooling) {
  const badge = ensureMageFireBadge(unit);
  if (!badge || badge.userData.cooling === cooling) return;
  drawMageFireBadge(badge, badge.userData.active, cooling);
}
