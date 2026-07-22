import { devGalleryTemplate } from './shell/devGalleryTemplate.js';
import { gameHudTemplate } from './shell/gameHudTemplate.js';
import { lobbyTemplate } from './shell/lobbyTemplate.js';
import { settingsTemplate } from './shell/settingsTemplate.js';

export function mountGameShell() {
  document.body.innerHTML = `${lobbyTemplate()}
    <main id="game" tabindex="0" aria-label="Tabuleiro 3D medieval com três tropas">
      ${gameHudTemplate()}
      ${settingsTemplate()}
      ${devGalleryTemplate()}
    </main>`;
}
