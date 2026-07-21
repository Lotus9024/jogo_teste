import { CARD_DEFINITIONS } from '@tronos/shared/cards';

export const cards = CARD_DEFINITIONS.map(card => {
  const featuredAbility = card.instant.enabled ? card.instant : card.ability;
  return {
    ...card,
    ability: featuredAbility.name,
    abilityCost: featuredAbility.cost,
    abilityText: featuredAbility.description,
    abilityKind: card.instant.enabled ? 'instant' : 'normal'
  };
});

const bootIcon = '<svg class="stat-boot" viewBox="0 0 24 24"><path d="M5 2h8v9.5c0 1.5 1.2 2.5 2.8 2.5H20c1.1 0 2 .9 2 2v4H9a6 6 0 0 1-6-6V9h2V2Z"/></svg>';
const hourglassIcon = '<span aria-hidden="true">⌛</span>';

function combatStats(card) {
  if (card.type === 'terrain') return `<span aria-label="Vida"><small aria-hidden="true">♥</small><b>—</b></span><span aria-label="Dano"><small aria-hidden="true">⚔</small><b>—</b></span><span aria-label="Permanente"><small aria-hidden="true">∞</small><b>∞</b></span>`;
  const needsConstruction = Boolean(card.buildRounds);
  const damage = card.type === 'construction' ? '—' : card.damage;
  const lastLabel = needsConstruction ? 'Construção' : 'Movimento';
  const lastIcon = needsConstruction ? hourglassIcon : bootIcon;
  const lastValue = needsConstruction ? `${card.buildRounds}R` : card.move;
  return `<span aria-label="Vida"><small aria-hidden="true">♥</small><b data-stat="hp">${card.hp}</b></span><span aria-label="Dano"><small aria-hidden="true">⚔</small><b>${damage}</b></span><span aria-label="${lastLabel}"><small aria-hidden="true">${lastIcon}</small><b>${lastValue}</b></span>`;
}

export function cardMarkup(card, index, { level = null } = {}) {
  const levelAttribute = Number.isInteger(level) ? ` data-card-level="${level}"` : '';
  return `<button class="game-card rarity-${card.rarityClass}" data-card="${index}"${levelAttribute} aria-label="Carta ${card.name}, ${card.rarity}${level ? `, nível ${level}` : ''}">
    <span class="card-top"><strong class="card-name">${card.name}</strong><span class="card-top-cost"><b>${card.cost}</b></span></span>
    <span class="card-art"><span>${card.glyph}</span></span>
    <span class="card-description">${card.description}</span>
    <span class="card-main-row"><span class="card-combat-stats">${combatStats(card)}</span></span>
    <span class="card-ability" aria-label="Habilidade ${card.ability}"><span><strong>${card.ability}</strong></span><b class="ability-cost">${card.abilityCost}</b><p>${card.abilityText}</p></span>
  </button>`;
}

export function showDeckPreview(element, card) {
  element.className = `deck-preview rarity-${card.rarityClass}`;
  element.innerHTML = `
    <div class="preview-top"><b class="preview-cost">${card.cost}</b><strong>${card.name}</strong><i class="preview-gem"></i></div>
    <div class="preview-art"><span>${card.glyph}</span></div><p class="preview-description">${card.description}</p>
    <div class="preview-stats">${combatStats(card)}</div>
    <div class="preview-ability" aria-label="Habilidade ${card.ability}"><strong>${card.ability}</strong><b class="preview-ability-cost">${card.abilityCost}</b><p>${card.abilityText}</p></div>`;
  element.classList.add('visible');
  element.setAttribute('aria-hidden', 'false');
}

export function hideDeckPreview(element) {
  element.classList.remove('visible');
  element.setAttribute('aria-hidden', 'true');
}
