import { saveGameSettings } from '../core/gameSettings.js';

export function createSettingsController({
  state,
  controls,
  cameraTransition,
  setSceneGraphicsQuality,
  setWorldGraphicsQuality,
  resize,
  callbacks,
}) {
  const modal = document.querySelector('#settings-modal');
  const toggle = document.querySelector('#settings-toggle');
  const closeButton = document.querySelector('#settings-close');
  let restoreControlsAfterSettings = true;

  function syncButtons() {
    document.querySelectorAll('[data-graphics]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.graphics === state.graphicsQuality));
    });
    document.querySelectorAll('[data-camera-centering]').forEach(button => {
      const enabled = button.dataset.cameraCentering === 'true';
      button.setAttribute('aria-pressed', String(enabled === state.cameraCentering));
    });
    callbacks.syncDevSettings?.();
  }

  function persist() {
    saveGameSettings({ graphics: state.graphicsQuality, cameraCentering: state.cameraCentering });
  }

  function applyGraphicsQuality(nextQuality) {
    state.graphicsQuality = nextQuality;
    setSceneGraphicsQuality(nextQuality);
    setWorldGraphicsQuality(nextQuality);
    resize();
    persist();
    syncButtons();
  }

  function open() {
    restoreControlsAfterSettings = controls.enabled;
    controls.enabled = false;
    modal.hidden = false;
    syncButtons();
    closeButton.focus();
  }

  function close() {
    modal.hidden = true;
    controls.enabled = restoreControlsAfterSettings && !cameraTransition.active;
    toggle.focus();
  }

  toggle.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  modal.addEventListener('click', event => {
    if (event.target === modal) close();
  });
  document.querySelectorAll('[data-graphics]').forEach(button => {
    button.addEventListener('click', () => applyGraphicsQuality(button.dataset.graphics));
  });
  document.querySelectorAll('[data-camera-centering]').forEach(button => {
    button.addEventListener('click', () => {
      state.cameraCentering = button.dataset.cameraCentering === 'true';
      if (!state.cameraCentering) cameraTransition.cancel();
      persist();
      syncButtons();
    });
  });
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) close();
  });
  syncButtons();

  return { syncButtons, applyGraphicsQuality };
}
