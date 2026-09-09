import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  altarAbilityOptionsForSeat,
  analyzeSnapshot,
  attackOptionsForUnit,
  createModel,
  goblinBomberOptionsForSeat,
  goblinTowerOptionsForSeat,
  legalSummonCells,
  LOCAL_RULES_FINGERPRINT,
  movementOptionsForUnit,
  renderTextReport,
  towerVolleyOptionsForSeat
} from '../src/codex-advisor-core.mjs';
import { createReadOnlyStateClient, parseArgs, stateUrlForSource } from '../src/codex-advisor.mjs';

const future = Date.now() + 120_000;

function makePlayer(seat, overrides = {}) {
  return {
    id: `player-${seat}`,
    name: seat === 1 ? 'Azul' : 'Vermelho',
    seat,
    connected: true,
    baseHp: 10,
    energy: 10,
    maxEnergy: 10,
    citizens: 0,
    baseLevel: 1,
    handCount: 0,
    deckCount: 10,
    ...overrides
  };
}

function makeUnit(id, ownerSeat, cardId, x, z, overrides = {}) {
  const defaultHp = {
    warrior: 2,
    guard: 3,
    archer: 2,
    wooden_barrier: 3,
    tower: 5,
    operator: 1,
    cannon: 1,
    wooden_house: 1,
    mage: 2,
    henry: 1
  }[cardId] ?? 1;
  return {
    id,
    ownerSeat,
    cardId,
    x,
    z,
    hp: defaultHp,
    shield: 0,
    actionUsed: false,
    abilityUsed: false,
    instantUsedRound: 0,
    empowered: false,
    mountedOnTowerId: null,
    underConstruction: false,
    buildReadyRound: null,
    ...overrides
  };
}

function makeEnvelope({
  selfSeat = 1,
  activeSeat = selfSeat,
  units = [],
  roads = [],
  fires = [],
  hand = [],
  selfPlayer = {},
  enemyPlayer = {},
  phase = 'playing',
  version = 12
} = {}) {
  const enemySeat = selfSeat === 1 ? 2 : 1;
  return {
    connected: true,
    error: null,
    snapshot: {
      code: 'TESTE1',
      self: { id: `player-${selfSeat}`, seat: selfSeat, hand },
      state: {
        version,
        phase,
        round: 3,
        activeSeat,
        turnEndsAt: future,
        winnerSeat: null,
        board: { size: 15 },
        players: [
          makePlayer(selfSeat, { handCount: hand.length, ...selfPlayer }),
          makePlayer(enemySeat, enemyPlayer)
        ].sort((left, right) => left.seat - right.seat),
        units,
        roads,
        fires
      }
    }
  };
}

test('Torre Goblin oferece reforço em casas livres e o analisador recomenda a habilidade', () => {
  const tower = makeUnit('goblin-tower-1', 1, 'goblin_tower', 7, 10);
  const occupied = makeUnit('guard-1', 1, 'guard', 8, 10);
  const envelope = makeEnvelope({ units: [tower, occupied], selfPlayer: { energy: 10 } });
  const model = createModel(envelope);
  const options = goblinTowerOptionsForSeat(model, 1);

  assert.ok(options.some(option => option.cell.x === 7 && option.cell.z === 9 && option.spawnedHp === 2));
  assert.ok(!options.some(option => option.cell.x === 8 && option.cell.z === 10));
  assert.ok(!options.some(option => option.cell.x === 7 && option.cell.z === 14));

  const analysis = analyzeSnapshot(envelope, { top: 20 });
  assert.ok(analysis.recommendations.some(item => item.suggestion?.kind === 'goblin-reinforcement'));
});

