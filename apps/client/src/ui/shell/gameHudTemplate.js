import { GAME_CONFIG } from '@tronos/shared/game-config';

export function gameHudTemplate() {
  return `
      <aside id="turn-round-card" class="turn-round-card" aria-label="Turno e rodada" hidden>
        <div><span>Turno <b id="current-turn-number">1</b></span><span>Rodada <b id="current-round-number">1</b></span></div>
      </aside>
      <button id="draw-card" class="sr-only" aria-label="Comprar carta do baralho 3D">Comprar carta <span id="deck-count">28</span></button>
      <section id="deck-preview" class="deck-preview" aria-live="polite" aria-hidden="true"></section>
      <aside id="hover-card" class="hover-card unit-card-preview" aria-hidden="true"></aside>
      <div id="match-state" class="match-state" hidden><span id="turn-label">SEU TURNO</span><time id="turn-clock">02:00</time></div>
      <button id="settings-toggle" class="settings-toggle" aria-haspopup="dialog" aria-controls="settings-modal" aria-label="Abrir configurações">⚙</button>
      <output id="game-error" class="game-error" aria-live="polite"></output>
      <div class="base-health enemy-base-tag" role="img" aria-label="Vida do castelo inimigo: ${GAME_CONFIG.startingBaseHp} de ${GAME_CONFIG.startingBaseHp}"><b id="enemy-base-level">LV 1</b><i style="width:100%"></i></div>
      <section class="card-dock" aria-label="Mão de cartas">
        <b id="hand-count" class="sr-only">7 CARTAS</b>
        <div id="card-hand" class="card-hand"></div>
      </section>
      <section id="dev-unit-tools" class="dev-unit-tools" aria-label="Ferramentas da unidade selecionada" hidden>
        <div><small>UNIDADE SELECIONADA</small><strong id="dev-unit-name">—</strong></div>
        <div class="dev-unit-levels" role="group" aria-label="Nível da unidade"><span>NÍVEL</span><button data-unit-level="1">1</button><button data-unit-level="2">2</button><button data-unit-level="3">3</button><button data-unit-level="4">4</button></div>
        <button id="dev-delete-unit" class="dev-danger-button">EXCLUIR</button>
      </section>
      <div class="bottom-command">
        <div class="command-resource level" tabindex="0" aria-describedby="level-requirement"><small>CASTELO</small><b id="self-level">LV 1</b><span id="level-requirement" role="tooltip">Nível 2: tenha ${GAME_CONFIG.level2CitizenRequirement} cidadãos e ${GAME_CONFIG.level2RoadRequirement} rua concluída em seu reino. Ao evoluir, receba 2 de energia imediatamente.</span></div>
        <div class="command-resource energy" aria-label="Energia"><small>ENERGIA</small><b id="self-energy">10<em>/${GAME_CONFIG.maxEnergy}</em></b></div>
        <button id="end-turn">PASSAR TURNO</button>
        <div class="command-resource health" aria-label="Vida"><small>VIDA</small><b id="self-health">${GAME_CONFIG.startingBaseHp}<em>/${GAME_CONFIG.startingBaseHp}</em></b></div>
        <div class="command-resource citizens" id="citizen-resource" aria-label="Cidadãos"><small>CIDADÃOS</small><b><span aria-hidden="true">☺</span> <strong id="self-citizens">0</strong></b></div>
      </div>
      <div class="loading"><div class="loader-mark">✦</div><span>PREPARANDO O CAMPO</span></div>`;
}
