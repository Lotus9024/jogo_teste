import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { FileIdentityRepository } from '../src/auth/fileIdentityRepository.js';

test('preserva contas, sessões e decks locais após reiniciar o repositório', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'nexus-auth-'));
  const filePath = join(directory, 'auth.json');
  const sessionTokenHash = Buffer.alloc(32, 7);
  const csrfHash = Buffer.alloc(32, 9);
  const expiresAt = new Date(Date.now() + 60_000);

  try {
    const first = new FileIdentityRepository({ filePath });
    const player = await first.createPlayer({
      displayName: 'Rei Persistente',
      normalizedName: 'rei persistente',
      authProvider: 'password',
      passwordHash: 'scrypt$16384$8$1$salt$hash'
    });
    await first.createSession({
      tokenHash: sessionTokenHash,
      playerId: player.id,
      csrfHash,
      expiresAt
    });
    await first.saveDeck(player.id, ['warrior', 'archer']);

    const restored = new FileIdentityRepository({ filePath });
    const restoredPlayer = await restored.findPlayerByNormalizedName('rei persistente');
    const restoredSession = await restored.getSession(sessionTokenHash);

    assert.equal(restored.storageKind, 'file');
    assert.equal(restoredPlayer.id, player.id);
    assert.equal(restoredPlayer.passwordHash, 'scrypt$16384$8$1$salt$hash');
    assert.equal(restoredSession.player.id, player.id);
    assert.deepEqual(restoredSession.deckCardIds, ['warrior', 'archer']);
    assert.deepEqual(restoredSession.expiresAt, expiresAt);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
