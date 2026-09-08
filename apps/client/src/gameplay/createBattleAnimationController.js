import * as THREE from 'three';
import { createUnitMotion } from './animation/createUnitMotion.js';

const UP = new THREE.Vector3(0, 1, 0);
const ARROW_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x5d4935,
  roughness: 0.72,
  metalness: 0.08,
  flatShading: true,
});
const ARROW_HEAD_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x9aa2a5,
  roughness: 0.42,
  metalness: 0.75,
  flatShading: true,
});
const ICE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x9fe7ff,
  emissive: 0x2d8cff,
  emissiveIntensity: 0.72,
  roughness: 0.28,
  metalness: 0.12,
  transparent: true,
  opacity: 0.82,
  flatShading: true,
});

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2;
}

function disposeGroup(group) {
  group.traverse(object => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.());
    else object.material?.dispose?.();
  });
}

function createArrow() {
  const arrow = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 6), ARROW_MATERIAL.clone());
  shaft.position.y = 0.03;
  arrow.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 6), ARROW_HEAD_MATERIAL.clone());
  head.position.y = 0.47;
  arrow.add(head);
  const feather = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.11, 0.025),
    new THREE.MeshStandardMaterial({ color: 0x6e2430, roughness: 0.9, flatShading: true }),
  );
  feather.position.y = -0.31;
  arrow.add(feather);
  return arrow;
}

function createArcaneProjectile() {
  const projectile = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.095, 1),
    new THREE.MeshStandardMaterial({
      color: 0xf2ccff,
      emissive: 0x7a22c8,
      emissiveIntensity: 2.4,
      roughness: 0.2,
      transparent: true,
      opacity: 0.95,
    }),
  );
  projectile.add(core);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.018, 6, 18),
    new THREE.MeshBasicMaterial({
      color: 0xc16cff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    }),
  );
  halo.rotation.x = Math.PI / 2;
  projectile.add(halo);
  return projectile;
}

function createSlashEffect() {
  const group = new THREE.Group();
  group.name = 'attackTrace';
  for (let index = 0; index < 1; index += 1) {
    const slash = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.012, 4, 18, Math.PI * 0.85),
      new THREE.MeshBasicMaterial({
        color: 0xe6d2a8,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    slash.rotation.set(Math.PI / 2, index ? -0.28 : 0.2, -0.6 + index * 0.28);
    group.add(slash);
  }
  return group;
}

function createSnowstormGroup(tile, radius) {
  const group = new THREE.Group();
  group.name = 'snowstormEffect';
  const reach = tile * (radius + 0.46);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(reach, 24),
    new THREE.MeshBasicMaterial({
      color: 0x78cfff,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  ground.name = 'snowstormGround';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.025;
  group.add(ground);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(reach * 0.78, 0.035, 6, 32),
    ICE_MATERIAL.clone(),
  );
  ring.name = 'snowstormRing';
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.09;
  group.add(ring);

  for (let index = 0; index < 8; index += 1) {
    const flake = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.035 + index % 4 * 0.009, 0),
      ICE_MATERIAL.clone(),
    );
    const angle = index / 8 * Math.PI * 2;
    const distance = reach * (0.2 + (index % 7) / 8);
    flake.position.set(Math.cos(angle) * distance, 0.18 + (index % 8) * 0.12, Math.sin(angle) * distance);
    flake.userData.snowflake = true;
    flake.userData.angle = angle;
    flake.userData.distance = distance;
    flake.userData.height = flake.position.y;
    flake.userData.phase = index * 0.71;
    group.add(flake);
  }
  return group;
}

