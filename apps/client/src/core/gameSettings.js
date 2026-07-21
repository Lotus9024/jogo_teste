export const GRAPHICS_QUALITY = Object.freeze({ LOW: 'low', HIGH: 'high' });

export function recommendedGraphicsQuality(device = {}) {
  const memory = Number(device.deviceMemory ?? 8);
  const cores = Number(device.hardwareConcurrency ?? 8);
  const width = Number(device.screenWidth ?? 1920);
  const pixelRatio = Number(device.devicePixelRatio ?? 1);
  return memory <= 4 || cores <= 4 || (width <= 1600 && pixelRatio > 1.25)
    ? GRAPHICS_QUALITY.LOW
    : GRAPHICS_QUALITY.HIGH;
}

export function loadGameSettings(storage = globalThis.localStorage, device = globalThis.navigator ?? {}) {
  let saved = {};
  try { saved = JSON.parse(storage?.getItem('tronos-game-settings') ?? '{}'); } catch {}
  const recommended = recommendedGraphicsQuality({
    deviceMemory: device.deviceMemory,
    hardwareConcurrency: device.hardwareConcurrency,
    screenWidth: globalThis.screen?.width,
    devicePixelRatio: globalThis.devicePixelRatio
  });
  return {
    graphics: Object.values(GRAPHICS_QUALITY).includes(saved.graphics) ? saved.graphics : recommended,
    cameraCentering: saved.cameraCentering !== false
  };
}

export function saveGameSettings(settings, storage = globalThis.localStorage) {
  try { storage?.setItem('tronos-game-settings', JSON.stringify(settings)); } catch {}
}