test('analisador acompanha separadamente o movimento e o ataque de Henry', () => {
  const movedHenry = makeUnit('henry-moved', 1, 'henry', 6, 10, { movedThisTurn: true, attackedThisTurn: false });
  const enemy = makeUnit('henry-enemy', 2, 'guard', 6, 9);
  const movedModel = createModel(makeEnvelope({ units: [movedHenry, enemy] }));
  assert.equal(movementOptionsForUnit(movedModel, movedModel.units[0]).length, 0);
  assert.equal(attackOptionsForUnit(movedModel, movedModel.units[0]).length, 1);

  const attackedHenry = makeUnit('henry-attacked', 1, 'henry', 6, 10, { movedThisTurn: false, attackedThisTurn: true });
  const attackedModel = createModel(makeEnvelope({ units: [attackedHenry, enemy] }));
  assert.ok(movementOptionsForUnit(attackedModel, attackedModel.units[0]).length > 0);
  assert.equal(attackOptionsForUnit(attackedModel, attackedModel.units[0]).length, 0);
});

test('cliente de estado expõe somente leitura GET e normaliza /state', async () => {
  const calls = [];
  const envelope = makeEnvelope();
  const client = createReadOnlyStateClient({
    timeoutMs: 500,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return { ok: true, status: 200, json: async () => envelope };
    }
  });
  const result = await client.getState('http://127.0.0.1:4320');
  assert.equal(result, envelope);
  assert.deepEqual(Object.keys(client), ['getState']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(new URL(calls[0].url).pathname, '/state');
  assert.equal(stateUrlForSource('http://127.0.0.1:4174/spectator/spectator.html?source=http://127.0.0.1:4340').href, 'http://127.0.0.1:4340/state');
  assert.equal(stateUrlForSource('http://127.0.0.1:4340/state?nao=preservar#fragmento').href, 'http://127.0.0.1:4340/state');
  assert.throws(() => stateUrlForSource('https://example.com'), /fonte deve ser local/i);
});

test('flags que exigem valor falham cedo', () => {
  assert.throws(() => parseArgs(['--file']), /--file exige um valor/i);
  assert.throws(() => parseArgs(['--source']), /--source exige um valor/i);
  assert.throws(() => parseArgs(['--format']), /--format exige um valor/i);
  assert.throws(() => parseArgs(['--top']), /--top exige um valor/i);
});

test('Canhão operado detecta letal exato na base', () => {
  const units = [
    makeUnit('cannon-blue', 1, 'cannon', 7, 8),
    makeUnit('operator-blue', 1, 'operator', 7, 9)
  ];
  const standard = analyzeSnapshot(makeEnvelope({ units }), { top: 10 });
  assert.equal(standard.tactics.baseDamageNow.outgoing.attackers[0].shotsToKillAlone, 4);

  const analysis = analyzeSnapshot(makeEnvelope({ units, enemyPlayer: { baseHp: 3 } }), { top: 10 });
  assert.equal(analysis.tactics.baseDamageNow.outgoing.totalDamage, 3);
  assert.equal(analysis.tactics.baseDamageNow.outgoing.lethal, true);
  assert.equal(analysis.tactics.baseDamageNow.outgoing.minimumAttacksToLethal, 1);
  assert.equal(analysis.tactics.baseDamageNow.outgoing.attackers[0].shotsToKillAlone, 1);
  assert.ok(analysis.recommendations.some(item => item.title === 'Finalização legal disponível agora'
    && item.suggestion.actorUnitId === 'cannon-blue'));
});

test('fase encerrada não sugere nenhuma jogada', () => {
  const units = [
    makeUnit('cannon-blue', 1, 'cannon', 7, 8),
    makeUnit('operator-blue', 1, 'operator', 7, 9)
  ];
  const envelope = makeEnvelope({ units, enemyPlayer: { baseHp: 0 }, phase: 'finished' });
  envelope.snapshot.state.winnerSeat = 1;
  const analysis = analyzeSnapshot(envelope, { top: 10 });
  assert.equal(analysis.observation.winnerSeat, 1);
  assert.equal(analysis.recommendations.length, 1);
  assert.equal(analysis.recommendations[0].category, 'estado');
  assert.equal(analysis.recommendations[0].suggestion, null);
  assert.equal(analysis.tactics.legalAttacksNow.self, 0);
});

