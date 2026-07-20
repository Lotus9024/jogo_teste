import * as THREE from 'three';

const TRANSITION_DURATION = 820;
const FINAL_HEIGHT = 17.2;
const FINAL_DEPTH = 5.4;
const FINAL_ZOOM = 1.05;

function smootherStep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

export function createCinematicCamera({ camera, controls, app }) {
  const startPosition = new THREE.Vector3();
  const startTarget = new THREE.Vector3();
  const finalPosition = new THREE.Vector3();
  const finalTarget = new THREE.Vector3(0, 0.18, 0);
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
    app.dataset.cameraFinal = 'top-down';
  }

  function focusBoard({ side = 1 } = {}) {
    startPosition.copy(camera.position);
    startTarget.copy(controls.target);
    startZoom = camera.zoom;
    finalPosition.set(0, FINAL_HEIGHT, FINAL_DEPTH * Math.sign(side || 1));
    startedAt = performance.now();
    duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 520 : TRANSITION_DURATION;
    active = true;
    controls.enabled = false;
    app.classList.add('camera-transitioning');
    app.dataset.cameraTransition = 'active';
    app.dataset.cameraFinal = 'moving';
    app.dataset.cameraFocusCount = String(Number(app.dataset.cameraFocusCount ?? 0) + 1);
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