export function createBattleAnimationController({
  scene,
  tile,
  half,
  units,
  hoverables,
  keeps = [],
  reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
}) {
  const motions = [];
  const arrows = [];
  const bursts = [];
  const cloneEffects = [];
  const unitMotion = createUnitMotion({ reducedMotion });
  const cues = new Map();
  const defeats = [];
  const slashEffects = [];
  const stormGroups = new Map();
  const seenEffects = new Set();
  const protectedUnitIds = new Set();
  let localStormSequence = 0;

  const worldPoint = (x, z, y = 0.06) => new THREE.Vector3(x * tile - half, y, z * tile - half);

  function reserveEffect(list, limit, getObject) {
    if (list.length < limit) return;
    const previous = list.shift();
    const object = getObject(previous);
    scene.remove(object);
    disposeGroup(object);
  }

  function cue(unit, color = 0xc7ac6a) {
    if (!unit) return;
    const previous = cues.get(unit);
    if (previous) {
      scene.remove(previous.mesh);
      disposeGroup(previous.mesh);
    }
    // One short ground outline per actor, capped even for a large army buff.
    if (cues.size >= 12 && !previous) return;
    const ring = new THREE.Mesh(new THREE.RingGeometry(tile * 0.33, tile * 0.345, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
    ring.name = 'unitActionCue';
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(unit.position);
    ring.position.y += 0.025;
    scene.add(ring);
    cues.set(unit, { mesh: ring, age: 0, duration: reducedMotion() ? 0.18 : 0.34 });
  }

  function playImpact(unit) {
    if (Number.isInteger(unit)) unit = keeps.find(keep => keep.userData.ownerSeat === unit);
    return unitMotion.play(unit, 'impact');
  }

  function playAbility(unit, { color = unit?.userData.cardId === 'mage' ? 0x8da883 : 0xc7ac6a } = {}) {
    if (!unit) return false;
    unitMotion.play(unit, 'ability');
    cue(unit, color);
    return true;
  }

  function spawnUnit(unit) {
    if (!unit || unit.userData.cloneAnimating) return false;
    unitMotion.play(unit, 'spawn', { duration: 0.26 });
    cue(unit, 0xbfc7b0);
    return true;
  }

  function playDefeat(unit) {
    if (!unit) return;
    unitMotion.cancel(unit);
    if (reducedMotion() || defeats.length >= 8) return;
    const echo = unit.clone(true);
    echo.name = 'unitDefeatEcho';
    const materials = new Map();
    echo.traverse(part => {
      if (part.isSprite || part.isLight) part.visible = false;
      part.castShadow = false;
      if (!part.material) return;
      const copy = material => {
        if (!materials.has(material)) {
          const clone = material.clone();
          clone.transparent = true;
          clone.depthWrite = false;
          materials.set(material, clone);
        }
        return materials.get(material);
      };
      part.material = Array.isArray(part.material) ? part.material.map(copy) : copy(part.material);
    });
    scene.add(echo);
    defeats.push({ echo, materials: [...materials.values()], age: 0, y: echo.position.y });
  }

  function slideUnit(unit, destination, {
    duration = 0.46,
    charge = false,
    onComplete = null,
  } = {}) {
    if (!unit || !destination) return false;
    for (let index = motions.length - 1; index >= 0; index -= 1) {
      if (motions[index].unit === unit) motions.splice(index, 1);
    }
    const start = unit.position.clone();
    const end = destination.clone();
    if (start.distanceToSquared(end) < 0.0001) {
      unit.position.copy(end);
      onComplete?.();
      return false;
    }
    unit.userData.isMoving = true;
    motions.push({
      unit,
      start,
      end,
      elapsed: 0,
      duration: reducedMotion() ? Math.min(duration, 0.16) : duration,
      charge,
      distance: start.distanceTo(end) / tile,
      onComplete,
    });
    return true;
  }

  function removeAnimatedUnit(unit) {
    if (!unit) return;
    const unitIndex = units.indexOf(unit);
    if (unitIndex >= 0) units.splice(unitIndex, 1);
    const hoverIndex = hoverables.indexOf(unit);
    if (hoverIndex >= 0) hoverables.splice(hoverIndex, 1);
    scene.remove(unit);
  }

  function explodeAt(position, color = 0xff6b24) {
    reserveEffect(bursts, 4, effect => effect.group);
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y = 0.16;
    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.065, 6, 24), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    for (let index = 0; index < (reducedMotion() ? 0 : 6); index += 1) {
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.075, 0),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
      );
      const angle = index / 6 * Math.PI * 2;
      shard.userData.direction = new THREE.Vector3(Math.cos(angle), 0.32 + index % 3 * 0.12, Math.sin(angle)).normalize();
      group.add(shard);
    }
    scene.add(group);
    bursts.push({ group, ring, age: 0, duration: reducedMotion() ? 0.16 : 0.38 });
  }

  function chargeGoblin(unit, destination, onImpact) {
    if (!unit) {
      onImpact?.();
      return;
    }
    slideUnit(unit, destination, {
      duration: 0.28,
      charge: true,
      onComplete: () => {
        explodeAt(destination);
        onImpact?.();
      },
    });
  }

  function launchTowerVolley(origin, range = 3) {
    const start = origin.clone();
    start.y += start.y > 0.5 ? 0.35 : 1.22;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      reserveEffect(arrows, 16, effect => effect.arrow);
      const end = start.clone().add(new THREE.Vector3(dx * tile * range, -0.7, dz * tile * range));
      const arrow = createArrow();
      arrow.position.copy(start);
      const direction = end.clone().sub(start).normalize();
      arrow.quaternion.setFromUnitVectors(UP, direction);
      scene.add(arrow);
      arrows.push({ arrow, start: start.clone(), end, age: 0, duration: reducedMotion() ? 0.12 : 0.44 });
    }
  }

  function playAttack(unit, targetPosition, cardId = unit?.userData.cardId) {
    if (!unit || !targetPosition) return false;
    unitMotion.play(unit, 'attack', { targetPosition });

    if (['archer', 'cannon', 'mage'].includes(cardId)) {
      reserveEffect(arrows, 16, effect => effect.arrow);
      const start = unit.position.clone();
      const muzzle = unit.getObjectByName(cardId === 'cannon' ? 'cannonMuzzle' : cardId === 'archer' ? 'archerBow' : 'mageFireOrb');
      if (muzzle) muzzle.getWorldPosition(start);
      else start.y += cardId === 'cannon' ? 0.68 : 0.92;
      const end = targetPosition.clone();
      end.y = Math.max(0.4, end.y + 0.5);
      const projectile = cardId === 'archer' ? createArrow() : cardId === 'mage' ? createArcaneProjectile()
        : new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), ARROW_HEAD_MATERIAL.clone());
      projectile.name = cardId + 'AttackProjectile';
      projectile.position.copy(start);
      projectile.quaternion.setFromUnitVectors(UP, end.clone().sub(start).normalize());
      scene.add(projectile);
      arrows.push({
        arrow: projectile,
        start,
        end,
        age: 0,
        duration: reducedMotion() ? 0.12 : cardId === 'cannon' ? 0.38 : 0.3,
      });
      return true;
    }

    reserveEffect(slashEffects, 8, effect => effect.group);
    const slash = createSlashEffect();
    if (reducedMotion()) slash.visible = false;
    slash.position.copy(targetPosition);
    slash.position.y = Math.max(0.32, slash.position.y + 0.34);
    scene.add(slash);
    slashEffects.push({ group: slash, age: 0, duration: reducedMotion() ? 0.12 : 0.24 });
    return true;
  }

  function spawnClone(unit) {
    if (!unit || unit.userData.cloneAnimating) return;
    unit.userData.cloneAnimating = true;
    const targetScale = unit.scale.clone();
    if (!reducedMotion()) unit.scale.setScalar(0.035);
    const spectral = new THREE.Group();
    spectral.position.copy(unit.position);
    spectral.position.y = 0.08;
    for (let index = 0; index < 1; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.24 + index * 0.12, 0.025, 6, 24),
        new THREE.MeshBasicMaterial({
          color: index === 1 ? 0x7bf0ff : 0x357eff,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = index * 0.42;
      spectral.add(ring);
    }
    for (let index = 0; index < (reducedMotion() ? 0 : 4); index += 1) {
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.045, 0),
        new THREE.MeshBasicMaterial({ color: 0x75dcff, transparent: true, opacity: 0.86 }),
      );
      const angle = index / 4 * Math.PI * 2;
      shard.position.set(Math.cos(angle) * 0.38, 0.15 + index % 5 * 0.21, Math.sin(angle) * 0.38);
      spectral.add(shard);
    }
    scene.add(spectral);
    cloneEffects.push({ unit, targetScale, spectral, age: 0, duration: reducedMotion() ? 0.14 : 0.48 });
  }

  function addSnowstorm(storm) {
    if (!storm || stormGroups.has(storm.id)) return;
    const group = createSnowstormGroup(tile, storm.radius ?? 1);
    group.position.copy(worldPoint(storm.x, storm.z, 0));
    group.userData.storm = { ...storm };
    scene.add(group);
    stormGroups.set(storm.id, group);
  }

  function reconcileSnowstorms(storms = []) {
    const next = new Set(storms.map(storm => storm.id));
    for (const [id, group] of stormGroups) {
      if (next.has(id)) continue;
      scene.remove(group);
      disposeGroup(group);
      stormGroups.delete(id);
    }
    storms.forEach(storm => {
      const existing = stormGroups.get(storm.id);
      if (existing) existing.userData.storm = { ...storm };
      else addSnowstorm(storm);
    });
  }

  function createLocalSnowstorm({ ownerSeat, targetSeat, x, z, radius = 1, remainingTurns = 2 }) {
    const storm = {
      id: `local-snowstorm-${++localStormSequence}`,
      ownerSeat,
      targetSeat,
      x,
      z,
      radius,
      remainingTurns,
    };
    addSnowstorm(storm);
    burstBlizzard(x, z, radius);
    return storm;
  }

  function localSnowstorms() {
    return [...stormGroups.values()]
      .map(group => group.userData.storm)
      .filter(storm => String(storm.id).startsWith('local-snowstorm-'));
  }

  function finishLocalSnowstormTurn(endingSeat) {
    const next = localSnowstorms().flatMap(storm => {
      if (storm.targetSeat !== endingSeat) return [storm];
      const remainingTurns = storm.remainingTurns - 1;
      return remainingTurns > 0 ? [{ ...storm, remainingTurns }] : [];
    });
    reconcileSnowstorms(next);
  }

  function burstBlizzard(x, z, radius = 1) {
    reserveEffect(bursts, 4, effect => effect.group);
    const position = worldPoint(x, z, 0.12);
    const group = new THREE.Group();
    group.position.copy(position);
    for (let index = 0; index < (reducedMotion() ? 0 : 8); index += 1) {
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.04 + index % 3 * 0.012, 0),
        ICE_MATERIAL.clone(),
      );
      const angle = index / 8 * Math.PI * 2;
      shard.userData.direction = new THREE.Vector3(
        Math.cos(angle) * (0.45 + index % 4 * 0.13),
        0.55 + index % 5 * 0.12,
        Math.sin(angle) * (0.45 + index % 4 * 0.13),
      );
      group.add(shard);
    }
    scene.add(group);
    bursts.push({ group, ring: null, age: 0, duration: 0.42, blizzard: true, radius });
  }

  function preserveIdsForEffects(effects = []) {
    const ids = new Set();
    for (const effect of effects) {
      if (seenEffects.has(effect.id) || effect.type !== 'goblin_bomber_charge') continue;
      ids.add(effect.unitId);
    }
    return ids;
  }

  function processServerEffects(effects = [], { present = true } = {}) {
    for (const effect of effects) {
      if (!effect?.id || seenEffects.has(effect.id)) continue;
      seenEffects.add(effect.id);
      if (!present) continue;
      if (effect.type === 'tower_arrow_volley') {
        unitMotion.play(units.find(unit => unit.userData.serverUnitId === effect.unitId), 'attack');
        launchTowerVolley(worldPoint(effect.x, effect.z, 0.06), effect.range ?? 3);
      }
      if (effect.type === 'blizzard_cast') {
        burstBlizzard(effect.x, effect.z, effect.radius ?? 1);
      }
      if (effect.type === 'unit_attack') {
        const unit = units.find(candidate => candidate.userData.serverUnitId === effect.unitId);
        playAttack(unit, worldPoint(effect.toX, effect.toZ), effect.cardId);
      }
      if (effect.type === 'goblin_clone_spawn') {
        spawnClone(units.find(unit => unit.userData.serverUnitId === effect.unitId));
      }
      if (effect.type === 'goblin_bomber_charge') {
        const unit = units.find(candidate => candidate.userData.serverUnitId === effect.unitId);
        if (!unit) continue;
        protectedUnitIds.add(effect.unitId);
        chargeGoblin(unit, worldPoint(effect.toX, effect.toZ), () => {
          protectedUnitIds.delete(effect.unitId);
          removeAnimatedUnit(unit);
        });
      }
    }
  }

  function update(delta, time = 0) {
    for (let index = motions.length - 1; index >= 0; index -= 1) {
      const motion = motions[index];
      motion.elapsed += delta;
      const raw = Math.min(1, motion.elapsed / motion.duration);
      const progress = motion.charge ? raw * raw : easeInOutCubic(raw);
      motion.unit.position.lerpVectors(motion.start, motion.end, progress);
      motion.unit.position.y = THREE.MathUtils.lerp(motion.start.y, motion.end.y, progress);
      unitMotion.walk(motion.unit, raw, motion.distance, motion.charge);
      if (raw < 1) continue;
      motion.unit.position.copy(motion.end);
      motion.unit.userData.isMoving = false;
      motions.splice(index, 1);
      motion.onComplete?.();
    }

    for (let index = arrows.length - 1; index >= 0; index -= 1) {
      const projectile = arrows[index];
      projectile.age += delta;
      const progress = Math.min(1, projectile.age / projectile.duration);
      projectile.arrow.position.lerpVectors(projectile.start, projectile.end, progress);
      if (progress < 1) continue;
      scene.remove(projectile.arrow);
      disposeGroup(projectile.arrow);
      arrows.splice(index, 1);
    }

    for (let index = slashEffects.length - 1; index >= 0; index -= 1) {
      const slash = slashEffects[index];
      slash.age += delta;
      const progress = Math.min(1, slash.age / slash.duration);
      slash.group.scale.setScalar(0.85 + progress * 0.3);
      slash.group.rotation.y += delta * 1.2;
      slash.group.children.forEach(part => {
        part.material.opacity = Math.max(0, 0.65 * (1 - progress));
      });
      if (progress < 1) continue;
      scene.remove(slash.group);
      disposeGroup(slash.group);
      slashEffects.splice(index, 1);
    }

    for (let index = bursts.length - 1; index >= 0; index -= 1) {
      const burst = bursts[index];
      burst.age += delta;
      const progress = Math.min(1, burst.age / burst.duration);
      if (burst.ring) burst.ring.scale.setScalar(1 + progress * (reducedMotion() ? 0 : 3));
      burst.group.children.forEach((child, childIndex) => {
        if (child === burst.ring || !child.userData.direction) return;
        child.position.addScaledVector(child.userData.direction, delta * (burst.blizzard ? 1.65 : 2.8));
        child.rotation.x += delta * (3 + childIndex % 3);
        child.rotation.z += delta * (2 + childIndex % 4);
        if (child.material) child.material.opacity = 1 - progress;
      });
      if (burst.ring?.material) burst.ring.material.opacity = 1 - progress;
      if (progress < 1) continue;
      scene.remove(burst.group);
      disposeGroup(burst.group);
      bursts.splice(index, 1);
    }

    for (let index = cloneEffects.length - 1; index >= 0; index -= 1) {
      const effect = cloneEffects[index];
      effect.age += delta;
      const progress = Math.min(1, effect.age / effect.duration);
      const reveal = easeInOutCubic(Math.min(1, progress * 1.25));
      effect.unit.scale.copy(effect.targetScale).multiplyScalar(reducedMotion() ? 1 : Math.max(0.05, reveal));
      effect.spectral.rotation.y += reducedMotion() ? 0 : delta * 1.5;
      effect.spectral.scale.setScalar(0.55 + progress * 0.85);
      effect.spectral.traverse(part => {
        if (part.material?.transparent) part.material.opacity = Math.max(0, 0.9 * (1 - progress));
      });
      if (progress < 1) continue;
      effect.unit.scale.copy(effect.targetScale);
      effect.unit.userData.cloneAnimating = false;
      scene.remove(effect.spectral);
      disposeGroup(effect.spectral);
      cloneEffects.splice(index, 1);
    }

    for (const group of stormGroups.values()) {
      if (reducedMotion()) continue;
      const ring = group.getObjectByName('snowstormRing');
      if (ring) {
        ring.rotation.z = time * 0.72;
        ring.material.opacity = 0.54 + Math.sin(time * 2.1) * 0.12;
      }
      group.children.forEach(part => {
        if (!part.userData.snowflake) return;
        const angle = part.userData.angle + time * (0.55 + part.userData.distance * 0.08);
        part.position.x = Math.cos(angle) * part.userData.distance;
        part.position.z = Math.sin(angle) * part.userData.distance;
        part.position.y = 0.12 + ((part.userData.height + time * 0.35 + part.userData.phase) % 1.18);
        part.rotation.x += delta * 1.8;
        part.rotation.y += delta * 2.3;
      });
    }

    unitMotion.update(delta);
    for (const [unit, effect] of cues) {
      effect.age += delta;
      const progress = Math.min(1, effect.age / effect.duration);
      effect.mesh.material.opacity = 0.5 * (1 - progress);
      effect.mesh.scale.setScalar(reducedMotion() ? 1 : 1 + progress * 0.15);
      if (progress < 1) continue;
      scene.remove(effect.mesh);
      disposeGroup(effect.mesh);
      cues.delete(unit);
    }
    for (let index = defeats.length - 1; index >= 0; index -= 1) {
      const effect = defeats[index];
      effect.age += delta;
      const progress = Math.min(1, effect.age / 0.24);
      effect.echo.position.y = effect.y - progress * 0.065;
      effect.materials.forEach(material => { material.opacity = 1 - progress; });
      if (progress < 1) continue;
      scene.remove(effect.echo);
      effect.materials.forEach(material => material.dispose());
      defeats.splice(index, 1);
    }
  }

  function clear() {
    motions.splice(0).forEach(motion => {
      motion.unit.position.copy(motion.end);
      motion.unit.userData.isMoving = false;
    });
    unitMotion.clear();
    for (const effect of [...arrows.map(item => item.arrow), ...bursts.map(item => item.group),
      ...slashEffects.map(item => item.group), ...cues.values()].map(item => item.mesh ?? item)) {
      scene.remove(effect);
      disposeGroup(effect);
    }
    arrows.length = bursts.length = slashEffects.length = 0;
    cues.clear();
    cloneEffects.splice(0).forEach(effect => {
      effect.unit.scale.copy(effect.targetScale);
      effect.unit.userData.cloneAnimating = false;
      scene.remove(effect.spectral);
      disposeGroup(effect.spectral);
    });
    defeats.splice(0).forEach(effect => {
      scene.remove(effect.echo);
      effect.materials.forEach(material => material.dispose());
    });
    reconcileSnowstorms([]);
    seenEffects.clear();
    protectedUnitIds.clear();
  }

  return {
    update,
    slideUnit,
    playAttack,
    playImpact,
    playAbility,
    spawnUnit,
    playDefeat,
    clear,
    chargeGoblin,
    launchTowerVolley,
    spawnClone,
    explodeAt,
    burstBlizzard,
    reconcileSnowstorms,
    createLocalSnowstorm,
    finishLocalSnowstormTurn,
    preserveIdsForEffects,
    processServerEffects,
    isUnitProtected: id => protectedUnitIds.has(id),
    worldPoint,
  };
}
