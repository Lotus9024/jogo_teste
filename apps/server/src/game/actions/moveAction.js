import { CARD_BY_ID, forwardDeltaForSeat, isGoblinTroop, movementDistance, roadMovementBonus } from '@tronos/shared/cards';
import { applyFireEntryDamage, cannonOperator, mountableTowerAt, mountedTower } from '../combat.js';
import { fail, inBase, integer, unitAt, unitBlocksLine, validCell } from '../gameQueries.js';
import { requireTurn } from '../turnLifecycle.js';

export function moveAction(state, player, _opponent, action) {
  requireTurn(state, player);
  const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
  const x = integer(action.x), z = integer(action.z), card = CARD_BY_ID[unit.cardId];
  const bonusMoveAvailable = isGoblinTroop(card.id) && (unit.bonusMoves ?? 0) > 0;
  const normalMoveUsed = card.id === 'henry' ? unit.movedThisTurn : unit.actionUsed;
  const usingBonusMove = normalMoveUsed && bonusMoveAvailable;
  if (normalMoveUsed && !usingBonusMove) fail(card.id === 'henry' ? 'Esta unidade já se movimentou neste turno.' : 'Esta unidade já agiu neste turno.');
  if (unit.underConstruction || card.type === 'construction') fail('Esta construção não pode se mover.');
  if (mountedTower(state, unit)) fail('O arqueiro montado não pode se mover.');
  if (card.id === 'cannon') {
    moveCannon(state, player, unit, x, z);
    return;
  }
  const tower = mountableTowerAt(state, player, card, x, z, unit.id);
  const movementRange = Math.max(
    0,
    card.move + roadMovementBonus(unit.x, unit.z, state.roads, card.id) - (unit.movementPenalty ?? 0),
  );
  const movementValue = movementDistance(card.movementType, unit, { x, z });
  if (!validCell(x, z) || inBase(x, z, state) || movementValue < 1 || movementValue > movementRange || (unitAt(state, x, z, unit.id) && !tower)) fail('Movimento inválido.');
  if (unitBlocksLine(state, unit, { x, z }, unit.id)) fail('O caminho está bloqueado por outra tropa.');
  unit.x = x;
  unit.z = z;
  unit.mountedOnTowerId = tower?.id ?? null;
  if (usingBonusMove) unit.bonusMoves -= 1;
  else if (card.id === 'henry') {
    unit.movedThisTurn = true;
    unit.actionUsed = Boolean(unit.attackedThisTurn);
  } else unit.actionUsed = true;
  applyFireEntryDamage(state, unit);
}

function moveCannon(state, player, unit, x, z) {
  const forward = forwardDeltaForSeat(player.seat);
  const operator = cannonOperator(state, unit);
  const destination = { x: unit.x + forward.x, z: unit.z + forward.z };
  if (!operator || operator.actionUsed) fail('O Canhão precisa de um Operador disponível exatamente atrás.');
  if (x !== destination.x || z !== destination.z) fail('O Canhão avança somente uma casa para frente.');
  if (!validCell(x, z) || inBase(x, z, state) || unitAt(state, x, z)) fail('A casa à frente do Canhão está bloqueada.');
  operator.x = unit.x;
  operator.z = unit.z;
  operator.actionUsed = true;
  unit.x = x;
  unit.z = z;
  unit.actionUsed = true;
  applyFireEntryDamage(state, operator);
  applyFireEntryDamage(state, unit);
}
