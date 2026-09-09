import { spawn, spawnSync } from 'node:child_process';
import { parseDeckText, recommendedDeckCardIds } from './deck-builder.mjs';

import { repositoryRoot as root, clientRoot, terminalEntry } from './paths.mjs';
const children = [];
const cliArgs = process.argv.slice(2);
const online = cliArgs.includes('--online');

function option(name) {
  const index = cliArgs.indexOf(name);
  return index >= 0 ? cliArgs[index + 1] : null;
}

function startNode(args, env = {}, cwd = root) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'ignore', 'inherit'],
    windowsHide: true
  });
  children.push(child);
  return child;
}

async function waitForState(port, timeout = 12_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/state`);
      const state = await response.json();
      if (state.snapshot) return state.snapshot;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 180));
  }
  throw new Error(`Cliente textual da porta ${port} não iniciou.`);
}

function stop() {
  for (const child of children) if (!child.killed) child.kill();
}

process.on('SIGINT', () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });
process.on('exit', stop);

const blueDeck = parseDeckText(option('--blue-deck') ?? process.env.TRONOS_BLUE_DECK ?? recommendedDeckCardIds().join(','));
const redDeck = parseDeckText(option('--red-deck') ?? process.env.TRONOS_RED_DECK ?? recommendedDeckCardIds().join(','));
const stamp = Date.now().toString(36).slice(-6);
const arenaEnvironment = online ? {
  TRONOS_API_URL: 'https://tronos-em-ruinas-api.squareweb.app/api',
  TRONOS_WS_URL: 'wss://tronos-em-ruinas-api.squareweb.app/ws',
  TRONOS_CLIENT_ORIGIN: 'https://nexuschessdemo.netlify.app',
  TRONOS_ROOM_VISIBILITY: 'public'
} : {};

startNode([terminalEntry, 'criar', `CodexAzul${stamp}`, '--deck', blueDeck.join(',')], {
  ...arenaEnvironment,
  TRONOS_TERMINAL_PORT: '4310'
});
const blue = await waitForState(4310);
startNode([terminalEntry, 'entrar', blue.code, `CodexVermelho${stamp}`, '--deck', redDeck.join(',')], {
  ...arenaEnvironment,
  TRONOS_TERMINAL_PORT: '4311'
});
await waitForState(4311);
if (online) {
  console.log('');
  console.log('ARENA IA VS IA ONLINE PRONTA');
  console.log(`Sala pública: ${blue.code}`);
  console.log('No celular: https://nexuschessdemo.netlify.app');
  console.log('Abra "Entrar em salas" e toque em "ESPECTAR".');
  console.log('IA Azul:     http://127.0.0.1:4310/text');
  console.log('IA Vermelha: http://127.0.0.1:4311/text');
  console.log('');
  await new Promise(() => {});
}
const viteArgs = ['../../node_modules/vite/bin/vite.js'];
const build = spawnSync(process.execPath, [...viteArgs, 'build', '--config', 'spectator/vite.spectator.config.mjs', '--configLoader', 'runner'], { cwd: clientRoot, stdio: 'inherit', windowsHide: true });
if (build.status !== 0) throw new Error('Não foi possível compilar o espectador 3D.');
startNode([...viteArgs, 'preview', '--config', 'spectator/vite.spectator.config.mjs', '--configLoader', 'runner', '--host', '0.0.0.0', '--port', '4174'], {}, clientRoot);

console.log('');
console.log('ARENA CODEX VS CODEX PRONTA');
console.log(`Sala: ${blue.code}`);
console.log('Codex Azul:     http://127.0.0.1:4310/text');
console.log('Codex Vermelho: http://127.0.0.1:4311/text');
console.log('Espectador 3D:  http://127.0.0.1:4174/spectator/spectator.html');
console.log('');

await new Promise(() => {});
