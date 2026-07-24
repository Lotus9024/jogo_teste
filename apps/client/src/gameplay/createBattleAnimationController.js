import * as THREE from 'three';

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

  for (let index = 0; index < 30; index += 1) {
    const flake = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.035 + index % 4 * 0.009, 0),
      ICE_MATERIAL.clone(),
    );
    const angle = index / 30 * Math.PI * 2;
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
}) {
  const motions = [];
  const arrows = [];
  const bursts = [];
  const cloneEffects = [];
  const stormGroups = new Map();
  const seenEffects = new Set();
  const protectedUnitIds = new Set();
  let localStormSequence = 0;

  const worldPoint = (x, z, y = 0.06) => new THREE.Vector3(x * tile - half, y, z * tile - half);

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
      duration,
      charge,
      startTilt: unit.rotation.z,
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
    for (let index = 0; index < 12; index += 1) {
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.075, 0),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
      );
      const angle = index / 12 * Math.PI * 2;
      shard.userData.direction = new THREE.Vector3(Math.cos(angle), 0.32 + index % 3 * 0.12, Math.sin(angle)).normalize();
      group.add(shard);
    }
    scene.add(group);
    bursts.push({ group, ring, age: 0, duration: 0.72 });
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
      const end = start.clone().add(new THREE.Vector3(dx * tile * range, -0.7, dz * tile * range));
      const arrow = createArrow();
      arrow.position.copy(start);
      const direction = end.clone().sub(start).normalize();
      arrow.quaternion.setFromUnitVectors(UP, direction);
      scene.add(arrow);
      arrows.push({ arrow, start: start.clone(), end, age: 0, duration: 0.44 });
    }
  }

  function spawnClone(unit) {
    if (!unit || unit.userData.cloneAnimating) return;
    unit.userData.cloneAnimating = true;
    const targetScale = unit.scale.clone();
    unit.scale.setScalar(0.035);
    const spectral = new THREE.Group();
    spectral.position.copy(unit.position);
    spectral.position.y = 0.08;
    for (let index = 0; index < 3; index += 1) {
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
    for (let index = 0; index < 10; index += 1) {
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.045, 0),
        new THREE.MeshBasicMaterial({ color: 0x75dcff, transparent: true, opacity: 0.86 }),
      );
      const angle = index / 10 * Math.PI * 2;
      shard.position.set(Math.cos(angle) * 0.38, 0.15 + index % 5 * 0.21, Math.sin(angle) * 0.38);
      spectral.add(shard);
    }
    scene.add(spectral);
    cloneEffects.push({ unit, targetScale, spectral, age: 0, duration: 0.9 });
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
    const position = worldPoint(x, z, 0.12);
    const group = new THREE.Group();
    group.position.copy(position);
    for (let index = 0; index < 22; index += 1) {
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.04 + index % 3 * 0.012, 0),
        ICE_MATERIAL.clone(),
      );
      const angle = index / 22 * Math.PI * 2;
      shard.userData.direction = new THREE.Vector3(
        Math.cos(angle) * (0.45 + index % 4 * 0.13),
        0.55 + index % 5 * 0.12,
        Math.sin(angle) * (0.45 + index % 4 * 0.13),
      );
      group.add(shard);
    }
    scene.add(group);
    bursts.push({ group, ring: null, age: 0, duration: 0.9, blizzard: true, radius });
  }

  function preserveIdsForEffects(effects = []) {
    const ids = new Set();
    for (const effect of effects) {
      if (seenEffects.has(effect.id) || effect.type !== 'goblin_bomber_charge') continue;
      ids.add(effect.unitId);
    }
    return ids;
  }

  function processServerEffects(effects = []) {
    for (const effect of effects) {
      if (!effect?.id || seenEffects.has(effect.id)) continue;
      seenEffects.add(effect.id);
      if (effect.type === 'tower_arrow_volley') {
        launchTowerVolley(worldPoint(effect.x, effect.z, 0.06), effect.range ?? 3);
      }
      if (effect.type === 'blizzard_cast') {
        burstBlizzard(effect.x, effect.z, effect.radius ?? 1);
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
    if (seenEffects.size > 160) {
      const retained = [...seenEffects].slice(-80);
      seenEffects.clear();
      retained.forEach(id => seenEffects.add(id));
    }
  }

  function update(delta, time) {
    for (let index = motions.length - 1; index >= 0; index -= 1) {
      const motion = motions[index];
      motion.elapsed += delta;
      const raw = Math.min(1, motion.elapsed / motion.duration);
      const progress = motion.charge ? raw * raw : easeInOutCubic(raw);
      motion.unit.position.lerpVectors(motion.start, motion.end, progress);
      motion.unit.position.y = THREE.MathUtils.lerp(motion.start.y, motion.end.y, progress);
      motion.unit.rotation.z = motion.startTilt + Math.sin(raw * Math.PI) * (motion.charge ? -0.16 : -0.045);
      if (raw < 1) continue;
      motion.unit.position.copy(motion.end);
      motion.unit.rotation.z = motion.startTilt;
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

    for (let index = bursts.length - 1; index >= 0; index -= 1) {
      const burst = bursts[index];
      burst.age += delta;
      const progress = Math.min(1, burst.age / burst.duration);
      if (burst.ring) burst.ring.scale.setScalar(1 + progress * 7);
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
      effect.unit.scale.copy(effect.targetScale).multiplyScalar(Math.max(0.05, reveal));
      effect.spectral.rotation.y += delta * 4.2;
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
  }

  return {
    update,
    slideUnit,
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
