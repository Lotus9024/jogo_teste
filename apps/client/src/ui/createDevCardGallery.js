import { cardMarkup, cards } from './cardView.js';

export function createDevCardGallery({ state, app, controls, hand, showGameError }) {
  const gallery = document.querySelector('#dev-card-gallery');
  const grid = document.querySelector('#dev-gallery-grid');
  const detail = document.querySelector('#dev-card-detail');
  const search = document.querySelector('#dev-card-search');
  const rarityFilter = document.querySelector('#dev-rarity-filter');
  const typeFilter = document.querySelector('#dev-type-filter');
  const costFilter = document.querySelector('#dev-cost-filter');
  let cardIndex = 0;

  const normalizeSearch = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const cardTypeLabel = card => card.type ?? 'unit';

  function fillFilters() {
    [...new Set(cards.map(card => card.rarity))]
      .sort()
      .forEach(value => rarityFilter.add(new Option(value, value)));
    [...new Set(cards.map(card => cardTypeLabel(card)))]
      .sort()
      .forEach(value => typeFilter.add(new Option(value === 'unit' ? 'UNIDADE' : value.toUpperCase(), value)));
    [...new Set(cards.map(card => card.cost))]
      .sort((a, b) => a - b)
      .forEach(value => costFilter.add(new Option(String(value), String(value))));
  }

  function render() {
    const query = normalizeSearch(search.value);
    const rarity = rarityFilter.value;
    const type = typeFilter.value;
    const cost = costFilter.value;
    grid.replaceChildren();
    cards.forEach((card, index) => {
      const haystack = normalizeSearch(`${card.name} ${card.description} ${card.ability} ${card.abilityText}`);
      if (
        (query && !haystack.includes(query))
        || (rarity && card.rarity !== rarity)
        || (type && cardTypeLabel(card) !== type)
        || (cost && String(card.cost) !== cost)
      ) return;
      const item = document.createElement('article');
      item.className = 'dev-gallery-card';
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', `Ampliar ${card.name}`);
      item.dataset.cardIndex = String(index);
      item.innerHTML = cardMarkup(card, index, { level: state.devCardLevel });
      grid.appendChild(item);
    });
    document.querySelector('#dev-gallery-empty').hidden = Boolean(grid.children.length);
  }

  function open() {
    if (!state.devMode) return;
    gallery.hidden = false;
    controls.enabled = false;
    detail.hidden = true;
    search.value = '';
    rarityFilter.value = '';
    typeFilter.value = '';
    costFilter.value = '';
    render();
    requestAnimationFrame(() => search.focus());
  }

  function close() {
    gallery.hidden = true;
    detail.hidden = true;
    controls.enabled = true;
    app.focus({ preventScroll: true });
  }

  function showDetail(index) {
    const card = cards[index];
    if (!card) return;
    cardIndex = index;
    document.querySelector('#dev-detail-card').innerHTML = cardMarkup(card, index, {
      level: state.devCardLevel,
    });
    document.querySelector('#dev-detail-level').textContent = String(state.devCardLevel);
    document.querySelector('#dev-detail-name').textContent = card.name;
    document.querySelector('#dev-detail-description').textContent = card.description;
    detail.hidden = false;
    document.querySelector('#dev-choose-card').focus();
  }

  function chooseCard() {
    const holder = document.createElement('div');
    holder.innerHTML = cardMarkup(cards[cardIndex], cardIndex, { level: state.devCardLevel });
    const node = holder.firstElementChild;
    node.dataset.instance = `dev-${crypto.randomUUID()}`;
    hand.appendChild(node);
    document.querySelector('#hand-count').textContent = `${hand.children.length} CARTAS`;
    hand.classList.add('reflow');
    setTimeout(() => hand.classList.remove('reflow'), 600);
    close();
    showGameError(`${cards[cardIndex].name} nível ${state.devCardLevel} adicionada à mão.`);
  }

  fillFilters();
  [search, rarityFilter, typeFilter, costFilter].forEach(control => {
    control.addEventListener(control === search ? 'input' : 'change', render);
  });
  grid.addEventListener('click', event => {
    const item = event.target.closest('.dev-gallery-card');
    if (item) showDetail(Number(item.dataset.cardIndex));
  });
  grid.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    const item = event.target.closest('.dev-gallery-card');
    if (!item) return;
    event.preventDefault();
    showDetail(Number(item.dataset.cardIndex));
  });
  document.querySelector('#dev-gallery-close').addEventListener('click', close);
  document.querySelector('#dev-detail-close').addEventListener('click', () => {
    detail.hidden = true;
    grid.querySelector(`[data-card-index="${cardIndex}"]`)?.focus();
  });
  document.querySelector('#dev-choose-card').addEventListener('click', chooseCard);
  addEventListener('keydown', event => {
    if (event.key !== 'Escape' || gallery.hidden) return;
    if (!detail.hidden) {
      detail.hidden = true;
      return;
    }
    close();
  });

  return {
    open,
    close,
    render,
    showDetail,
    isOpen: () => !gallery.hidden,
    isDetailOpen: () => !detail.hidden,
    selectedIndex: () => cardIndex,
  };
}
