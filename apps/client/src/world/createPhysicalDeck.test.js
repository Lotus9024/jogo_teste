import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createPhysicalDecks } from './createPhysicalDeck.js';

test('cada jogador possui um baralho à esquerda do próprio lado', () => {
  const scene = new THREE.Scene();
  const half = 7.56;
  const physicalDecks = createPhysicalDecks(scene, half);
  const seatOne = physicalDecks.bySeat[1];
  const seatTwo = physicalDecks.bySeat[2];

  assert.equal(physicalDecks.decks.length, 2);
  assert.ok(seatOne.position.x < -half && seatOne.position.z > 0);
  assert.ok(seatTwo.position.x > half && seatTwo.position.z < 0);
  assert.equal(seatOne.userData.ownerSeat, 1);
  assert.equal(seatTwo.userData.ownerSeat, 2);
});

test('a pilha física acompanha a quantidade de cartas restante', () => {
  const scene = new THREE.Scene();
  const { bySeat } = createPhysicalDecks(scene, 7.56);
  const deck = bySeat[1];

  deck.userData.setCount(7);
  assert.equal(deck.userData.cards.filter(card => card.visible).length, 7);
  assert.equal(deck.userData.getTopCard(), deck.userData.cards[6]);

  deck.userData.setCount(0);
  assert.equal(deck.userData.cards.filter(card => card.visible).length, 0);
  assert.equal(deck.userData.getTopCard(), null);
});
