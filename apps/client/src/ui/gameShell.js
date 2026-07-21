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
      <div id="match-state" class="match-state" hidden><span id="turn-label">SEU TURNO</span><time id="turn-clock">02:00</time></div>
      <button id="settings-toggle" class="settings-toggle" aria-haspopup="dialog" aria-controls="settings-modal" aria-label="Abrir configurações">⚙</button>
      <output id="game-error" class="game-error" aria-live="polite"></output>
      <div class="base-health enemy-base-tag" role="img" aria-label="Vida do castelo inimigo: ${GAME_CONFIG.startingBaseHp} de ${GAME_CONFIG.startingBaseHp}"><b id="enemy-base-level">LV 1</b><i style="width:100%"></i></div>
      <section class="card-dock" aria-label="Mão de cartas">
        <div class="dock-label"><span>MÃO DO REINO</span><b id="hand-count">6 CARTAS</b></div>
        <button class="tray-nav tray-prev" id="tray-prev" aria-label="Ver cartas anteriores">‹</button>
        <div id="card-hand" class="card-hand"></div>
        <button class="tray-nav tray-next" id="tray-next" aria-label="Ver próximas cartas">›</button>
      </section>
      <button id="activate-instant" class="ability-command" hidden>ATIVAR HABILIDADE <span>2</span><kbd>F</kbd></button>
      <div id="mage-commands" class="mage-commands" hidden>
        <button id="mage-fire-command" class="ability-command">CONJURAR FOGO</button>
        <button id="mage-acid-command" class="ability-command">CÍRCULO ÁCIDO <span>4</span></button>
      </div>
      <section id="dev-unit-tools" class="dev-unit-tools" aria-label="Ferramentas da unidade selecionada" hidden>
        <div><small>UNIDADE SELECIONADA</small><strong id="dev-unit-name">—</strong></div>
        <div class="dev-unit-levels" role="group" aria-label="Nível da unidade"><span>NÍVEL</span><button data-unit-level="1">1</button><button data-unit-level="2">2</button><button data-unit-level="3">3</button><button data-unit-level="4">4</button></div>
        <button id="dev-delete-unit" class="dev-danger-button">EXCLUIR</button>
      </section>
      <div class="bottom-command">
        <div class="command-resource level" tabindex="0" aria-describedby="level-requirement"><small>CASTELO</small><b id="self-level">LV 1</b><span id="level-requirement" role="tooltip">Nível 2: tenha 9 cidadãos em seu reino.</span></div>
        <div class="command-resource energy" aria-label="Energia"><small>ENERGIA</small><b id="self-energy">10<em>/${GAME_CONFIG.maxEnergy}</em></b></div>
        <button id="end-turn">PASSAR TURNO</button>
        <div class="command-resource health" aria-label="Vida"><small>VIDA</small><b id="self-health">${GAME_CONFIG.startingBaseHp}<em>/${GAME_CONFIG.startingBaseHp}</em></b></div>
        <div class="command-resource citizens" id="citizen-resource" aria-label="Cidadãos"><small>CIDADÃOS</small><b><span aria-hidden="true">☺</span> <strong id="self-citizens">0</strong></b></div>
      </div>
      <div class="loading"><div class="loader-mark">✦</div><span>PREPARANDO O CAMPO</span></div>
      <div id="settings-modal" class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" hidden>
        <section class="settings-panel">
          <header><div><small>TRONOS EM RUÍNAS</small><h2 id="settings-title">Configurações</h2></div><button id="settings-close" aria-label="Fechar configurações">×</button></header>
          <div class="settings-group">
            <div><small>DESEMPENHO</small><h3>Gráficos</h3><p>Baixo reduz polígonos, efeitos e resolução. Alto preserva o visual completo.</p></div>
            <div class="settings-options" role="group" aria-label="Qualidade dos gráficos"><button data-graphics="low">BAIXO</button><button data-graphics="high">ALTO</button></div>
          </div>
          <div class="settings-group">
            <div><small>JOGABILIDADE</small><h3>Câmera se centralizar</h3><p>Move a câmera para o centro do tabuleiro ao selecionar uma criatura.</p></div>
            <div class="settings-options" role="group" aria-label="Centralização da câmera"><button data-camera-centering="false">DESLIGADO</button><button data-camera-centering="true">LIGADO</button></div>
          </div>
          <div class="dev-settings" data-dev-settings hidden>
            <div class="dev-settings-heading"><small>MESA DE TESTES</small><h3>Menu de dev mode</h3><p>Estes controles afetam apenas a partida local e o reino do turno atual.</p></div>
            <div class="dev-setting-row"><span>Tamanho visual da base</span><div class="dev-stepper"><button id="dev-base-size-minus" aria-label="Diminuir base">−1</button><output id="dev-base-size">1.00×</output><button id="dev-base-size-plus" aria-label="Aumentar base">+1</button></div></div>
            <div class="dev-setting-row"><span>Nível da base</span><div class="dev-choice" role="group" aria-label="Nível da base"><button data-base-level="1">1</button><button data-base-level="2">2</button><button data-base-level="3">3</button><button data-base-level="4">4</button></div></div>
            <div class="dev-setting-row"><span>Nível das próximas cartas</span><div class="dev-choice" role="group" aria-label="Nível das próximas cartas"><button data-card-level="1">1</button><button data-card-level="2">2</button><button data-card-level="3">3</button><button data-card-level="4">4</button></div></div>
            <div class="dev-setting-row"><span>Construção instantânea</span><button id="dev-instant-build" class="dev-toggle" aria-pressed="false">DESLIGADO</button></div>
            <div class="dev-setting-row"><span>Limpar tabuleiro</span><button id="dev-clear-board" class="dev-danger-button">REMOVER TUDO</button></div>
          </div>
        </section>
      </div>
      <section id="dev-card-gallery" class="dev-card-gallery" role="dialog" aria-modal="true" aria-labelledby="dev-gallery-title" hidden>
        <header class="dev-gallery-bar">
          <div><small>DEV MODE · PRÓXIMA COMPRA</small><h2 id="dev-gallery-title">Galeria de cartas</h2></div>
          <label class="dev-gallery-search"><span class="sr-only">Buscar carta</span><input id="dev-card-search" type="search" placeholder="Buscar por nome ou habilidade…" autocomplete="off" /></label>
          <label><span>RARIDADE</span><select id="dev-rarity-filter"><option value="">Todas</option></select></label>
          <label><span>TIPO</span><select id="dev-type-filter"><option value="">Todos</option></select></label>
          <label><span>CUSTO</span><select id="dev-cost-filter"><option value="">Todos</option></select></label>
          <button id="dev-gallery-close" class="dev-gallery-close" aria-label="Fechar galeria">×</button>
        </header>
        <div id="dev-gallery-grid" class="dev-gallery-grid" aria-live="polite"></div>
        <p id="dev-gallery-empty" class="dev-gallery-empty" hidden>Nenhuma carta corresponde aos filtros.</p>
        <section id="dev-card-detail" class="dev-card-detail" aria-label="Carta ampliada" hidden>
          <button id="dev-detail-close" aria-label="Voltar para a galeria">×</button>
          <div id="dev-detail-card"></div>
          <div class="dev-detail-copy"><small>PRÓXIMA COMPRA · NÍVEL <b id="dev-detail-level">1</b></small><h3 id="dev-detail-name"></h3><p id="dev-detail-description"></p><button id="dev-choose-card">ESCOLHER ESTA CARTA</button></div>
        </section>
      </section>
    </main>`;
}