test('turno expirado não publica ataque imediato como legal agora', () => {
  const units = [
    makeUnit('cannon-blue', 1, 'cannon', 7, 8),
    makeUnit('operator-blue', 1, 'operator', 7, 9)
  ];
  const analysis = analyzeSnapshot(makeEnvelope({ units, enemyPlayer: { baseHp: 3 } }), {
    observedAt: future + 1,
    top: 10
  });
  assert.equal(analysis.tactics.legalAttacksNow.self, 0);
  assert.equal(analysis.tactics.baseDamageNow.outgoing.totalDamage, 0);
  assert.ok(!analysis.recommendations.some(item => item.title === 'Finalização legal disponível agora'));
  assert.ok(analysis.warnings.some(item => /relógio do turno já expirou/i.test(item)));
});

test('Canhão sem Operador ou com linha bloqueada não ameaça a base', () => {
  const cannon = makeUnit('cannon-blue', 1, 'cannon', 7, 8);
  const noOperator = analyzeSnapshot(makeEnvelope({ units: [cannon] }));
  assert.equal(noOperator.tactics.baseDamageWhenReady.outgoing.totalDamage, 0);
  assert.deepEqual(noOperator.tactics.dependencies.self.unoperatedCannons, ['cannon-blue']);

  const blocked = analyzeSnapshot(makeEnvelope({ units: [
    cannon,
    makeUnit('operator-blue', 1, 'operator', 7, 9),
    makeUnit('blocker-red', 2, 'guard', 7, 5)
  ] }));
  assert.equal(blocked.tactics.baseDamageWhenReady.outgoing.totalDamage, 0);
});

test('Operador marcado em construção não ativa Canhão', () => {
  const analysis = analyzeSnapshot(makeEnvelope({ units: [
    makeUnit('cannon-blue', 1, 'cannon', 7, 8),
    makeUnit('operator-blue', 1, 'operator', 7, 9, { underConstruction: true, buildReadyRound: 4 })
  ] }));
  assert.equal(analysis.tactics.baseDamageWhenReady.outgoing.totalDamage, 0);
  assert.deepEqual(analysis.tactics.dependencies.self.unoperatedCannons, ['cannon-blue']);
});

test('formação não é recomendada quando o Operador morreria ao entrar no fogo', () => {
  const analysis = analyzeSnapshot(makeEnvelope({
    units: [
      makeUnit('cannon-blue', 1, 'cannon', 6, 8),
      makeUnit('operator-blue', 1, 'operator', 6, 9)
    ],
    fires: [{ id: 'fire-red', ownerSeat: 2, casterUnitId: 'mage-red', x: 6, z: 8, damagedUnitIds: [] }]
  }), { top: 20 });
  assert.ok(!analysis.recommendations.some(item => item.suggestion?.kind === 'move-cannon-formation'));
});

test('Arqueiro ignora Barreira, mas não tropa na linha', () => {
  const archer = makeUnit('archer-blue', 1, 'archer', 7, 8);
  const target = makeUnit('guard-red', 2, 'guard', 7, 4);
  const barrierModel = createModel(makeEnvelope({ units: [
    archer,
    makeUnit('barrier-red', 2, 'wooden_barrier', 7, 6),
    target
  ] }));
  assert.ok(attackOptionsForUnit(barrierModel, barrierModel.units.find(unit => unit.id === archer.id))
    .some(option => option.targetUnitId === target.id));

  const troopModel = createModel(makeEnvelope({ units: [
    archer,
    makeUnit('warrior-red', 2, 'warrior', 7, 6),
    target
  ] }));
  assert.ok(!attackOptionsForUnit(troopModel, troopModel.units.find(unit => unit.id === archer.id))
    .some(option => option.targetUnitId === target.id));
});

