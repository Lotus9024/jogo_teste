export function devGalleryTemplate() {
  return `
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
      </section>`;
}
