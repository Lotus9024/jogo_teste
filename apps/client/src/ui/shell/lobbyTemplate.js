export function lobbyTemplate() {
  return `
    <section id="online-lobby" class="online-lobby" aria-labelledby="lobby-title">
      <div class="lobby-panel">
        <span class="lobby-kicker">TRONOS EM RUÍNAS · ONLINE</span>
        <h1 id="lobby-title">Erga seu reino</h1>
        <p>Crie uma sala privada ou entre usando o código de outro rei.</p>
        <label class="lobby-field"><span>NOME DO REI</span><input id="player-name" maxlength="24" autocomplete="nickname" value="Rei do Corvo" /></label>
        <div class="lobby-actions">
          <button id="open-deck-builder" class="deck-menu-button">DECK <small id="deck-status">NÃO MONTADO</small></button>
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
    </section>`;
}
