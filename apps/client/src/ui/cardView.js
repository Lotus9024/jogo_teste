import { CARD_CATEGORY_LABELS, CARD_DEFINITIONS } from '@tronos/shared/cards';
import { cardIconMarkup } from './cardIcon.js';

export const cards = CARD_DEFINITIONS.map(card => {
  const featuredAbility = card.instant.enabled
    ? card.instant
    : card.ability.enabled
      ? card.ability
      : { name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade acionável.', enabled: false };
  return {
    ...card,
    categoryLabel: CARD_CATEGORY_LABELS[card.category],
    ability: featuredAbility.name,
    abilityCost: featuredAbility.cost,
    hasAbility: featuredAbility.enabled,
    abilityText: featuredAbility.description,
    abilityKind: card.instant.enabled ? 'instant' : 'normal'
  };
});

const bootIcon = '<svg class="stat-boot" viewBox="0 0 24 24"><path d="M5 2h8v9.5c0 1.5 1.2 2.5 2.8 2.5H20c1.1 0 2 .9 2 2v4H9a6 6 0 0 1-6-6V9h2V2Z"/></svg>';
const hourglassIcon = '<span aria-hidden="true">⌛</span>';

function combatStats(card) {
  const stats = [];
  const add = (label, icon, value, attribute = '') => stats.push(`<span aria-label="${label}"><small aria-hidden="true">${icon}</small><b${attribute}>${value}</b></span>`);
  if (card.type === 'terrain') {
    if (card.buildRounds > 0) add('Construção', hourglassIcon, `${card.buildRounds}R`);
    return stats.join('');
  }
  if (card.type === 'spell') {
    if (card.damage > 0) add('Dano', '⚔', card.damage);
    add('Alcance', '✦', '∞');
    return stats.join('');
  }
  const resistanceLabel = ['construction', 'machine'].includes(card.type) ? 'Resistência' : 'Vida';
  if (Number.isFinite(card.hp) && card.hp > 0) add(resistanceLabel, '♥', card.hp, ' data-stat="hp"');
  if (card.damage > 0) add('Dano', '⚔', card.damage);
  if (card.buildRounds > 0) add('Construção', hourglassIcon, `${card.buildRounds}R`, ' data-stat="build"');
  else if (card.move > 0) add('Movimento', bootIcon, card.move);
  return stats.join('');
}

function abilityMarkup(card, preview = false) {
  if (!card.hasAbility) return '';
  const className = preview ? 'preview-ability' : 'card-ability';
  const costClass = preview ? 'preview-ability-cost' : 'ability-cost';
  return `<span class="${className}" aria-label="Habilidade ${card.ability}"><span><strong>${card.ability}</strong></span><b class="${costClass}">${card.abilityCost}</b><p>${card.abilityText}</p></span>`;
}

export function cardCostText(card) {
  if (card.dynamicCost && !Number.isFinite(card.effectiveCost)) return '—';
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
  const readableCopy = Boolean(copyClass);
  const readableClass = readableCopy ? ' copy-readable' : '';
  const descSize = Math.max(7.5, Math.min(9, 1100 / card.description.length));
  const abilitySize = Math.max(7.5, Math.min(8, 1050 / card.abilityText.length));
  const categoryLabel = card.categoryLabel ?? CARD_CATEGORY_LABELS[card.category];
  const abilityClass = card.hasAbility ? ' has-ability' : ' no-ability';
  return `<button class="game-card rarity-${card.rarityClass} category-${card.category}${abilityClass}${copyClass}${readableClass}" style="--desc-size:${descSize}px;--ability-size:${abilitySize}px" data-card="${index}"${levelAttribute} aria-label="Carta ${card.name}, categoria ${categoryLabel}, ${card.rarity}${level ? `, nível ${level}` : ''}">
    <span class="card-top"><span class="card-heading"><strong class="card-name">${card.name}</strong><small class="card-category">${categoryLabel}</small></span><span class="card-top-cost">${cardCostMarkup(card)}</span></span>
    <span class="card-art">${cardIconMarkup(card)}</span>
    <span class="card-description">${card.description}</span>
    <span class="card-main-row"><span class="card-combat-stats">${combatStats(card)}</span></span>
    ${abilityMarkup(card)}
  </button>`;
}

export function showDeckPreview(element, card) {
  element.className = `deck-preview rarity-${card.rarityClass}`;
  element.innerHTML = `
    <div class="preview-top"><b class="preview-cost">${card.dynamicCost ? '—' : card.cost}</b><span class="preview-heading"><strong>${card.name}</strong><small>${card.categoryLabel ?? CARD_CATEGORY_LABELS[card.category]}</small></span><i class="preview-gem"></i></div>
    <div class="preview-art">${cardIconMarkup(card)}</div><p class="preview-description">${card.description}</p>
    <div class="preview-stats">${combatStats(card)}</div>
    ${abilityMarkup(card, true)}`;
  element.classList.add('visible');
  element.setAttribute('aria-hidden', 'false');
}

export function hideDeckPreview(element) {
  element.classList.remove('visible');
  element.setAttribute('aria-hidden', 'true');
}
