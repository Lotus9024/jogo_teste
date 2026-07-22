import { CARD_BY_ID, CARD_DEFINITIONS, DECK_LIMITS, deckCounts, normalizeDeckCardIds, validateDeckCardIds } from '@tronos/shared/cards';

const STORAGE_KEY = 'tronos.deck.v1';

export function createDeckBuilderController() {
  const modal = document.querySelector('#deck-builder');
  const library = document.querySelector('#deck-library-cards');
  const error = document.querySelector('#deck-builder-error');
  let selected = load();

  function load() {
    try { return normalizeDeckCardIds(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); }
    catch { return []; }
  }

  function render() {
    const counts = deckCounts(selected);
    Object.entries(DECK_LIMITS).forEach(([rarity, limit]) => {
      document.querySelector(`[data-deck-count="${rarity}"]`).textContent = `${counts[rarity]}/${limit}`;
      const cards = selected.filter(id => CARD_BY_ID[id].rarityClass === rarity);
      document.querySelectorAll(`.deck-slot[data-rarity="${rarity}"]`).forEach((slot, index) => {
        const card = CARD_BY_ID[cards[index]];
        slot.className = `deck-slot${card ? ` filled rarity-${rarity}` : ''}`;
        slot.dataset.cardId = card?.id ?? '';
        slot.innerHTML = card ? `<b>${card.glyph}</b><span>${card.name}</span>` : '<i>+</i>';
      });
    });
    library.innerHTML = CARD_DEFINITIONS.map(card => `<button class="deck-library-card rarity-${card.rarityClass}${selected.includes(card.id) ? ' selected' : ''}" draggable="true" data-card-id="${card.id}"><b>${card.glyph}</b><span>${card.name}</span><small>${card.rarity}</small></button>`).join('');
    library.querySelectorAll('[data-card-id]').forEach(button => {
      button.addEventListener('click', () => toggle(button.dataset.cardId));
      button.addEventListener('dragstart', event => event.dataTransfer.setData('text/card-id', button.dataset.cardId));
    });
  }

  function toggle(cardId) {
    error.textContent = '';
    if (selected.includes(cardId)) selected = selected.filter(id => id !== cardId);
    else {
      const rarity = CARD_BY_ID[cardId].rarityClass;
      if (deckCounts(selected)[rarity] >= DECK_LIMITS[rarity]) {
        error.textContent = `Limite de cartas ${rarity} atingido.`;
        return;
      }
      selected.push(cardId);
    }
    render();
  }

  function open() { modal.hidden = false; error.textContent = ''; render(); }
  function close() { modal.hidden = true; }
  function save() {
    try {
      selected = validateDeckCardIds(selected);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      document.querySelector('#deck-status').textContent = `${selected.length} CARTAS`;
      close();
    } catch (caught) { error.textContent = caught.message; }
  }

  document.querySelector('#open-deck-builder').addEventListener('click', open);
  document.querySelector('#deck-builder-close').addEventListener('click', close);
  document.querySelector('#deck-builder-save').addEventListener('click', save);
  modal.querySelectorAll('.deck-slots').forEach(group => {
    group.addEventListener('dragover', event => event.preventDefault());
    group.addEventListener('drop', event => {
      event.preventDefault();
      const cardId = event.dataTransfer.getData('text/card-id');
      if (cardId && CARD_BY_ID[cardId]?.rarityClass === group.closest('[data-deck-rarity]').dataset.deckRarity && !selected.includes(cardId)) toggle(cardId);
    });
  });
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.querySelector('#deck-status').textContent = selected.length ? `${selected.length} CARTAS` : 'NÃO MONTADO';
  return { open, close, getDeckCardIds: () => validateDeckCardIds(selected) };
}
