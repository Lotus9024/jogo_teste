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

test('preferências inválidas ou armazenamento bloqueado não impedem abrir o jogo', () => {
  for (const value of ['null', '[]', 'false', '{invalid']) {
    const settings = loadGameSettings({ getItem: () => value }, { deviceMemory: 4 });
    assert.equal(settings.graphics, 'low');
    assert.equal(settings.cameraCentering, true);
  }
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(loadGameSettings(blocked, { deviceMemory: 4 }).graphics, 'low');
  assert.doesNotThrow(() => saveGameSettings({ graphics: 'high' }, blocked));
});

test('densidade de pixel inválida nunca produz canvas negativo ou infinito', () => {
  for (const ratio of [-2, 0, NaN, Infinity, 'bad']) {
    assert.equal(pixelRatioForQuality('high', ratio), 1);
    assert.equal(pixelRatioForQuality('low', ratio), 0.85);
  }
});
