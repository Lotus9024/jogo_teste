import { randomUUID } from 'node:crypto';
import { CARD_BY_ID } from '@tronos/shared/cards';
import { fail } from '../gameQueries.js';
import { requireTurn } from '../turnLifecycle.js';

export function chooseDeckCardAction(state, player, _opponent, action) {
  requireTurn(state, player);
  if ((player.pendingMageAltarChoices ?? 0) < 1) fail('Nenhuma escolha do Altar Mago está disponível.');
  const card = CARD_BY_ID[action.cardId];
  if (!card || !['common', 'uncommon', 'rare'].includes(card.rarityClass)) fail('Carta inválida.');
  const deckIndex = player.deck.findIndex(cardId => cardId === card.id);
  if (deckIndex < 0) fail('Essa carta não está mais no seu baralho.');
  player.deck.splice(deckIndex, 1);
  player.hand.push({ instanceId: randomUUID(), cardId: card.id });
  player.pendingMageAltarChoices -= 1;
}
