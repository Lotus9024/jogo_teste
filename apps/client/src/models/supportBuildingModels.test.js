import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBuilderArea, makeGoblinAltar, makeMageAltar, setSupportConstructionState } from './unitModels.js';

test('altares e Área de construtor possuem modelos e estados de obra próprios', () => {
  for (const model of [makeGoblinAltar(), makeMageAltar(), makeBuilderArea()]) {
    assert.ok(model.getObjectByName('supportBuiltParts'));
    assert.ok(model.getObjectByName('supportConstructionParts'));
    setSupportConstructionState(model, true);
    assert.equal(model.getObjectByName('supportBuiltParts').visible, false);
    assert.equal(model.getObjectByName('supportConstructionParts').visible, true);
  }
});
