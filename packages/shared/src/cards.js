// Public compatibility facade. Existing consumers continue importing
// `@tronos/shared/cards` while implementation details stay separated by domain.
export { CARD_BY_ID, CARD_CATEGORY_LABELS, CARD_DEFINITIONS } from './cardCatalog.js';
export { effectiveCardCost, goblinSpawnHp, isBasicCard, isGoblinCard, isGoblinTroop, isMageCard } from './cardCosts.js';
export {
  ORTHOGONAL_DIRECTIONS,
  baseCellsForSeat,
  cellKey,
  deploymentDistance,
  forwardDeltaForSeat,
  gridCellsBetween,
  isAttackDistanceValid,
  isAttackTargetValid,
  isCannonTargetValid,
  isDeploymentCell,
  movementDistance
} from './boardRules.js';
export {
  citizensForSeat,
  completedRoadCount,
  connectedRoadKeys,
  isRoadCard,
  isRoadPlacementCell,
  roadAttackBonus,
  roadMovementBonus
} from './kingdomEconomy.js';
export { DEFAULT_DECK_CARD_IDS, DECK_LIMITS, DECK_RARITIES, deckCounts, normalizeDeckCardIds, validateDeckCardIds } from './deckRules.js';
