import assert from 'node:assert/strict';
import test from 'node:test';
import { GRAPHICS_QUALITY, loadGameSettings, recommendedGraphicsQuality, saveGameSettings } from './gameSettings.js';

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