test('Arqueiro montado ganha alcance 5 e ignora bloqueadores', () => {
  const tower = makeUnit('tower-blue', 1, 'tower', 7, 8);
  const archer = makeUnit('archer-blue', 1, 'archer', 7, 8, { mountedOnTowerId: tower.id });
  const target = makeUnit('guard-red', 2, 'guard', 7, 3);
  const model = createModel(makeEnvelope({ units: [
    tower,
    archer,
    makeUnit('warrior-red', 2, 'warrior', 7, 6),
    target
  ] }));
  const options = attackOptionsForUnit(model, model.units.find(unit => unit.id === archer.id));
  assert.ok(options.some(option => option.targetUnitId === target.id));
});

test('Rajada da Torre atinge inimigo mesmo com carta aliada na frente', () => {
  const tower = makeUnit('tower-blue', 1, 'tower', 7, 10);
  const archer = makeUnit('archer-blue', 1, 'archer', 7, 10, { mountedOnTowerId: tower.id });
  const ally = makeUnit('guard-blue', 1, 'guard', 7, 9);
  const enemy = makeUnit('guard-red', 2, 'guard', 7, 8);
  const model = createModel(makeEnvelope({ units: [tower, archer, ally, enemy] }));
  const volley = towerVolleyOptionsForSeat(model, 1)[0];
  assert.ok(volley.affected.some(effect => effect.unitId === enemy.id));
  assert.ok(!volley.affected.some(effect => effect.unitId === ally.id));
});

test('Goblin Bombardeiro calcula carga, dano por tipo e o próprio sacrifício', () => {
  const bomber = makeUnit('bomber-blue', 1, 'goblin_bomber', 7, 10);
  const building = makeUnit('barrier-red', 2, 'wooden_barrier', 7, 5);
  const troop = makeUnit('guard-red', 2, 'guard', 8, 5);
  const model = createModel(makeEnvelope({ units: [bomber, building, troop] }));
  const option = goblinBomberOptionsForSeat(model, 1)[0];
  assert.deepEqual(option.cell, { x: 7, z: 6 });
  assert.equal(option.affected.find(effect => effect.unitId === building.id).damage, 4);
  assert.equal(option.affected.find(effect => effect.unitId === troop.id).damage, 3);
  assert.equal(option.affected.find(effect => effect.unitId === bomber.id).lethal, true);
});

test('Altares expõem Marcha Goblin e Selo enfraquecedor no modo sem visual', () => {
  const goblinAltar = makeUnit('altar-goblin', 1, 'goblin_altar', 7, 10);
  const mageAltar = makeUnit('altar-mage', 1, 'mage_altar', 6, 10);
  const allyGoblin = makeUnit('goblin-blue', 1, 'goblin', 7, 9);
  const enemyGoblin = makeUnit('goblin-red', 2, 'goblin', 7, 6);
  const model = createModel(makeEnvelope({
    units: [goblinAltar, mageAltar, allyGoblin, enemyGoblin],
    selfPlayer: { energy: 10 }
  }));
  const options = altarAbilityOptionsForSeat(model, 1);
  assert.ok(options.some(option => option.kind === 'goblin-march' && option.buffedUnitIds.includes(allyGoblin.id)));
  assert.ok(options.some(option => option.kind === 'mage-seal' && option.debuffedUnitIds.includes(enemyGoblin.id)));
});

test('Rajada montada é instantânea e aparece em qualquer turno', () => {
  const tower = makeUnit('tower-blue', 1, 'tower', 7, 10);
  const archer = makeUnit('archer-blue', 1, 'archer', 7, 10, { mountedOnTowerId: tower.id });
  const enemy = makeUnit('guard-red', 2, 'guard', 7, 7, { hp: 2 });
  const ownTurn = analyzeSnapshot(makeEnvelope({ activeSeat: 1, units: [tower, archer, enemy] }), { top: 10 });
  assert.ok(ownTurn.recommendations.some(item => item.suggestion?.kind === 'tower-volley'));
  const enemyTurn = analyzeSnapshot(makeEnvelope({ activeSeat: 2, units: [tower, archer, enemy] }), { top: 10 });
  assert.ok(enemyTurn.recommendations.some(item => item.suggestion?.kind === 'tower-volley'));
});

