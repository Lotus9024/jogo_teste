import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { formatDeckSummary, selectDeckBeforeMatch } from './deck-builder.mjs';

import { repositoryRoot as root, clientRoot, terminalEntry, communicationPath } from './paths.mjs';
const mode = String(process.argv[2] ?? '').toLowerCase();
const code = mode === 'entrar' || mode === 'join' ? String(process.argv[3] ?? '').toUpperCase() : null;
const name = mode === 'criar' || mode === 'create' ? String(process.argv[3] ?? 'Codex Azul') : String(process.argv[4] ?? 'Codex Vermelho');
const controlPort = Number(process.env.TRONOS_TERMINAL_PORT ?? (code ? 4311 : 4310));
const children = [];

if (!['criar', 'create', 'entrar', 'join'].includes(mode) || (code && !/^[A-Z2-9]{6}$/.test(code))) {
  console.log('Uso:');
  console.log('  node apps/bot/src/arena-code.mjs criar "Codex Azul" [--deck ids,separados]');
  console.log('  node apps/bot/src/arena-code.mjs entrar CODIGO "Codex Vermelho" [--deck ids,separados]');
  process.exit(1);
}

const selectedDeckCardIds = await selectDeckBeforeMatch({ args: process.argv.slice(2) });

async function portOnline(port, path = '/state') {
  try { return (await fetch(`http://127.0.0.1:${port}${path}`)).ok; } catch { return false; }
}

function startChild(args, env = {}, cwd = root) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: 'ignore', windowsHide: true });
  children.push(child);
  return child;
}

function stop() { for (const child of children) if (!child.killed) child.kill(); }
process.on('SIGINT', () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });
process.on('exit', stop);

async function waitForSnapshot(port, timeout = 12_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const state = await (await fetch(`http://127.0.0.1:${port}/state`)).json();
      if (state.snapshot) return state.snapshot;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 160));
  }
  throw new Error(`O controle textual não iniciou na porta ${port}.`);
}

if (await portOnline(controlPort)) throw new Error(`A porta ${controlPort} já está em uso. Encerre a arena anterior ou escolha TRONOS_TERMINAL_PORT.`);
startChild([
  terminalEntry,
  code ? 'entrar' : 'criar',
  ...(code ? [code, name] : [name]),
  '--deck',
  selectedDeckCardIds.join(',')
], { TRONOS_TERMINAL_PORT: String(controlPort) });
const snapshot = await waitForSnapshot(controlPort);

if (!code && !await portOnline(4174, '/spectator/spectator.html')) {
  const vite = '../../node_modules/vite/bin/vite.js';
  const build = spawnSync(process.execPath, [vite, 'build', '--config', 'spectator/vite.spectator.config.mjs', '--configLoader', 'runner'], { cwd: clientRoot, stdio: 'inherit', windowsHide: true });
  if (build.status !== 0) throw new Error('Não foi possível compilar o espectador.');
  startChild([vite, 'preview', '--config', 'spectator/vite.spectator.config.mjs', '--configLoader', 'runner', '--host', '0.0.0.0', '--port', '4174'], {}, clientRoot);
}

const spectator = `http://127.0.0.1:4174/spectator/spectator.html?source=http://127.0.0.1:${controlPort}`;
if (!code) {
  mkdirSync(dirname(communicationPath), { recursive: true });
  writeFileSync(communicationPath, `${JSON.stringify({
    purpose: 'temporary-codex-match-handshake', roomCode: snapshot.code,
    blueControl: `http://127.0.0.1:${controlPort}`, redControl: 'http://127.0.0.1:4311',
    spectatorUrl: spectator, blueStatus: 'ready', redStatus: 'waiting-external-codex-chat', deleteAfterMatch: true
  }, null, 2)}\n`);
} else if (existsSync(communicationPath)) {
  const communication = JSON.parse(readFileSync(communicationPath, 'utf8'));
  if (communication.roomCode === snapshot.code) {
    communication.redControl = `http://127.0.0.1:${controlPort}`;
    communication.redStatus = 'ready';
    writeFileSync(communicationPath, `${JSON.stringify(communication, null, 2)}\n`);
  }
}
console.log(code ? 'ENTRADA CONFIRMADA' : 'SALA CRIADA');
console.log(`Código: ${snapshot.code}`);
console.log(`Deck: ${formatDeckSummary(selectedDeckCardIds)}`);
console.log(`Controle textual: http://127.0.0.1:${controlPort}/text`);
console.log(`Espectador: ${spectator}`);
if (!code) console.log(`Envie somente este código ao outro Codex: ${snapshot.code}`);

await new Promise(() => {});
