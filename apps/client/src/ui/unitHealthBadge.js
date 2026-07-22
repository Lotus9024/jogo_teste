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

function drawAbilityBadge(sprite, { remaining = 0, enabled = false } = {}) {
  const { canvas, context, texture, abilityTrigger } = sprite.userData;
  const loading = remaining > 0;
  const acid = abilityTrigger === 'acid';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  context.arc(48, 48, 38, 0, Math.PI * 2);
  context.fillStyle = loading ? 'rgba(13, 17, 16, .9)' : acid ? 'rgba(28, 48, 28, .94)' : 'rgba(54, 39, 17, .94)';
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = loading ? '#65706b' : enabled ? (acid ? '#84ef78' : '#efc76d') : '#746f63';
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = acid ? 'bold 42px "Segoe UI Symbol", Arial' : 'bold 44px Georgia, serif';
  context.fillStyle = loading ? '#78817d' : enabled ? (acid ? '#a7ff8d' : '#ffe19a') : '#817d73';
  context.fillText(acid ? '☣' : '✦', 48, 49);
  if (loading) {
    context.beginPath();
    context.arc(48, 48, 43, -Math.PI / 2, -Math.PI / 2 + Math.PI * (3 / 2));
    context.lineWidth = 5;
    context.strokeStyle = acid ? '#79c96d' : '#c89f4f';
    context.stroke();
    context.font = 'bold 22px Arial';
    context.fillStyle = '#fff7df';
    context.fillText(String(remaining), 73, 73);
  }
  sprite.userData.loading = loading;
  sprite.userData.enabled = enabled;
  texture.needsUpdate = true;
}

export function ensureAbilityBadge(unit) {
  const abilityTrigger = unit.userData.cardId === 'mage' ? 'acid' : unit.userData.cardId === 'tower' ? 'tower' : null;
  if (!abilityTrigger) return null;
  const name = abilityTrigger === 'acid' ? 'acidAbilityBadge' : 'towerAbilityBadge';
  let badge = unit.getObjectByName(name);
  if (badge) return badge;
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
  badge.name = name;
  badge.position.set(0.72, abilityTrigger === 'acid' ? 0.48 : 0.38, 0);
  badge.scale.set(0.72, 0.72, 1);
  badge.renderOrder = 15;
  badge.userData = { canvas, context, texture, abilityTrigger, loading: false, enabled: false };
  unit.add(badge);
  drawAbilityBadge(badge);
  return badge;
}

export function setAbilityBadgeState(unit, state) {
  const badge = ensureAbilityBadge(unit);
  if (!badge) return;
  drawAbilityBadge(badge, state);
}

export function animateAbilityBadges(units, time) {
  units.forEach(unit => ['acidAbilityBadge', 'towerAbilityBadge'].forEach(name => {
    const badge = unit.getObjectByName(name);
    if (!badge) return;
    badge.material.opacity = badge.userData.loading ? 0.72 + Math.sin(time * 5) * 0.18 : 1;
  }));
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
  ensureAbilityBadge(unit);
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
