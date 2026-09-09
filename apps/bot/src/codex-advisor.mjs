#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { analyzeSnapshot, renderTextReport, READ_ONLY_NOTICE } from './codex-advisor-core.mjs';

const DEFAULT_SOURCE = 'http://127.0.0.1:4310';
const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_INTERVAL_MS = 500;

function isLoopback(hostname) {
  const normalized = String(hostname).toLowerCase();
  return normalized === 'localhost'
    || normalized === '::1'
    || normalized === '[::1]'
    || /^127(?:\.\d{1,3}){3}$/.test(normalized);
}

export function stateUrlForSource(source) {
  let url;
  try {
    url = new URL(String(source));
  } catch {
    throw new Error(`Fonte inválida: ${source}`);
  }
  const embeddedSource = url.searchParams.get('source');
  if (embeddedSource) {
    try {
      url = new URL(embeddedSource);
    } catch {
      throw new Error('O parâmetro source da URL não contém uma URL válida.');
    }
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('A fonte precisa usar HTTP.');
  if (!isLoopback(url.hostname)) throw new Error('Por segurança, a fonte deve ser local (localhost ou 127.0.0.1).');
  url.pathname = '/state';
  url.search = '';
  url.hash = '';
  return url;
}

export function createReadOnlyStateClient({ fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Este Node.js não oferece fetch.');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) throw new Error('Timeout inválido.');
  return Object.freeze({
    async getState(source) {
      const url = stateUrlForSource(source);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
        if (!response?.ok) throw new Error(`Falha ao ler ${url}: HTTP ${response?.status ?? 'desconhecido'}.`);
        const body = await response.json();
        if (!body?.snapshot) throw new Error(body?.error || 'A fonte respondeu sem snapshot.');
        return body;
      } catch (error) {
        if (error?.name === 'AbortError') throw new Error(`A leitura excedeu ${timeoutMs} ms.`);
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
  });
}

function numericFlag(value, flag, { minimum = 1, maximum = Number.POSITIVE_INFINITY } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${flag} recebeu valor inválido: ${value}`);
  return parsed;
}

function requiredFlagValue(argv, index, flag) {
  const value = argv[index + 1];
  if (value === undefined || String(value).startsWith('-')) throw new Error(`${flag} exige um valor.`);
  return value;
}

export function parseArgs(argv) {
  const options = {
    source: process.env.CODEX_ADVISOR_SOURCE ?? DEFAULT_SOURCE,
    file: null,
    format: 'text',
    top: 7,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    watch: false,
    intervalMs: DEFAULT_INTERVAL_MS,
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--source' || argument === '-s') options.source = requiredFlagValue(argv, index++, argument);
    else if (argument === '--file' || argument === '-f') options.file = requiredFlagValue(argv, index++, argument);
    else if (argument === '--json') options.format = 'json';
    else if (argument === '--ndjson') options.format = 'ndjson';
    else if (argument === '--format') options.format = String(requiredFlagValue(argv, index++, '--format')).toLowerCase();
    else if (argument === '--top') options.top = numericFlag(requiredFlagValue(argv, index++, '--top'), '--top', { minimum: 1, maximum: 20 });
    else if (argument === '--timeout') options.timeoutMs = numericFlag(requiredFlagValue(argv, index++, '--timeout'), '--timeout', { minimum: 50, maximum: 60_000 });
    else if (argument === '--interval') {
      options.watch = true;
      options.intervalMs = numericFlag(requiredFlagValue(argv, index++, '--interval'), '--interval', { minimum: 100, maximum: 60_000 });
    } else if (argument === '--watch') {
      options.watch = true;
      const following = argv[index + 1];
      if (following && !following.startsWith('-') && Number.isFinite(Number(following))) {
        options.intervalMs = numericFlag(following, '--watch', { minimum: 100, maximum: 60_000 });
        index += 1;
      }
    } else if (!argument.startsWith('-') && options.source === DEFAULT_SOURCE) options.source = argument;
    else throw new Error(`Argumento desconhecido: ${argument}`);
  }
  if (!['text', 'json', 'ndjson'].includes(options.format)) throw new Error(`Formato inválido: ${options.format}`);
  if (options.file && options.watch) throw new Error('--watch só está disponível com uma fonte HTTP local.');
  if (!options.source && !options.file) throw new Error('Informe --source ou --file.');
  return options;
}

export function helpText() {
  return [
    'Codex Advisor — análise estratégica somente leitura',
    '',
    READ_ONLY_NOTICE,
    '',
    'Uso:',
    '  node apps/bot/src/codex-advisor.mjs --source http://127.0.0.1:4352',
    '  node apps/bot/src/codex-advisor.mjs --source http://127.0.0.1:4352 --json',
    '  node apps/bot/src/codex-advisor.mjs --source http://127.0.0.1:4352 --watch 500 --ndjson',
    '  node apps/bot/src/codex-advisor.mjs --file caminho/snapshot.json',
    '',
    'Opções:',
    '  -s, --source URL    endpoint local do terminal; /state é acrescentado automaticamente',
    '  -f, --file ARQUIVO  analisa um snapshot salvo, sem rede',
    '      --json          relatório JSON formatado',
    '      --ndjson        uma linha JSON por versão (ideal para outra IA)',
    '      --watch [MS]    acompanha novas versões; padrão 500 ms',
    '      --interval MS   equivalente a --watch com intervalo explícito',
    '      --timeout MS    limite de leitura; padrão 2000 ms',
    '      --top N         devolve de 1 a 20 prioridades; padrão 7',
    '  -h, --help          mostra esta ajuda'
  ].join('\n');
}

async function loadFromFile(file) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(resolve(file), 'utf8'));
  } catch (error) {
    throw new Error(`Não foi possível ler o snapshot ${file}: ${error.message}`);
  }
  return parsed;
}

function printAnalysis(analysis, format, watching) {
  if (format === 'text') {
    if (watching) process.stdout.write(`\n${'='.repeat(72)}\n`);
    process.stdout.write(`${renderTextReport(analysis)}\n`);
  } else if (format === 'json' && !watching) {
    process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(analysis)}\n`);
  }
}

async function delay(milliseconds) {
  await new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds));
}

export async function runAdvisor(options) {
  if (options.file) {
    const input = await loadFromFile(options.file);
    const analysis = analyzeSnapshot(input, { top: options.top });
    printAnalysis(analysis, options.format, false);
    return analysis;
  }

  const client = createReadOnlyStateClient({ timeoutMs: options.timeoutMs });
  let lastVersion = null;
  let lastAnalysis = null;
  let attempts = 0;
  do {
    attempts += 1;
    try {
      const input = await client.getState(options.source);
      const version = input.snapshot.state.version;
      if (version !== lastVersion) {
        const analysis = analyzeSnapshot(input, { top: options.top });
        const confirmation = await client.getState(options.source);
        if (confirmation.snapshot.state.version === version) {
          printAnalysis(analysis, options.format, options.watch);
          lastVersion = version;
          lastAnalysis = analysis;
        }
      }
    } catch (error) {
      if (!options.watch) throw error;
      process.stderr.write(`[codex-advisor] ${error.message}\n`);
    }
    if (!options.watch && !lastAnalysis && attempts >= 3) {
      throw new Error('O estado mudou durante três análises consecutivas; tente novamente quando a versão estabilizar.');
    }
    if (options.watch) await delay(options.intervalMs);
  } while (options.watch || !lastAnalysis);
  return lastAnalysis;
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${helpText()}\n`);
      return;
    }
    await runAdvisor(options);
  } catch (error) {
    process.stderr.write(`Erro: ${error.message}\n\n${helpText()}\n`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();
