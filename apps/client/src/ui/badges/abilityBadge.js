import { createCanvasBadge } from './createCanvasBadge.js';

const BADGE_APPEARANCE = Object.freeze({
  acid: { icon: '☣', tone: 'arcane' },
  tower: { icon: '✦', tone: 'gold' },
  goblin_tower: { icon: '♟', tone: 'goblin' },
  goblin_clone: { icon: '✚', tone: 'goblin' },
  goblin_house: { icon: '♟', tone: 'goblin' },
  goblin_altar: { icon: '♨', tone: 'goblin' },
  mage_altar: { icon: '✧', tone: 'arcane' },
  goblin_bomber: { icon: '✹', tone: 'danger' },
});

const BADGE_NAME = Object.freeze({
  acid: 'acidAbilityBadge',
  tower: 'towerAbilityBadge',
  goblin_tower: 'goblinTowerAbilityBadge',
  goblin_clone: 'goblinCloneAbilityBadge',
  goblin_house: 'goblinHouseAbilityBadge',
  goblin_altar: 'goblinAltarAbilityBadge',
  mage_altar: 'mageAltarAbilityBadge',
  goblin_bomber: 'goblinBomberAbilityBadge',
});

function badgeColors(tone, loading, enabled) {
  if (loading) return { fill: 'rgba(13, 17, 16, .9)', stroke: '#65706b', text: '#78817d' };
  if (!enabled) return { fill: 'rgba(30, 31, 28, .94)', stroke: '#746f63', text: '#817d73' };
  if (tone === 'arcane') return { fill: 'rgba(42, 27, 64, .95)', stroke: '#c09aff', text: '#e0c8ff' };
  if (tone === 'danger') return { fill: 'rgba(66, 28, 18, .95)', stroke: '#ff9a65', text: '#ffd09c' };
  if (tone === 'goblin') return { fill: 'rgba(28, 48, 28, .94)', stroke: '#84ef78', text: '#a7ff8d' };
  return { fill: 'rgba(54, 39, 17, .94)', stroke: '#efc76d', text: '#ffe19a' };
}

function drawAbilityBadge(sprite, { remaining = 0, enabled = false } = {}) {
  const { canvas, context, texture, abilityTrigger } = sprite.userData;
  const loading = remaining > 0;
  const appearance = BADGE_APPEARANCE[abilityTrigger] ?? BADGE_APPEARANCE.tower;
  const colors = badgeColors(appearance.tone, loading, enabled);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  context.arc(48, 48, 38, 0, Math.PI * 2);
  context.fillStyle = colors.fill;
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = colors.stroke;
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 42px "Segoe UI Symbol", Georgia, serif';
  context.fillStyle = colors.text;
  context.fillText(appearance.icon, 48, 49);
  if (loading) {
    context.beginPath();
    context.arc(48, 48, 43, -Math.PI / 2, -Math.PI / 2 + Math.PI * (3 / 2));
    context.lineWidth = 5;
    context.strokeStyle = appearance.tone === 'arcane' ? '#9c78d7'
      : appearance.tone === 'danger' ? '#d77d51'
        : appearance.tone === 'goblin' ? '#79c96d' : '#c89f4f';
    context.stroke();
    context.font = 'bold 22px Arial';
    context.fillStyle = '#fff7df';
    context.fillText(String(remaining), 73, 73);
  }
  sprite.userData.loading = loading;
  sprite.userData.enabled = enabled;
  texture.needsUpdate = true;
}

export function abilityTriggerForUnit(unit) {
  return unit.userData.cardId === 'mage'
    ? 'acid'
    : unit.userData.cardId === 'tower'
      ? 'tower'
      : unit.userData.cardId === 'goblin_tower'
        ? 'goblin_tower'
        : unit.userData.isGoblinClone
            ? 'goblin_clone'
          : unit.userData.cardId === 'goblin_house'
            ? 'goblin_house'
            : ['goblin_altar', 'mage_altar', 'goblin_bomber'].includes(unit.userData.cardId)
              ? unit.userData.cardId
              : null;
}

export function ensureAbilityBadge(unit) {
  const abilityTrigger = abilityTriggerForUnit(unit);
  if (!abilityTrigger) return null;
  const name = BADGE_NAME[abilityTrigger];
  let badge = unit.getObjectByName(name);
  if (badge) return badge;
  badge = createCanvasBadge({
    name,
    canvasSize: 96,
    position: [abilityTrigger === 'acid' || abilityTrigger === 'goblin_clone' ? -0.72 : 0.72, abilityTrigger === 'acid' || abilityTrigger === 'goblin_clone' ? 0.48 : 0.38, 0],
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
  units.forEach(unit => unit.children.filter(child => child.userData.abilityTrigger).forEach(badge => {
    badge.material.opacity = badge.userData.loading ? 0.72 + Math.sin(time * 5) * 0.18 : 1;
  }));
}
