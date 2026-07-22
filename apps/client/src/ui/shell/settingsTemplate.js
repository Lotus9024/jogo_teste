export function settingsTemplate() {
  return `
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
      </div>`;
}
