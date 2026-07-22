import { createCanvasBadge } from './createCanvasBadge.js';

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
  const abilityTrigger = unit.userData.cardId === 'mage'
    ? 'acid'
    : unit.userData.cardId === 'tower'
      ? 'tower'
      : null;
  if (!abilityTrigger) return null;
  const name = abilityTrigger === 'acid' ? 'acidAbilityBadge' : 'towerAbilityBadge';
  let badge = unit.getObjectByName(name);
  if (badge) return badge;
  badge = createCanvasBadge({
    name,
    canvasSize: 96,
    position: [abilityTrigger === 'acid' ? -0.72 : 0.72, abilityTrigger === 'acid' ? 0.48 : 0.38, 0],
    scale: 0.72,
    renderOrder: 15,
    depthTest: false,
    userData: { abilityTrigger, loading: false, enabled: false }
  });
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
