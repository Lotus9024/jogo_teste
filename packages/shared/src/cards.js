// Public compatibility facade. Existing consumers continue importing
// `@tronos/shared/cards` while implementation details stay separated by domain.
export { CARD_BY_ID, CARD_DEFINITIONS } from './cardCatalog.js';
export {
  ORTHOGONAL_DIRECTIONS,
  baseCellsForSeat,
  cellKey,
  deploymentDistance,
  forwardDeltaForSeat,
  gridCellsBetween,
  isAttackDistanceValid,
  isCannonTargetValid,
  isDeploymentCell,
  movementDistance
} from './boardRules.js';
export {
  citizensForSeat,
  completedRoadCount,
  connectedRoadKeys,
  isRoadPlacementCell,
  roadMovementBonus
} from './kingdomEconomy.js';
