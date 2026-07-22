import * as THREE from 'three';

const TRANSITION_DURATION = 820;
const FINAL_LATERAL = 2.65;
const FINAL_HEIGHT = 14.6;
const FINAL_DEPTH = 10.4;
const FINAL_ZOOM = 1.03;
const FOCUS_POSITION_RANGE = 1.5;
const FOCUS_TARGET_RANGE = 0.35;
const FOCUS_ZOOM_RANGE = 0.12;

function smootherStep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

export function createCinematicCamera({ camera, controls, app }) {
  const startPosition = new THREE.Vector3();
  const startTarget = new THREE.Vector3();
  const finalPosition = new THREE.Vector3();
  const finalTarget = new THREE.Vector3(0, 0.32, 0);
  let startZoom = camera.zoom;
  let startedAt = 0;
  let duration = TRANSITION_DURATION;
  let active = false;

  function finish() {
    camera.position.copy(finalPosition);
    controls.target.copy(finalTarget);
    camera.zoom = FINAL_ZOOM;
    camera.updateProjectionMatrix();
    controls.update();
    controls.enabled = true;
    active = false;
    app.classList.remove('camera-transitioning');
    app.style.removeProperty('--camera-motion-blur');
    app.dataset.cameraTransition = 'complete';
    app.dataset.cameraFinal = 'three-quarter';
    app.dataset.cameraProgress = '1.000';
  }

  function isWithinFocusRange() {
    return camera.position.distanceToSquared(finalPosition) <= FOCUS_POSITION_RANGE ** 2
      && controls.target.distanceToSquared(finalTarget) <= FOCUS_TARGET_RANGE ** 2
      && Math.abs(camera.zoom - FINAL_ZOOM) <= FOCUS_ZOOM_RANGE;
  }

  function completeWithoutTransition() {
    active = false;
    controls.enabled = true;
    app.classList.remove('camera-transitioning');
    app.style.removeProperty('--camera-motion-blur');
    app.dataset.cameraTransition = 'complete';
    app.dataset.cameraFinal = 'three-quarter';
    app.dataset.cameraProgress = '1.000';
  }

  function focusBoard({ side = 1 } = {}) {
    const direction = Math.sign(side || 1);
    finalPosition.set(FINAL_LATERAL * direction, FINAL_HEIGHT, FINAL_DEPTH * direction);
    if (isWithinFocusRange()) {
      completeWithoutTransition();
      return false;
    }

    const offset = camera.position.clone().sub(controls.target);
    const polarAngle = Math.atan2(Math.hypot(offset.x, offset.z), Math.max(0.001, offset.y));
    if (polarAngle <= 0.3) {
      controls.enabled = true;
      app.classList.remove('camera-transitioning');
      app.style.removeProperty('--camera-motion-blur');
      app.dataset.cameraTransition = 'skipped-overhead';
      app.dataset.cameraFinal = 'three-quarter';
      app.dataset.cameraFocusSkipped = String(Number(app.dataset.cameraFocusSkipped ?? 0) + 1);
      return false;
    }
    startPosition.copy(camera.position);
    startTarget.copy(controls.target);
    startZoom = camera.zoom;
    startedAt = performance.now();
    duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 520 : TRANSITION_DURATION;
    active = true;
    controls.enabled = false;
    app.classList.add('camera-transitioning');
    app.dataset.cameraTransition = 'active';
    app.dataset.cameraFinal = 'moving';
    app.dataset.cameraFocusCount = String(Number(app.dataset.cameraFocusCount ?? 0) + 1);
    return true;
  }

  function cancel({ restoreControls = true } = {}) {
    if (!active) return;
    active = false;
    controls.enabled = restoreControls;
    app.classList.remove('camera-transitioning');
    app.style.removeProperty('--camera-motion-blur');
    app.dataset.cameraTransition = 'cancelled';
  }

  function update(now = performance.now()) {
    if (!active) return;
    const linearProgress = THREE.MathUtils.clamp((now - startedAt) / duration, 0, 1);
    const easedProgress = smootherStep(linearProgress);
    camera.position.lerpVectors(startPosition, finalPosition, easedProgress);
    controls.target.lerpVectors(startTarget, finalTarget, easedProgress);
    camera.zoom = THREE.MathUtils.lerp(startZoom, FINAL_ZOOM, easedProgress);
    camera.updateProjectionMatrix();
    controls.update();
    const blur = Math.sin(linearProgress * Math.PI) * 1.05;
    app.style.setProperty('--camera-motion-blur', `${blur.toFixed(2)}px`);
    app.dataset.cameraProgress = easedProgress.toFixed(3);
    if (linearProgress >= 1) finish();
  }

  return { focusBoard, cancel, update, get active() { return active; } };
}
