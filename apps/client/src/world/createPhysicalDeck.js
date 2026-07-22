import * as THREE from 'three';
import { M, add } from '../core/scenePrimitives.js';

export function createPhysicalDeck(scene, half) {
  const deck3D = new THREE.Group();
  deck3D.name = 'Baralho 3D do Corvo';
  deck3D.position.set(-half - 2, -0.34, -half + 0.95);
  deck3D.rotation.y = -0.11;

  const deckSideMaterial = new THREE.MeshStandardMaterial({ color: 0x6d6049, roughness: 0.82, metalness: 0.05 });
  const deckBackMaterial = new THREE.MeshStandardMaterial({ color: 0x172326, emissive: 0x071012, emissiveIntensity: 0.4, roughness: 0.58, metalness: 0.18 });
  const deckEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0xa98545, emissive: 0x231606, emissiveIntensity: 0.25, roughness: 0.36, metalness: 0.72 });

  add(new THREE.BoxGeometry(1.62, 0.18, 2.18), M.stoneDark, deck3D, [0, -0.08, 0]);
  add(new THREE.BoxGeometry(1.42, 0.08, 1.98), M.iron, deck3D, [0, 0.05, 0]);

  const deckCards = [];
  for (let index = 0; index < 18; index += 1) {
    const card = new THREE.Group();
    card.position.set(Math.sin(index * 2.17) * 0.045, 0.12 + index * 0.038, Math.cos(index * 1.73) * 0.04);
    card.rotation.y = Math.sin(index * 1.31) * 0.055;
    add(
      new THREE.BoxGeometry(1.18, 0.045, 1.72, 5, 1, 7),
      [deckSideMaterial, deckSideMaterial, deckBackMaterial, deckSideMaterial, deckSideMaterial, deckSideMaterial],
      card
    );

    if (index === 17) {
      add(new THREE.BoxGeometry(1.02, 0.018, 0.025), deckEdgeMaterial, card, [0, 0.034, -0.72]);
      add(new THREE.BoxGeometry(1.02, 0.018, 0.025), deckEdgeMaterial, card, [0, 0.034, 0.72]);
      add(new THREE.BoxGeometry(0.025, 0.018, 1.42), deckEdgeMaterial, card, [-0.5, 0.034, 0]);
      add(new THREE.BoxGeometry(0.025, 0.018, 1.42), deckEdgeMaterial, card, [0.5, 0.034, 0]);
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.022, 4), deckEdgeMaterial, card, [0, 0.05, 0], [0, Math.PI / 4, 0]);
      add(new THREE.CylinderGeometry(0.055, 0.055, 0.027, 12), M.magic, card, [0, 0.068, 0]);
    }

    deckCards.push(card);
    deck3D.add(card);
  }

  const topDeckCard = deckCards.at(-1);
  scene.add(deck3D);
  return { deck3D, topDeckCard };
}
