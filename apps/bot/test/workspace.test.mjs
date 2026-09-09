import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { repositoryRoot, clientRoot, terminalEntry, communicationPath } from '../src/paths.mjs';

test('bot launchers resolve all applications and local state from the repository, independently of cwd', () => {
  for (const path of [terminalEntry, join(repositoryRoot, 'apps/server/src/index.js'),
    join(clientRoot, 'spectator/spectator.html'), join(clientRoot, 'spectator/vite.spectator.config.mjs')]) {
    assert.ok(existsSync(path), `Missing migrated entry: ${path}`);
    assert.equal(relative(repositoryRoot, path).startsWith('..'), false);
  }
  assert.equal(relative(repositoryRoot, communicationPath).replaceAll('\\', '/'), 'apps/bot/.local-data/communication.json');
});

test('advisor help works outside the repository without connecting to a match', () => {
  const result = spawnSync(process.execPath, [join(repositoryRoot, 'apps/bot/src/codex-advisor.mjs'), '--help'], {
    cwd: tmpdir(), encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SOMENTE LEITURA/u);
  assert.match(result.stdout, /apps\/bot\/src\/codex-advisor\.mjs/u);
});
