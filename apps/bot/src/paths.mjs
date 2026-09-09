import { fileURLToPath } from 'node:url';

// Entry points may be invoked from npm workspaces or directly from any cwd.
export const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
export const clientRoot = fileURLToPath(new URL('../../client/', import.meta.url));
export const terminalEntry = fileURLToPath(new URL('./game-terminal.mjs', import.meta.url));
export const communicationPath = fileURLToPath(new URL('../.local-data/communication.json', import.meta.url));
