import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { DEFAULT_DECK_CARD_IDS } from '../packages/shared/src/deckRules.js';

const baseURL = process.env.PLAYTEST_URL ?? 'http://localhost:4174';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) {
  throw new Error('O playtest cria convidados e salas de teste. Use apenas um servidor local.');
}
const output = resolve('.local-data/playtest');
await mkdir(output, { recursive: true });
const services = [];
let browser;
const pageErrors = [];
const checks = [];
const contexts = [];
function passed(name) { checks.push(name); console.log(`OK ${name}`); }
async function newPlayer(name) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  contexts.push(context);
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(baseURL);
  await page.locator('#guest-entry:not(:disabled)').waitFor();
  await page.locator('#guest-entry').click();
  await page.locator('#guest-form button').click();
  assert.match(await page.locator('#lobby-error').innerText(), /Preencha/u);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'guest-king-name');
  await page.locator('#guest-king-name').fill(name);
  await page.locator('#guest-form button').click();
  await page.locator('[data-lobby-screen="hub"]:visible').waitFor();
  await page.locator('#open-deck-builder').click();
  for (const id of DEFAULT_DECK_CARD_IDS) {
    await page.locator(`#deck-library-cards [data-card-id="${id}"]`).click();
  }
  await page.route('**/api/deck', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.continue();
  });
  await page.locator('#deck-builder-save').click();
  assert.equal(await page.locator('#deck-builder-close').isDisabled(), true);
  assert.equal(await page.locator('#deck-library-cards button').first().isDisabled(), true);
  await page.locator('#open-create-room:not(:disabled)').waitFor();
  return page;
}

