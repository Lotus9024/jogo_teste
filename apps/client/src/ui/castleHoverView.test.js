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
  assert.match(progress.advantages.join(' '), /lançamento expande 1 casa para cada lateral/);
});

test('castelo evoluído mostra o próximo nível sem inventar requisitos de partida', () => {
  const progress = castleProgressView({ level: 2, citizens: 12, completedRoads: 4 });
  assert.equal(progress.nextLevel, 3);
  assert.equal(progress.requirements.length, 0);
  assert.match(progress.requirementMessage, /planejamento/i);
  assert.deepEqual(progress.roadmap.map(item => item.status), ['completed', 'current', 'next', 'future']);
});

test('painel do castelo protege e separa os nomes do reino e do rei', () => {
  const markup = castleHoverMarkup({
    kingdomName: '<Reino Arcano>',
    rulerName: '<Rei Arcano>',
    castleName: 'Fortaleza',
    level: 1,
    hp: 8,
    maxHp: 10,
  });
  assert.match(markup, /&lt;Reino Arcano&gt;/);
  assert.match(markup, /&lt;Rei Arcano&gt;/);
  assert.doesNotMatch(markup, /<Reino Arcano>/);
  assert.doesNotMatch(markup, /<Rei Arcano>/);
  assert.match(markup, /NÍVEL 1/);
  assert.match(markup, /8\/10/);
  assert.match(markup, /LINHAGEM DO CASTELO/);
});
