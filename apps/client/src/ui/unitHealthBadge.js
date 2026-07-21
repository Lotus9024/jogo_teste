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

function drawMageFireBadge(sprite, active = false) {
  const { canvas, context, texture } = sprite.userData;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '46px "Segoe UI Emoji", Arial';
  context.shadowColor = active ? '#ffcf45' : 'rgba(255, 89, 25, .35)';
  context.shadowBlur = active ? 18 : 5;
  context.globalAlpha = active ? 1 : 0.72;
  context.fillText('🔥', 32, 34);
  context.globalAlpha = 1;
  context.shadowBlur = 0;
  texture.needsUpdate = true;
}

function ensureMageFireBadge(unit) {
  if (unit.userData.cardId !== 'mage') return null;
  let badge = unit.getObjectByName('mageFireBadge');
  if (badge) return badge;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false }));
  badge.name = 'mageFireBadge';
  badge.position.set(-0.68, 2.95, 0);
  badge.scale.set(0.78, 0.78, 1);
  badge.renderOrder = 13;
  badge.userData = { canvas, context, texture, mageFireTrigger: true, active: false };
  unit.add(badge);
  drawMageFireBadge(badge, false);
  return badge;
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
  ensureMageFireBadge(unit);
  return badge;
}

export function updateHealthBadge(unit) {
  const badge = unit.getObjectByName('healthBadge');
  if (badge) drawHealthBadge(badge, unit.userData.hp);
}

export function setMageFireBadgeActive(unit, active) {
  const badge = ensureMageFireBadge(unit);
  if (!badge || badge.userData.active === active) return;
  badge.userData.active = active;
  drawMageFireBadge(badge, active);
}