test('Ácido do Mago continua disponível fora do turno e não depende da ação normal', () => {
  const mage = makeUnit('mage-blue', 1, 'mage', 7, 8, { actionUsed: true });
  const enemy = makeUnit('guard-red', 2, 'guard', 7, 7, { hp: 3 });
  const analysis = analyzeSnapshot(makeEnvelope({ activeSeat: 2, units: [mage, enemy], selfPlayer: { energy: 4 } }), { top: 10 });
  assert.ok(analysis.recommendations.some(item => item.category === 'instantânea'
    && item.suggestion?.kind === 'mage-acid'));
});

test('Estrada de Pedregulhos posiciona como estrada e aumenta apenas o movimento Básico', () => {
  const road = { id: 'stone-a', cardId: 'cobblestone_road', ownerSeat: 1, x: 7, z: 12, underConstruction: false, buildReadyRound: 1 };
  const basic = makeUnit('warrior-blue', 1, 'warrior', 7, 12);
  const goblin = makeUnit('goblin-blue', 1, 'goblin', 7, 12);
  const basicModel = createModel(makeEnvelope({ units: [basic], roads: [road] }));
  const goblinModel = createModel(makeEnvelope({ units: [goblin], roads: [road] }));
  assert.ok(movementOptionsForUnit(basicModel, basicModel.units[0]).some(option => option.to.z === 9));
  assert.ok(!movementOptionsForUnit(goblinModel, goblinModel.units[0]).some(option => option.to.z === 10));

  const distantTarget = makeUnit('guard-red', 2, 'guard', 7, 9);
  const attackModel = createModel(makeEnvelope({ units: [basic, distantTarget], roads: [road] }));
  assert.ok(!attackOptionsForUnit(attackModel, attackModel.units[0]).some(option => option.targetUnitId === distantTarget.id));

  const placementModel = createModel(makeEnvelope({
    roads: [{ id: 'road-a', cardId: 'road', ownerSeat: 1, x: 7, z: 12, underConstruction: false }],
    hand: [{ instanceId: 'stone-card', cardId: 'cobblestone_road' }]
  }));
  assert.ok(legalSummonCells(placementModel, placementModel.self.hand[0])
    .some(cell => cell.x === 7 && cell.z === 11));
});

test('economia segura recomenda Casa presente na mão com posição legal', () => {
  const analysis = analyzeSnapshot(makeEnvelope({
    hand: [{ instanceId: 'house-card-1', cardId: 'wooden_house' }],
    roads: [
      { id: 'road-a', ownerSeat: 1, x: 5, z: 12, underConstruction: false, buildReadyRound: 1 },
      { id: 'road-b', ownerSeat: 1, x: 5, z: 11, underConstruction: false, buildReadyRound: 1 }
    ],
    selfPlayer: { citizens: 0, energy: 10 }
  }), { top: 10 });
  assert.ok(analysis.recommendations.some(item => item.suggestion?.kind === 'summon'
    && item.suggestion.cardId === 'wooden_house'));
});

test('Cidadão e Enxame Goblin aparecem nas recomendações de invocação', () => {
  const analysis = analyzeSnapshot(makeEnvelope({
    hand: [
      { instanceId: 'citizen-card', cardId: 'citizen' },
      { instanceId: 'swarm-card', cardId: 'goblin_swarm' }
    ],
    selfPlayer: { citizens: 0, energy: 10 }
  }), { top: 20 });
  assert.ok(analysis.recommendations.some(item => item.suggestion?.cardId === 'citizen'));
  assert.ok(analysis.recommendations.some(item => item.suggestion?.cardId === 'goblin_swarm'
    && item.risks.some(risk => /aleat/i.test(risk))));
});

