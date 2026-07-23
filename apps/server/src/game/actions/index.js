import { attackAction, mageFireAction } from './attackAction.js';
import { summonGoblinAction, useAbilityAction, useInstantAction } from './abilityAction.js';
import { moveAction } from './moveAction.js';
import { summonAction } from './summonAction.js';
import { discardAction } from './discardAction.js';
import { chooseDeckCardAction } from './deckChoiceAction.js';
import { endTurn, requireTurn } from '../turnLifecycle.js';

export const ACTION_HANDLERS = Object.freeze({
  end_turn(state, player) {
    requireTurn(state, player);
    endTurn(state);
  },
  summon: summonAction,
  discard_card: discardAction,
  choose_deck_card: chooseDeckCardAction,
  move: moveAction,
  mage_fire: mageFireAction,
  attack: attackAction,
  use_ability: useAbilityAction,
  use_instant: useInstantAction,
  summon_goblin: summonGoblinAction
});
