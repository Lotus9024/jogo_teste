import { DECK_FUTURE_LIMITS, DECK_LIMITS } from '@tronos/shared/cards';

const labels = {
  common: 'Comuns',
  uncommon: 'Incomuns',
  rare: 'Raras',
  legendary: 'Lendárias',
  mystic: 'Místicas',
};

export function deckBuilderTemplate() {
  const groups = Object.entries(DECK_LIMITS).map(([rarity, limit]) => {
    const futureLimit = DECK_FUTURE_LIMITS[rarity];
    return `
    <section class="deck-rarity-group${limit === 0 ? ' deck-rarity-locked' : ''}" data-deck-rarity="${rarity}">
      <header><h3>${labels[rarity]}</h3><span data-deck-count="${rarity}">0/${limit}</span></header>
      ${limit > 0
        ? `<div class="deck-slots">${Array.from({ length: limit }, (_, index) => `<button class="deck-slot" data-rarity="${rarity}" data-slot="${index}" aria-label="Espaço de carta ${index + 1}"></button>`).join('')}</div>`
        : `<p class="deck-rarity-future">Ainda indisponível <span>Futuro: ${futureLimit} ${futureLimit === 1 ? 'carta' : 'cartas'}</span></p>`}
    </section>`;
  }).join('');
  return `<section id="deck-builder" class="deck-builder" role="dialog" aria-modal="true" aria-labelledby="deck-builder-title" hidden>
    <div class="deck-builder-panel">
      <header class="deck-builder-heading"><div><small>SEU BARALHO PESSOAL</small><h2 id="deck-builder-title">Monte seu Deck</h2></div><button id="deck-builder-close" aria-label="Fechar seletor">×</button></header>
      <div class="deck-groups">${groups}</div>
      <section class="deck-library"><h3>Cartas disponíveis</h3><p>Passe o mouse para ver a descrição. Clique ou arraste para adicionar.</p><div id="deck-library-cards"></div></section>
      <footer><output id="deck-builder-error" aria-live="polite"></output><button id="deck-builder-save" class="lobby-primary">SALVAR DECK</button></footer>
    </div>
    <aside id="deck-builder-card-preview" class="deck-builder-card-preview" aria-live="polite" hidden></aside>
  </section>`;
}
