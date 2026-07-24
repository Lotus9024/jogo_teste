import { CARD_BY_ID, CARD_CATEGORY_LABELS, DECK_LIMITS, deckCounts, normalizeDeckCardIds, validateDeckCardIds } from '@tronos/shared/cards';
import { cardMarkup, cards as availableCards } from './cardView.js';

const STORAGE_KEY = 'tronos.deck.v1';
const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2 };
const orderedCards = [...availableCards].sort((left, right) =>
  RARITY_ORDER[left.rarityClass] - RARITY_ORDER[right.rarityClass]
  || left.name.localeCompare(right.name, 'pt-BR')
);

export function createDeckBuilderController() {
  const modal = document.querySelector('#deck-builder');
  const library = document.querySelector('#deck-library-cards');
  const preview = document.querySelector('#deck-builder-card-preview');
  const error = document.querySelector('#deck-builder-error');
  let selected = load();

  function load() {
    try { return normalizeDeckCardIds(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); }
    catch { return []; }
  }

  function render() {
    hidePreview();
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
    library.innerHTML = orderedCards.map(card => `
      <button type="button" class="deck-library-card rarity-${card.rarityClass}${selected.includes(card.id) ? ' selected' : ''}" draggable="true" data-card-id="${card.id}">
        <b aria-hidden="true">${card.glyph}</b>
        <span>${card.name}</span>
        <small>${card.rarity} · ${CARD_CATEGORY_LABELS[card.category]}</small>
      </button>`).join('');
    library.querySelectorAll('[data-card-id]').forEach((button, index) => {
      const card = orderedCards[index];
      button.addEventListener('click', () => toggle(button.dataset.cardId));
      button.addEventListener('dragstart', event => event.dataTransfer.setData('text/card-id', button.dataset.cardId));
      button.addEventListener('mouseenter', () => showPreview(button, card, index));
      button.addEventListener('mouseleave', hidePreview);
      button.addEventListener('focus', () => showPreview(button, card, index));
      button.addEventListener('blur', hidePreview);
    });
    const complete = Object.entries(DECK_LIMITS).every(([rarity, limit]) => counts[rarity] === limit);
    document.querySelector('#deck-builder-save').disabled = !complete;
    document.querySelector('#deck-status').textContent = complete ? `${selected.length} CARTAS` : 'INCOMPLETO';
  }

  function showPreview(button, card, index) {
    preview.innerHTML = cardMarkup(card, index);
    preview.hidden = false;
    const bounds = button.getBoundingClientRect();
    const previewWidth = window.innerWidth <= 620 ? 196 : 236;
    const previewHeight = window.innerWidth <= 620 ? 372 : 400;
    const left = bounds.right + 14 + previewWidth <= window.innerWidth
      ? bounds.right + 14
      : Math.max(12, bounds.left - previewWidth - 14);
    preview.style.left = `${left}px`;
    preview.style.top = `${Math.max(12, Math.min(bounds.top - 120, window.innerHeight - previewHeight - 12))}px`;
  }

  function hidePreview() {
    preview.hidden = true;
    preview.replaceChildren();
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
  function close() { hidePreview(); modal.hidden = true; }
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
  const initialCounts = deckCounts(selected);
  const initialComplete = Object.entries(DECK_LIMITS).every(([rarity, limit]) => initialCounts[rarity] === limit);
  document.querySelector('#deck-status').textContent = initialComplete ? `${selected.length} CARTAS` : 'INCOMPLETO';
  return { open, close, getDeckCardIds: () => validateDeckCardIds(selected) };
}
