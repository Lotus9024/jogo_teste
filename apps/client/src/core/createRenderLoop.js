import * as THREE from 'three';
import { animateAbilityBadges } from '../ui/unitHealthBadge.js';
import { pixelRatioForQuality } from './gameSettings.js';

export function createRenderLoop({
  renderer,
  scene,
  camera,
  controls,
  cameraTransition,
  damageEffects,
  mageEffects,
  battleAnimations,
  units,
  fireMeshes,
  wisps,
  fireLights,
  physicalDecks,
  alliedKeep,
  enemyKeep,
  updateDynamicLighting,
  updateTerrain,
  getSelfSeat,
  getGraphicsQuality,
  getDeckHoverSeat,
}) {
  const clock = new THREE.Clock();
  const enemyBaseTag = document.querySelector('.enemy-base-tag');
  const lobby = document.querySelector('#online-lobby');
  const baseTagPoint = new THREE.Vector3();
  let lastStatusUpdate = 0;
  let lastFrameAt = 0;
  let running = false;

  function positionEnemyStatus() {
    const target = getSelfSeat() === 2 ? alliedKeep : enemyKeep;
    target.getWorldPosition(baseTagPoint);
    baseTagPoint.y += 4.9;
    baseTagPoint.project(camera);
    enemyBaseTag.style.left = `${(baseTagPoint.x * 0.5 + 0.5) * innerWidth}px`;
    enemyBaseTag.style.top = `${(-baseTagPoint.y * 0.5 + 0.5) * innerHeight}px`;
    enemyBaseTag.style.visibility = baseTagPoint.z < 1 ? 'visible' : 'hidden';
  }

  function animate(frameAt = 0) {
    if (!running) return;
    requestAnimationFrame(animate);
    const frameInterval = document.hidden ? 250 : (lobby?.classList.contains('closed') ? 0 : 1000 / 30);
    if (frameAt - lastFrameAt < frameInterval) return;
    lastFrameAt = frameAt;
    const delta = clock.getDelta();
    const time = clock.elapsedTime;
    const quality = getGraphicsQuality();
    const deckHoverSeat = getDeckHoverSeat();

    controls.update();
    cameraTransition.update();
    damageEffects.update(delta);
    mageEffects.update(delta);
    battleAnimations.update(delta, time);
    animateAbilityBadges(units, time);
    if (time - lastStatusUpdate > (quality === 'low' ? 0.1 : 0.033)) {
      positionEnemyStatus();
      lastStatusUpdate = time;
    }

    physicalDecks.decks.forEach(deck => {
      const topCard = deck.userData.getTopCard();
      if (!topCard) return;
      const hovered = deck.userData.ownerSeat === deckHoverSeat;
      topCard.position.y = THREE.MathUtils.lerp(topCard.position.y, topCard.userData.restY + (hovered ? 0.22 : 0), 0.14);
      topCard.rotation.z = THREE.MathUtils.lerp(topCard.rotation.z, hovered ? -0.08 : 0, 0.12);
    });

    if (quality === 'high') {
      updateDynamicLighting(time);
      updateTerrain(time);
      units.forEach((unit, index) => {
        const rig = unit.getObjectByName('rig');
        rig.position.y = 0.18 + Math.sin(time * 1.35 + index * 1.7) * 0.012;
        rig.rotation.z = Math.sin(time * 0.8 + index) * 0.006;
        unit.traverse(object => {
          if (object.userData.magic) object.rotation.y = time * 1.5;
        });
      });
      fireMeshes.forEach(group => group.traverse(object => {
        if (!object.userData.flame) return;
        object.scale.y = 0.86 + Math.sin(time * 8 + object.userData.phase) * 0.16;
        object.rotation.y = time * 1.7 + object.userData.phase;
      }));
      wisps.forEach((wisp, index) => {
        wisp.position.x = wisp.userData.baseX + Math.sin(time * 0.12 + index) * 0.55;
        wisp.material.opacity = 0.018 + index * 0.003 + Math.sin(time * 0.35 + index) * 0.004;
      });
      fireLights.forEach((light, index) => {
        const pulse = 0.91
          + Math.sin(time * 7.4 + light.userData.phase) * 0.065
          + Math.sin(time * 13.1 + index) * 0.025;
        light.intensity = light.userData.baseIntensity * pulse;
      });
    }
    renderer.render(scene, camera);
  }

  function resize() {
    const aspect = innerWidth / innerHeight;
    const view = innerWidth < 700 ? 12.6 : 11.45;
    camera.left = -view * aspect;
    camera.right = view * aspect;
    camera.top = view;
    camera.bottom = -view;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(pixelRatioForQuality(getGraphicsQuality()));
  }

  function start() {
    if (running) return;
    running = true;
    addEventListener('resize', resize);
    resize();
    animate();
    setTimeout(() => document.querySelector('.loading').classList.add('done'), 500);
  }

  return { resize, start };
}
