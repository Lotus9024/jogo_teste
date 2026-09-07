export const GRAPHICS_QUALITY = Object.freeze({ LOW: 'low', HIGH: 'high' });

export function bootGraphicsQuality() {
  return GRAPHICS_QUALITY.LOW;
}

export function pixelRatioForQuality(quality, pixelRatio = globalThis.devicePixelRatio ?? 1) {
  const ratio = Number(pixelRatio);
  return Math.min(Number.isFinite(ratio) && ratio > 0 ? ratio : 1, quality === GRAPHICS_QUALITY.LOW ? 0.85 : 1.3);
}

export function recommendedGraphicsQuality(device = {}) {
  const memory = Number(device.deviceMemory ?? 8);
  const cores = Number(device.hardwareConcurrency ?? 8);
  const width = Number(device.screenWidth ?? 1920);
  const pixelRatio = Number(device.devicePixelRatio ?? 1);
  return memory <= 4 || cores <= 4 || (width <= 1600 && pixelRatio > 1.25)
    ? GRAPHICS_QUALITY.LOW
    : GRAPHICS_QUALITY.HIGH;
}

function resolveStorage(storage) {
  // Some embedded/private browsing contexts throw when reading localStorage itself.
  try { return storage === undefined ? globalThis.localStorage : storage; } catch { return null; }
}

export function loadGameSettings(storage, device = globalThis.navigator ?? {}) {
  let saved = {};
  try {
    const parsed = JSON.parse(resolveStorage(storage)?.getItem('tronos-game-settings') ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed;
  } catch {}
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

export function saveGameSettings(settings, storage) {
  try { resolveStorage(storage)?.setItem('tronos-game-settings', JSON.stringify(settings)); } catch {}
}
