import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GRAPHICS_QUALITY,
  bootGraphicsQuality,
  loadGameSettings,
  pixelRatioForQuality,
  recommendedGraphicsQuality,
  saveGameSettings
} from './gameSettings.js';

test('inicia com renderização leve antes de carregar os detalhes escolhidos', () => {
  assert.equal(bootGraphicsQuality(), GRAPHICS_QUALITY.LOW);
  assert.equal(pixelRatioForQuality(GRAPHICS_QUALITY.LOW, 2), 0.85);
  assert.equal(pixelRatioForQuality(GRAPHICS_QUALITY.HIGH, 2), 1.3);
});

test('recomenda gráficos baixos para notebooks modestos', () => {
  assert.equal(recommendedGraphicsQuality({ deviceMemory: 4, hardwareConcurrency: 8, screenWidth: 1920, devicePixelRatio: 1 }), GRAPHICS_QUALITY.LOW);
  assert.equal(recommendedGraphicsQuality({ deviceMemory: 8, hardwareConcurrency: 4, screenWidth: 1920, devicePixelRatio: 1 }), GRAPHICS_QUALITY.LOW);
});

test('preserva as preferências escolhidas pelo jogador', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  saveGameSettings({ graphics: 'high', cameraCentering: false }, storage);
  assert.deepEqual(loadGameSettings(storage, { deviceMemory: 4, hardwareConcurrency: 4 }), { graphics: 'high', cameraCentering: false });
});