try {
  if (!process.env.PLAYTEST_URL) {
    // Dedicated ports and in-memory identities keep automated guests out of the player's preview.
    const backend = spawn(process.execPath, ['scripts/serve-playtest.mjs'], { stdio: ['ignore', 'ignore', 'inherit'] });
    services.push(backend);
    const client = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '4174', '--strictPort'], {
      cwd: resolve('apps/client'),
      env: { ...process.env, VITE_API_URL: 'http://localhost:3099/api', VITE_WS_URL: 'ws://localhost:3099/ws' },
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    services.push(client);
    for (const url of ['http://localhost:3099/health', baseURL]) {
      const deadline = Date.now() + 30_000;
      while (true) {
        if (services.some(service => service.exitCode !== null)) throw new Error('Um serviço de playtest não conseguiu iniciar. Confira as portas 3099/4174.');
        try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) break; } catch { /* Wait for local startup. */ }
        if (Date.now() > deadline) throw new Error(`Serviço de playtest não respondeu: ${url}`);
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
  }
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYTEST_BROWSER || undefined, args: ['--enable-unsafe-swiftshader'] });
  const first = await newPlayer(`QA azul ${Date.now().toString().slice(-6)}`);
  passed('Validação com foco, convidado e deck salvo pelo menu');
  await first.locator('#open-create-room').click();
  await first.locator('#room-display-name').fill('Playtest local');
  await first.locator('[name="room-player-count"][value="3"]').check();
  await first.locator('#create-room-form button[type="submit"]').click();
  assert.equal(await first.evaluate(() => document.activeElement.id), 'cancel-experimental-mode');
  await first.keyboard.press('Shift+Tab');
  assert.equal(await first.evaluate(() => document.activeElement.id), 'confirm-experimental-mode');
  await first.keyboard.press('Escape');
  assert.equal(await first.locator('#experimental-mode-modal').isVisible(), false);
  assert.equal(await first.evaluate(() => document.querySelector('.nexus-lobby').inert), false);
  passed('Confirmação experimental: foco contido, Escape e fundo restaurado');
  await first.locator('[name="room-player-count"][value="2"]').check();
  await first.locator('[name="room-visibility"][value="private"]').check();
  await first.locator('#create-room-form button[type="submit"]').click();
  await first.waitForFunction(() => /^[A-Z2-9]{6}$/u.test(document.querySelector('#waiting-code').textContent));
  const code = await first.locator('#waiting-code').innerText();
  const second = await newPlayer(`QA rubro ${Date.now().toString().slice(-6)}`);
  await second.locator('#open-rooms').click();
  await second.locator('#room-code').fill(code);
  await second.locator('#room-code').press('Enter');
  await Promise.all([first, second].map(page => page.locator('#online-lobby.closed').waitFor({ state: 'attached' })));
  assert.equal(await first.locator('#card-hand .game-card').count(), 7);
  assert.equal(await second.locator('#card-hand .game-card').count(), 7);
  const active = await first.locator('#end-turn').isEnabled() ? first : second;
  const inactive = active === first ? second : first;
  await active.locator('#end-turn').click();
  await inactive.waitForFunction(() => !document.querySelector('#end-turn').disabled);
  assert.equal(await active.locator('#end-turn').isEnabled(), false);
  passed('Dois jogadores: sala privada, entrada por Enter, 7 cartas e troca de turno');
  await first.locator('#settings-toggle').click();
  await first.keyboard.press('Shift+Tab');
  assert.equal(await first.evaluate(() => document.querySelector('#settings-modal').contains(document.activeElement)), true);
  await first.keyboard.press('Escape');
  assert.equal(await first.evaluate(() => document.activeElement.id), 'settings-toggle');
  passed('Configurações: foco contido e restaurado');
  await first.screenshot({ path: resolve(output, 'partida-desktop.png') });
  await first.setViewportSize({ width: 390, height: 844 });
  assert.equal(await first.locator('.command-resource.energy').isVisible(), true);
  await first.waitForFunction(() => {
    const box = document.querySelector('.bottom-command').getBoundingClientRect();
    return box.x >= 0 && box.right <= innerWidth;
  });
  const rail = await first.locator('.bottom-command').boundingBox();
  assert.ok(rail.x >= 0 && rail.x + rail.width <= 390, 'Comandos devem caber no viewport.');
  await first.screenshot({ path: resolve(output, 'partida-mobile.png') });

  const guide = await first.context().newPage();
  await guide.goto(`${baseURL}/guide.html`);
  await guide.locator('#guide-article h1').waitFor();
  const guideLinks = await guide.locator('#guide-documents a').evaluateAll(links => links.map(link => link.href));
  assert.ok(guideLinks.length >= 4, 'Biblioteca deve incluir guia, catálogo, arquitetura e revisão.');
  for (const href of guideLinks) {
    await guide.goto(href);
    await guide.locator('#guide-article h1').waitFor();
    const fragments = await guide.locator('#guide-article a[href^="#"]').evaluateAll(links => links.map(link => link.hash));
    for (const fragment of fragments) {
      assert.ok(await guide.evaluate(hash => Boolean(document.getElementById(decodeURIComponent(hash.slice(1)))), fragment), `Âncora ausente: ${fragment}`);
    }
  }
  await guide.goto(`${baseURL}/guide.html`);
  await guide.screenshot({ path: resolve(output, 'guia-desktop.png') });
  await guide.setViewportSize({ width: 390, height: 844 });
  await guide.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await guide.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await guide.screenshot({ path: resolve(output, 'guia-mobile.png') });
  passed('Biblioteca: todos os documentos, âncoras e viewport de 390px');

  const studio = await first.context().newPage();
  studio.on('pageerror', error => pageErrors.push(error.message));
  await studio.goto(`${baseURL}/models.html`);
  await studio.locator('#model-viewport canvas').waitFor();
  const modelIds = await studio.locator('#model-list [data-model-id]').evaluateAll(buttons => buttons.map(button => button.dataset.modelId));
  assert.equal(modelIds.length, 21, 'Todas as miniaturas físicas devem estar disponíveis.');
  let constructionStates = 0;
  for (const id of modelIds) {
    await studio.locator(`[data-model-id="${id}"]`).click();
    assert.equal(await studio.locator('#model-viewport').getAttribute('data-current-model'), id);
    if (await studio.locator('#model-build').isVisible()) {
      await studio.locator('#model-build').click();
      assert.equal(await studio.locator('#model-build').getAttribute('aria-pressed'), 'true');
      await studio.locator('#model-build').click();
      constructionStates += 1;
    }
  }
  assert.ok(constructionStates >= 8);
  await studio.locator('[data-model-id="mage"]').click();
  await studio.locator('#model-rotate').click();
  assert.equal(await studio.locator('#model-rotate').getAttribute('aria-pressed'), 'true');
  await studio.locator('#model-rotate').click();
  await studio.locator('#model-viewport').focus();
  await studio.keyboard.press('ArrowRight');
  await studio.locator('#model-reset').click();
  await studio.screenshot({ path: resolve(output, 'miniaturas-desktop.png') });
  await studio.setViewportSize({ width: 390, height: 844 });
  await studio.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await studio.locator('#model-rotate').isDisabled(), true);
  assert.equal(await studio.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await studio.screenshot({ path: resolve(output, 'miniaturas-mobile.png') });
  passed('Galeria: 21 miniaturas, obras, rotação, teclado e movimento reduzido');

  const failureContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  contexts.push(failureContext);
  const failure = await failureContext.newPage();
  await failure.route('**/api/auth/session', route => route.abort());
  await failure.goto(baseURL);
  await failure.locator('#guest-entry:not(:disabled)').waitFor();
  assert.match(await failure.locator('#lobby-error').innerText(), /Não foi possível/u);
  await failure.screenshot({ path: resolve(output, 'entrada-mobile.png') });
  assert.equal(await failure.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  passed('Falha de sessão mantém menu utilizável em tela estreita');
  assert.deepEqual(pageErrors, [], 'Nenhuma exceção JavaScript nas páginas de partida.');
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ checkedAt: new Date().toISOString(), baseURL, checks, pageErrors }, null, 2));
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser?.close();
  for (const service of services) service.kill();
}
