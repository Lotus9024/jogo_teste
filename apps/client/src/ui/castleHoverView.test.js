import assert from 'node:assert/strict';
import test from 'node:test';
import { castleHoverMarkup, castleProgressView } from './castleHoverView.js';

test('castelo nível um informa requisitos e vantagens reais do nível dois', () => {
  const progress = castleProgressView({ level: 1, citizens: 6, completedRoads: 1 });
  assert.equal(progress.nextLevel, 2);
  assert.deepEqual(progress.requirements.map(item => [item.current, item.target, item.met]), [
    [6, 8, false],
    [1, 1, true],
  ]);
  assert.match(progress.advantages.join(' '), /Energia máxima aumenta para 12/);
  assert.match(progress.advantages.join(' '), /15 casas/);
});

test('castelo evoluído não inventa uma progressão ainda não implementada', () => {
  const progress = castleProgressView({ level: 2, citizens: 12, completedRoads: 4 });
  assert.equal(progress.nextLevel, null);
  assert.equal(progress.requirements.length, 0);
  assert.match(progress.message, /máximo implementado/i);
});

test('painel do castelo protege o nome do reino e exibe o nível atual', () => {
  const markup = castleHoverMarkup({
    kingdomName: '<Reino Arcano>',
    castleName: 'Fortaleza',
    level: 1,
    hp: 8,
    maxHp: 10,
  });
  assert.match(markup, /&lt;Reino Arcano&gt;/);
  assert.doesNotMatch(markup, /<Reino Arcano>/);
  assert.match(markup, /NÍVEL 1/);
  assert.match(markup, /8\/10/);
});
