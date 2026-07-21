import { GAME_CONFIG } from '@tronos/shared/game-config';

export function mountGameShell() {
  document.body.innerHTML = `
    <section id="online-lobby" class="online-lobby" aria-labelledby="lobby-title">
      <div class="lobby-panel">
        <span class="lobby-kicker">TRONOS EM RUÍNAS · ONLINE</span>
        <h1 id="lobby-title">Erga seu reino</h1>
        <p>Crie uma sala privada ou entre usando o código de outro rei.</p>
        <label class="lobby-field"><span>NOME DO REI</span><input id="player-name" maxlength="24" autocomplete="nickname" value="Rei do Corvo" /></label>
        <div class="lobby-actions">
          <button id="create-room" class="lobby-primary">CRIAR SALA</button>
          <i>OU</i>
          <div class="join-row"><input id="room-code" maxlength="6" autocomplete="off" placeholder="CÓDIGO" aria-label="Código da sala" /><button id="join-room">ENTRAR</button></div>
          <i>MESA DE TESTES</i>
          <button id="dev-mode" class="dev-mode-button">DEV MODE</button>
        </div>
        <div id="waiting-room" class="waiting-room" hidden>
          <small>CÓDIGO DA SALA</small><strong id="waiting-code">------</strong>
          <span id="waiting-status">Aguardando o rei rival...</span>
        </div>
        <output id="lobby-error" class="lobby-error" aria-live="polite"></output>
        <small id="connection-state" class="connection-state">CONECTANDO AO SERVIDOR</small>
      </div>
    </section>
    <main id="game" tabindex="0" aria-label="Tabuleiro 3D medieval com três tropas">
      <header class="hud-title"><span class="sigil">♜</span><div><small>CRÔNICAS DOS REINOS</small><h1>TRONOS EM RUÍNAS</h1></div></header>
      <button id="draw-card" class="sr-only" aria-label="Comprar carta do baralho 3D">Comprar carta <span id="deck-count">28</span></button>
      <section id="deck-preview" class="deck-preview" aria-live="polite" aria-hidden="true"></section>
      <aside id="hover-card" class="hover-card unit-card-preview" aria-hidden="true"></aside>
      <div id="match-state" class="match-state" hidden><b id="match-code"></b><span id="turn-label"></span><time id="turn-clock">01:00</time></div>
      <output id="game-error" class="game-error" aria-live="polite"></output>
      <div class="base-health enemy-base-tag" role="img" aria-label="Vida do castelo inimigo: ${GAME_CONFIG.startingBaseHp} de ${GAME_CONFIG.startingBaseHp}"><i style="width:100%"></i></div>
      <section class="card-dock" aria-label="Mão de cartas">
        <div class="dock-label"><span>MÃO DO REINO</span><b id="hand-count">6 CARTAS</b></div>
        <button class="tray-nav tray-prev" id="tray-prev" aria-label="Ver cartas anteriores">‹</button>
        <div id="card-hand" class="card-hand"></div>
        <button class="tray-nav tray-next" id="tray-next" aria-label="Ver próximas cartas">›</button>
      </section>
      <button id="activate-instant" class="ability-command" hidden>ATIVAR HABILIDADE <span>2</span><kbd>F</kbd></button>
      <div class="bottom-command">
        <div class="command-resource energy" aria-label="Energia"><b id="self-energy">10<em>/12</em></b></div>
        <button id="end-turn">PASSAR TURNO</button>
        <div class="command-resource health" aria-label="Vida"><b id="self-health">${GAME_CONFIG.startingBaseHp}<em>/${GAME_CONFIG.startingBaseHp}</em></b></div>
      </div>
      <div class="loading"><div class="loader-mark">✦</div><span>PREPARANDO O CAMPO</span></div>
    </main>`;
}
