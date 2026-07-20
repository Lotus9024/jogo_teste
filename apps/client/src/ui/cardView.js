import { CARD_DEFINITIONS } from '@tronos/shared/cards';

export const cards = CARD_DEFINITIONS.map(card => ({
  ...card,
  ability: card.ability.name,
  abilityCost: card.ability.cost,
  abilityText: card.ability.description
}));

const bootIcon = '<svg class="stat-boot" viewBox="0 0 24 24"><path d="M5 2h8v9.5c0 1.5 1.2 2.5 2.8 2.5H20c1.1 0 2 .9 2 2v4H9a6 6 0 0 1-6-6V9h2V2Z"/></svg>';

export function cardMarkup(card, index) {
  return `<button class="game-card rarity-${card.rarityClass}" data-card="${index}" aria-label="Carta ${card.name}, ${card.rarity}">
    <span class="card-top"><strong class="card-name">${card.name}</strong><span class="card-top-cost"><b>${card.cost}</b></span></span>
    <span class="card-art"><span>${card.glyph}</span></span>
    <span class="card-description">${card.description}</span>
    <span class="card-main-row"><span class="card-combat-stats"><span aria-label="Vida"><small aria-hidden="true">♥</small><b>${card.hp}</b></span><span aria-label="Dano"><small aria-hidden="true">⚔</small><b>${card.damage}</b></span><span aria-label="Movimento"><small aria-hidden="true">${bootIcon}</small><b>${card.move}</b></span></span></span>
    <span class="card-ability" aria-label="Habilidade ${card.ability}"><span><strong>${card.ability}</strong></span><b class="ability-cost">${card.abilityCost}</b><p>${card.abilityText}</p></span>
  </button>`;
}

export function showDeckPreview(element, card) {
  element.className = `deck-preview rarity-${card.rarityClass}`;
  element.innerHTML = `
    <div class="preview-top"><b class="preview-cost">${card.cost}</b><strong>${card.name}</strong><i class="preview-gem"></i></div>
    <div class="preview-art"><span>${card.glyph}</span></div><p class="preview-description">${card.description}</p>
    <div class="preview-stats"><span aria-label="Vida"><small aria-hidden="true">♥</small><b>${card.hp}</b></span><span aria-label="Dano"><small aria-hidden="true">⚔</small><b>${card.damage}</b></span><span aria-label="Movimento"><small aria-hidden="true">${bootIcon}</small><b>${card.move}</b></span></div>
    <div class="preview-ability" aria-label="Habilidade ${card.ability}"><strong>${card.ability}</strong><b class="preview-ability-cost">${card.abilityCost}</b><p>${card.abilityText}</p></div>`;
  element.classList.add('visible');
  element.setAttribute('aria-hidden', 'false');
}

export function hideDeckPreview(element) {
  element.classList.remove('visible');
  element.setAttribute('aria-hidden', 'true');
}