test('Altar Mago bloqueia invocação com Goblin e expõe a compra pendente', () => {
  const envelope = makeEnvelope({
    units: [makeUnit('goblin-blue', 1, 'goblin', 7, 11)],
    hand: [{ instanceId: 'altar-card', cardId: 'mage_altar' }],
  });
  const model = createModel(envelope);
  assert.deepEqual(legalSummonCells(model, model.self.hand[0]), []);

  envelope.snapshot.self.pendingMageAltarChoices = 1;
  envelope.snapshot.self.deckChoices = ['warrior', 'archer', 'mage'];
  const analysis = analyzeSnapshot(envelope, { top: 20 });
  assert.ok(analysis.recommendations.some(item => item.suggestion?.kind === 'choose-deck-card'));
});

test('Rua não ganha valor artificial por estar na linha do Canhão', () => {
  const hand = [{ instanceId: 'road-card-1', cardId: 'road' }];
  const roads = [{ id: 'road-a', ownerSeat: 1, x: 6, z: 12, underConstruction: false, buildReadyRound: 1 }];
  const safe = analyzeSnapshot(makeEnvelope({ hand, roads }), { top: 20 });
  const threatened = analyzeSnapshot(makeEnvelope({
    hand,
    roads,
    units: [
      makeUnit('cannon-red', 2, 'cannon', 7, 6),
      makeUnit('operator-red', 2, 'operator', 7, 5)
    ]
  }), { top: 20 });
  const scoreForRoad = analysis => analysis.recommendations.find(item => item.suggestion?.cardId === 'road')?.score;
  assert.equal(scoreForRoad(threatened), scoreForRoad(safe));
});

test('snapshot inconsistente é rejeitado em vez de ocultar peças', () => {
  const unknown = makeEnvelope({ units: [makeUnit('unknown-1', 1, 'future_card', 4, 4)] });
  assert.throws(() => analyzeSnapshot(unknown), /carta desconhecida/i);

  const duplicate = makeEnvelope({ units: [
    makeUnit('same-id', 1, 'guard', 4, 4),
    makeUnit('same-id', 2, 'warrior', 5, 5)
  ] });
  assert.throws(() => analyzeSnapshot(duplicate), /IDs duplicados/i);

  const outside = makeEnvelope({ units: [makeUnit('outside-1', 1, 'guard', 99, 4)] });
  assert.throws(() => analyzeSnapshot(outside), /fora do tabuleiro/i);
});

test('fase waiting aceita apenas o próprio jogador e não sugere ação', () => {
  const envelope = makeEnvelope({ phase: 'waiting' });
  envelope.snapshot.state.players = envelope.snapshot.state.players.filter(player => player.seat === 1);
  const analysis = analyzeSnapshot(envelope);
  assert.equal(analysis.recommendations[0].category, 'estado');
  assert.equal(analysis.recommendations[0].suggestion, null);
});

test('relatório declara a garantia e o código não contém canal de execução', async () => {
  const analysis = analyzeSnapshot(makeEnvelope());
  const report = renderTextReport(analysis);
  assert.match(report, /SOMENTE LEITURA/);
  assert.match(report, /nenhuma jogada foi ou pode ser enviada/i);
  assert.match(LOCAL_RULES_FINGERPRINT, /^fnv1a-[0-9a-f]{8}$/);
  assert.equal(analysis.rules.serverFingerprint, null);

  const cliPath = fileURLToPath(new URL('../src/codex-advisor.mjs', import.meta.url));
  const source = await readFile(cliPath, 'utf8');
  assert.doesNotMatch(source, /game-terminal\.mjs|WebSocket|sendAction|\/command|method\s*:\s*['"](?!GET)/i);
  assert.match(source, /method:\s*'GET'/);
});
