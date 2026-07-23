import { CARD_CATEGORY_LABELS, CARD_DEFINITIONS } from '@tronos/shared/cards';

export const cards = CARD_DEFINITIONS.map(card => {
  const featuredAbility = card.instant.enabled ? card.instant : card.ability;
  return {
    ...card,
    categoryLabel: CARD_CATEGORY_LABELS[card.category],
    ability: featuredAbility.name,
    abilityCost: featuredAbility.cost,
    abilityText: featuredAbility.enabled
      ? `${featuredAbility.description} Aperte F selecionando a tropa para utilizar.`
      : featuredAbility.description,
    abilityKind: card.instant.enabled ? 'instant' : 'normal'
  };
});

const bootIcon = '<svg class="stat-boot" viewBox="0 0 24 24"><path d="M5 2h8v9.5c0 1.5 1.2 2.5 2.8 2.5H20c1.1 0 2 .9 2 2v4H9a6 6 0 0 1-6-6V9h2V2Z"/></svg>';
const hourglassIcon = '<span aria-hidden="true">⌛</span>';

function combatStats(card) {
  if (card.type === 'terrain') {
    const finalLabel = card.buildRounds ? 'Construção' : 'Permanente';
    const finalIcon = card.buildRounds ? hourglassIcon : '<span aria-hidden="true">∞</span>';
    const finalValue = card.buildRounds ? `${card.buildRounds}R` : '∞';
    return `<span aria-label="Vida"><small aria-hidden="true">♥</small><b>—</b></span><span aria-label="Dano"><small aria-hidden="true">⚔</small><b>—</b></span><span aria-label="${finalLabel}"><small aria-hidden="true">${finalIcon}</small><b>${finalValue}</b></span>`;
  }
  const needsConstruction = Boolean(card.buildRounds);
  const damage = card.type === 'construction' ? '—' : card.damage;
  const lastLabel = needsConstruction ? 'Construção' : 'Movimento';
  const lastIcon = needsConstruction ? hourglassIcon : bootIcon;
  const lastValue = needsConstruction ? `${card.buildRounds}R` : card.move;
  const resistanceLabel = ['construction', 'machine'].includes(card.type) ? 'Resistência' : 'Vida';
  return `<span aria-label="${resistanceLabel}"><small aria-hidden="true">♥</small><b data-stat="hp">${card.hp}</b></span><span aria-label="Dano"><small aria-hidden="true">⚔</small><b>${damage}</b></span><span aria-label="${lastLabel}"><small aria-hidden="true">${lastIcon}</small><b>${lastValue}</b></span>`;
}

export function cardCostText(card) {
  const baseCost = Number.isFinite(card.baseCost) ? card.baseCost : card.cost;
  const effectiveCost = Number.isFinite(card.effectiveCost) ? card.effectiveCost : card.cost;
  const discount = Math.max(0, baseCost - effectiveCost);
  return discount ? `${effectiveCost} (-${discount})` : `${effectiveCost}`;
}

function cardCostMarkup(card) {
  const value = cardCostText(card);
  const [effectiveCost, discount] = value.split(' ');
  return discount
    ? `<b>${effectiveCost}</b><small class="card-cost-discount">${discount}</small>`
    : `<b>${effectiveCost}</b>`;
}

export function cardMarkup(card, index, { level = null } = {}) {
  const levelAttribute = Number.isInteger(level) ? ` data-card-level="${level}"` : '';
  const copyClass = card.description.length > 180 || card.abilityText.length > 220 ? ' copy-very-long' : card.description.length > 115 || card.abilityText.length > 150 ? ' copy-long' : '';
  const descSize = Math.max(5, Math.min(9, 1100 / card.description.length));
  const abilitySize = Math.max(5, Math.min(8, 1050 / card.abilityText.length));
  const categoryLabel = card.categoryLabel ?? CARD_CATEGORY_LABELS[card.category];
  return `<button class="game-card rarity-${card.rarityClass} category-${card.category}${copyClass}" style="--desc-size:${descSize}px;--ability-size:${abilitySize}px" data-card="${index}"${levelAttribute} aria-label="Carta ${card.name}, categoria ${categoryLabel}, ${card.rarity}${level ? `, nível ${level}` : ''}">
    <span class="card-top"><span class="card-heading"><strong class="card-name">${card.name}</strong><small class="card-category">${categoryLabel}</small></span><span class="card-top-cost">${cardCostMarkup(card)}</span></span>
    <span class="card-art"><span>${card.glyph}</span></span>
    <span class="card-description">${card.description}</span>
    <span class="card-main-row"><span class="card-combat-stats">${combatStats(card)}</span></span>
    <span class="card-ability" aria-label="Habilidade ${card.ability}"><span><strong>${card.ability}</strong></span><b class="ability-cost">${card.abilityCost}</b><p>${card.abilityText}</p></span>
  </button>`;
}

export function showDeckPreview(element, card) {
  element.className = `deck-preview rarity-${card.rarityClass}`;
  element.innerHTML = `
    <div class="preview-top"><b class="preview-cost">${card.cost}</b><span class="preview-heading"><strong>${card.name}</strong><small>${card.categoryLabel ?? CARD_CATEGORY_LABELS[card.category]}</small></span><i class="preview-gem"></i></div>
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
