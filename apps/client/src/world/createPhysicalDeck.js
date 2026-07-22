import * as THREE from 'three';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { M, add } from '../core/scenePrimitives.js';

const SEAT_THEMES = Object.freeze({
  1: { name: 'Baralho da Fortaleza do Corvo', accent: 0x8062cf, edge: 0xb69262 },
  2: { name: 'Baralho da Cidadela Rubra', accent: 0xb34f8d, edge: 0xa9716d },
});

function deckPosition(half, seat) {
  // Each ruler faces the center. Seat 1 faces -Z, so its left is -X;
  // seat 2 faces +Z, so its left is +X.
  return seat === 1
    ? [-half - 1.9, -0.34, half - 1.15]
    : [half + 1.9, -0.34, -half + 1.15];
}

export function createPhysicalDeck(scene, half, seat = 1) {
  const theme = SEAT_THEMES[seat];
  const deck3D = new THREE.Group();
  deck3D.name = theme.name;
  deck3D.position.set(...deckPosition(half, seat));
  deck3D.rotation.y = seat === 1 ? -0.13 : Math.PI - 0.13;

  const deckSideMaterial = new THREE.MeshStandardMaterial({ color: 0x6d6049, roughness: 0.82, metalness: 0.05 });
  const deckBackMaterial = new THREE.MeshStandardMaterial({
    color: seat === 1 ? 0x171526 : 0x28131f,
    emissive: theme.accent,
    emissiveIntensity: 0.1,
    roughness: 0.58,
    metalness: 0.18,
  });
  const deckEdgeMaterial = new THREE.MeshStandardMaterial({
    color: theme.edge,
    emissive: theme.accent,
    emissiveIntensity: 0.12,
    roughness: 0.36,
    metalness: 0.72,
  });
  const sigilMaterial = new THREE.MeshBasicMaterial({ color: theme.accent, toneMapped: false });

  const plinth = add(new THREE.BoxGeometry(1.62, 0.18, 2.18), M.stoneDark, deck3D, [0, -0.08, 0]);
  plinth.name = `deckPlinthSeat${seat}`;
  add(new THREE.BoxGeometry(1.42, 0.08, 1.98), M.iron, deck3D, [0, 0.05, 0]);
  for (const x of [-0.67, 0.67]) {
    for (const z of [-0.94, 0.94]) add(new THREE.CylinderGeometry(0.055, 0.065, 0.07, 8), deckEdgeMaterial, deck3D, [x, 0.12, z]);
  }

  const deckCards = [];
  for (let index = 0; index < GAME_CONFIG.deckSize; index += 1) {
    const card = new THREE.Group();
    card.name = `Carta ${index + 1} do jogador ${seat}`;
    card.position.set(Math.sin(index * 2.17) * 0.045, 0.12 + index * 0.038, Math.cos(index * 1.73) * 0.04);
    card.rotation.y = Math.sin(index * 1.31) * 0.055;
    card.userData.restY = card.position.y;
    add(
      new THREE.BoxGeometry(1.18, 0.045, 1.72, 5, 1, 7),
      [deckSideMaterial, deckSideMaterial, deckBackMaterial, deckSideMaterial, deckSideMaterial, deckSideMaterial],
      card
    );

    if (index === GAME_CONFIG.deckSize - 1) {
      add(new THREE.BoxGeometry(1.02, 0.018, 0.025), deckEdgeMaterial, card, [0, 0.034, -0.72]);
      add(new THREE.BoxGeometry(1.02, 0.018, 0.025), deckEdgeMaterial, card, [0, 0.034, 0.72]);
      add(new THREE.BoxGeometry(0.025, 0.018, 1.42), deckEdgeMaterial, card, [-0.5, 0.034, 0]);
      add(new THREE.BoxGeometry(0.025, 0.018, 1.42), deckEdgeMaterial, card, [0.5, 0.034, 0]);
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.022, 4), deckEdgeMaterial, card, [0, 0.05, 0], [0, Math.PI / 4, 0]);
    }
    add(new THREE.TorusGeometry(0.11, 0.025, 8, 20), sigilMaterial, card, [0, 0.068, 0], [-Math.PI / 2, 0, 0]);

    deckCards.push(card);
    deck3D.add(card);
  }

  function setCount(value) {
    const count = Number.isFinite(value)
      ? THREE.MathUtils.clamp(Math.round(value), 0, GAME_CONFIG.deckSize)
      : GAME_CONFIG.deckSize;
    deckCards.forEach((card, index) => { card.visible = index < count; });
    deck3D.userData.count = count;
  }

  function getTopCard() {
    const count = deck3D.userData.count;
    return count > 0 ? deckCards[count - 1] : null;
  }

  deck3D.userData = {
    ownerSeat: seat,
    hoverableDeck: true,
    count: GAME_CONFIG.deckSize,
    cards: deckCards,
    setCount,
    getTopCard,
  };
  setCount(GAME_CONFIG.deckSize);
  scene.add(deck3D);
  return deck3D;
}

export function createPhysicalDecks(scene, half) {
  const decks = [createPhysicalDeck(scene, half, 1), createPhysicalDeck(scene, half, 2)];
  return {
    decks,
    bySeat: Object.fromEntries(decks.map(deck => [deck.userData.ownerSeat, deck])),
  };
}
