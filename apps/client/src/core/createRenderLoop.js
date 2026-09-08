import * as THREE from 'three';
import { animateAbilityBadges } from '../ui/unitHealthBadge.js';
import { pixelRatioForQuality } from './gameSettings.js';
import { createAmbientAnimation } from './createAmbientAnimation.js';
import { createShadowInvalidation } from './createShadowInvalidation.js';
import { fitGameViewport } from './fitGameViewport.js';

export function createRenderLoop({
  renderer, scene, camera, controls, cameraTransition, damageEffects, mageEffects,
  battleAnimations, units, fireMeshes, wisps, fireLights, physicalDecks,
  alliedKeep, enemyKeep, updateDynamicLighting, updateTerrain,
  keeps = [alliedKeep, enemyKeep],
  getSelfSeat, getGraphicsQuality, getDeckHoverSeat,
  environment = globalThis,
}) {
  const { document } = environment;
  const enemyBaseTag = document.querySelector('.enemy-base-tag');
  const lobby = document.querySelector('#online-lobby');
  const loading = document.querySelector('.loading');
  const baseTagPoint = new THREE.Vector3();
  const ambient = createAmbientAnimation({ units, fireMeshes, wisps, fireLights, physicalDecks });
  const shadows = createShadowInvalidation(renderer);
  const reducedMotion = environment.matchMedia?.('(prefers-reduced-motion: reduce)');
  let lastStatusUpdate = -Infinity;
  let lastFrameAt = null;
  let elapsed = 0;
  let frameId = null;
  let loadingTimer = null;
  let running = false;
  let disposed = false;
  let contextLost = false;

  function positionEnemyStatus() {
    const target = getSelfSeat() === 2 ? alliedKeep : enemyKeep;
    if (!enemyBaseTag || !target) return;
    const anchor = target.getObjectByName?.('castleStatusAnchor');
    if (anchor) anchor.getWorldPosition(baseTagPoint);
    else {
      target.getWorldPosition(baseTagPoint);
      baseTagPoint.y += 4.9;
    }
    baseTagPoint.project(camera);
    enemyBaseTag.style.left = ((baseTagPoint.x * 0.5 + 0.5) * environment.innerWidth) + 'px';
    enemyBaseTag.style.top = ((-baseTagPoint.y * 0.5 + 0.5) * environment.innerHeight) + 'px';
    enemyBaseTag.style.visibility = baseTagPoint.z >= -1 && baseTagPoint.z < 1 ? 'visible' : 'hidden';
  }

  function queueFrame() {
    if (running && !document.hidden && !contextLost && frameId === null) {
      frameId = environment.requestAnimationFrame(animate);
    }
  }

  function cancelFrame() {
    if (frameId !== null) environment.cancelAnimationFrame(frameId);
    frameId = null;
    lastFrameAt = null;
  }

  function animate(frameAt) {
    frameId = null;
    if (!running || document.hidden || contextLost) return;
    queueFrame();
    const interval = lobby?.classList.contains('closed') ? 0 : 1000 / 30;
    if (lastFrameAt !== null && frameAt - lastFrameAt < interval) return;
    // Clamp only presentation time. The server remains the source of game time.
    const delta = lastFrameAt === null ? 0 : Math.min((frameAt - lastFrameAt) / 1000, 0.1);
    lastFrameAt = frameAt;
    elapsed += delta;
    const quality = getGraphicsQuality();
    controls.update();
    cameraTransition.update();
    damageEffects.update(delta);
    mageEffects.update(delta);
    battleAnimations?.update(delta, elapsed);
    animateAbilityBadges(units, reducedMotion?.matches ? 0 : elapsed);
    if (elapsed - lastStatusUpdate > (quality === 'low' ? 0.1 : 0.033)) {
      positionEnemyStatus();
      lastStatusUpdate = elapsed;
    }
    ambient.updateDecks(getDeckHoverSeat(), delta);
    if (quality === 'high') {
      const ambientTime = reducedMotion?.matches ? 0 : elapsed;
      updateDynamicLighting(ambientTime);
      updateTerrain(ambientTime);
      ambient.update(ambientTime);
      shadows.update([...units, ...keeps.filter(Boolean)], elapsed);
    }
    renderer.render(scene, camera);
  }

  function resize() {
    const width = Math.max(1, environment.innerWidth);
    const height = Math.max(1, environment.innerHeight);
    fitGameViewport(camera, width, height);
    renderer.setPixelRatio(pixelRatioForQuality(getGraphicsQuality(), environment.devicePixelRatio));
    renderer.setSize(width, height);
    lastStatusUpdate = -Infinity;
  }

  function visibilityChanged() {
    cancelFrame();
    queueFrame();
  }

  function onContextLost(event) {
    event.preventDefault();
    contextLost = true;
    cancelFrame();
    renderer.domElement.dataset.renderStatus = 'recovering';
  }

  function onContextRestored() {
    contextLost = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.dataset.renderStatus = 'ready';
    resize();
    queueFrame();
  }

  function start() {
    if (running || disposed) return;
    running = true;
    environment.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibilityChanged);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);
    resize();
    queueFrame();
    loadingTimer = environment.setTimeout(() => loading?.classList.add('done'), 500);
  }

  function stop() {
    running = false;
    cancelFrame();
    environment.clearTimeout(loadingTimer);
    environment.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', visibilityChanged);
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
  }

  function dispose() {
    stop();
    disposed = true;
  }

  return { resize, start, stop, dispose, get running() { return running; } };
}
