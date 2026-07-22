import { fail } from '../gameQueries.js';
import { requireTurn } from '../turnLifecycle.js';

export function discardAction(state, player, _opponent, action) {
  requireTurn(state, player);
  const index = player.hand.findIndex(card => card.instanceId === action.cardInstanceId);
  if (index < 0) fail('Esta carta não está na sua mão.');
  const [instance] = player.hand.splice(index, 1);
  player.discard.push(instance.cardId);
}
