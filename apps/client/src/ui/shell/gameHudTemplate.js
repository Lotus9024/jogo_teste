import { GAME_CONFIG } from '@tronos/shared/game-config';

export function gameHudTemplate() {
  return `
      <section class="battle-status-bar" aria-label="Estado da partida">
        <div id="match-state" class="match-state" hidden><span id="turn-label">Seu turno</span><time id="turn-clock" aria-label="Tempo restante">02:00</time></div>
        <aside id="turn-round-card" class="turn-round-card" aria-label="Rodada" hidden>
          <div><span class="sr-only" aria-hidden="true">Reino ativo <b id="current-turn-number">1</b></span><span>Rodada <b id="current-round-number">1</b></span></div>
        </aside>
      </section>
      <button id="draw-card" class="sr-only" aria-label="Comprar carta do baralho 3D">Comprar carta <span id="deck-count">28</span></button>
      <section id="deck-preview" class="deck-preview" aria-live="polite" aria-hidden="true"></section>
      <aside id="hover-card" class="hover-card unit-card-preview" aria-hidden="true"></aside>
      <button id="settings-toggle" class="settings-toggle" aria-haspopup="dialog" aria-controls="settings-modal" aria-label="Abrir configurações">⚙</button>
      <a class="game-guide-toggle" href="./guide.html" target="_blank" rel="noopener" aria-label="Como jogar (abre em outra aba)" title="Como jogar">?</a>
      <button id="leave-match" class="leave-match" type="button" hidden>SAIR <span>W.O.</span></button>
      <output id="game-error" class="game-error" aria-live="polite"></output>
      <section id="victory-presentation" class="victory-presentation" role="status" aria-live="assertive" hidden>
        <div class="victory-veil" aria-hidden="true"></div>
        <div class="victory-arcane-stage" aria-hidden="true">
          <i class="victory-orbit victory-orbit-outer"></i>
          <i class="victory-orbit victory-orbit-inner"></i>
          <i class="victory-sigil">✦</i>
          <span class="victory-rune victory-rune-north">ᚱ</span>
          <span class="victory-rune victory-rune-east">ᛉ</span>
          <span class="victory-rune victory-rune-south">ᛏ</span>
          <span class="victory-rune victory-rune-west">ᛃ</span>
        </div>
        <div class="victory-shards" aria-hidden="true">
          ${Array.from({ length: 14 }, (_, index) => `<i style="--shard:${index}"></i>`).join('')}
        </div>
        <div class="victory-copy">
          <span id="victory-eyebrow">O DESTINO FOI SELADO</span>
          <h2 id="victory-title">VITÓRIA</h2>
          <i class="victory-divider" aria-hidden="true"><b></b><em>✦</em><b></b></i>
          <p id="victory-subtitle">O trono reconhece seu reinado</p>
          <small id="victory-detail"></small>
        </div>
      </section>
      <section id="mage-altar-choice" class="mage-altar-choice" role="dialog" aria-modal="true" aria-labelledby="mage-altar-choice-title" hidden>
        <div>
          <small>ALTAR MAGO</small>
          <h2 id="mage-altar-choice-title">Escolha uma carta do seu baralho</h2>
          <p>A carta escolhida será colocada na sua mão.</p>
          <div id="mage-altar-choice-cards"></div>
        </div>
      </section>
      <section id="tower-ability-confirm" class="ability-confirm" role="dialog" aria-modal="true" aria-labelledby="tower-ability-confirm-title" hidden>
        <div>
          <h2 id="tower-ability-confirm-title">Usar habilidade da torre?</h2>
          <div><button id="tower-ability-cancel" type="button" aria-label="Cancelar">×</button><button id="tower-ability-accept" type="button" aria-label="Confirmar">✓</button></div>
        </div>
      </section>
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
      <div class="bottom-command" role="group" aria-label="Recursos e comando do turno">
        <div class="command-resource level" aria-label="Nível do castelo" aria-describedby="level-requirement"><small>Castelo</small><b id="self-level">LV 1</b><span id="level-requirement" class="sr-only">Nível 2: tenha ${GAME_CONFIG.level2CitizenRequirement} cidadãos e ${GAME_CONFIG.level2RoadRequirement} rua concluída em seu reino. Ao evoluir, receba 2 de energia imediatamente.</span></div>
        <div class="command-resource energy" aria-label="Energia"><small>Energia</small><b id="self-energy">10<em>/${GAME_CONFIG.maxEnergy}</em></b></div>
        <button id="end-turn" type="button">Passar turno <span aria-hidden="true">→</span></button>
        <div class="command-resource health" aria-label="Vida"><small>Vida</small><b id="self-health">${GAME_CONFIG.startingBaseHp}<em>/${GAME_CONFIG.startingBaseHp}</em></b></div>
        <div class="command-resource citizens" id="citizen-resource" aria-label="Cidadãos"><small>Cidadãos</small><b><strong id="self-citizens">0</strong></b></div>
      </div>
      <div class="loading"><div class="loader-mark">✦</div><span>PREPARANDO O CAMPO</span></div>`;
}
