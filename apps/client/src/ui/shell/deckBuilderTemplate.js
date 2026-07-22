import { DECK_LIMITS } from '@tronos/shared/cards';

const labels = { common: 'Comuns', uncommon: 'Incomuns', rare: 'Raras' };

export function deckBuilderTemplate() {
  const groups = Object.entries(DECK_LIMITS).map(([rarity, limit]) => `
    <section class="deck-rarity-group" data-deck-rarity="${rarity}">
      <header><h3>${labels[rarity]}</h3><span data-deck-count="${rarity}">0/${limit}</span></header>
      <div class="deck-slots">${Array.from({ length: limit }, (_, index) => `<button class="deck-slot" data-rarity="${rarity}" data-slot="${index}" aria-label="Espaço de carta ${index + 1}"></button>`).join('')}</div>
    </section>`).join('');
  return `<section id="deck-builder" class="deck-builder" role="dialog" aria-modal="true" aria-labelledby="deck-builder-title" hidden>
    <div class="deck-builder-panel">
      <header class="deck-builder-heading"><div><small>BARALHO DO REINO</small><h2 id="deck-builder-title">Monte seu Deck</h2><p>Escolha pelo menos uma carta de cada raridade. Por enquanto, os limites 9/7/5 não precisam ser preenchidos.</p></div><button id="deck-builder-close" aria-label="Fechar seletor">×</button></header>
      <div class="deck-groups">${groups}</div>
      <section class="deck-library"><h3>Cartas disponíveis</h3><p>Clique ou arraste uma carta para adicioná-la. Clique novamente para remover.</p><div id="deck-library-cards"></div></section>
      <footer><output id="deck-builder-error" aria-live="polite"></output><button id="deck-builder-save" class="lobby-primary">SALVAR DECK</button></footer>
    </div>
  </section>`;
}
