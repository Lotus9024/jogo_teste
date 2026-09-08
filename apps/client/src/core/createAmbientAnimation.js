import { MathUtils } from 'three';

function animatedParts(root, predicate) {
  const parts = [];
  root.traverse(object => { if (predicate(object)) parts.push(object); });
  return parts;
}

/** Decorative animation only; simulation, movement and combat own their clocks. */
export function createAmbientAnimation({ units, fireMeshes, wisps, fireLights, physicalDecks }) {
  const unitParts = new WeakMap();
  const fireParts = new WeakMap();

  function updateDecks(hoverSeat, delta) {
    physicalDecks.decks.forEach(deck => {
      const card = deck.userData.getTopCard();
      if (!card) return;
      const hovered = deck.userData.ownerSeat === hoverSeat;
      card.position.y = MathUtils.damp(card.position.y, card.userData.restY + (hovered ? 0.22 : 0), 9.05, delta);
      card.rotation.z = MathUtils.damp(card.rotation.z, hovered ? -0.08 : 0, 7.67, delta);
    });
  }

  function update(time) {
    units.forEach((unit, index) => {
      let parts = unitParts.get(unit);
      const rig = parts?.childCount === unit.children.length && parts.rig?.parent
        ? parts.rig : unit.getObjectByName('rig');
      if (!parts || parts.rig !== rig || parts.childCount !== unit.children.length || parts.rigChildCount !== rig?.children.length) {
        parts = { rig, childCount: unit.children.length, rigChildCount: rig?.children.length,
          magic: animatedParts(unit, object => object.userData.magic) };
        unitParts.set(unit, parts);
      }
      if (rig && !['construction', 'machine', 'terrain'].includes(unit.userData.cardType)
        && !unit.userData.presentationAnimating && !unit.userData.isMoving) {
        rig.position.y = 0.18 + Math.sin(time * 1.35 + index * 1.7) * 0.012;
        rig.rotation.z = Math.sin(time * 0.8 + index) * 0.006;
      }
      parts.magic.forEach(object => { object.rotation.y = time * 1.5; });
    });
    fireMeshes.forEach(group => {
      let cached = fireParts.get(group);
      if (!cached || cached.childCount !== group.children.length) {
        cached = { childCount: group.children.length, flames: animatedParts(group, object => object.userData.flame) };
        fireParts.set(group, cached);
      }
      cached.flames.forEach(object => {
        object.scale.y = 0.86 + Math.sin(time * 8 + object.userData.phase) * 0.16;
        object.rotation.y = time * 1.7 + object.userData.phase;
      });
    });
    wisps.forEach((wisp, index) => {
      wisp.position.x = wisp.userData.baseX + Math.sin(time * 0.1 + index) * (wisp.userData.drift ?? 0.3);
      wisp.material.opacity = (wisp.userData.baseOpacity ?? 0.025) + Math.sin(time * 0.28 + index) * 0.0035;
    });
    fireLights.forEach((light, index) => {
      const pulse = 0.91 + Math.sin(time * 7.4 + light.userData.phase) * 0.065 + Math.sin(time * 13.1 + index) * 0.025;
      light.intensity = light.userData.baseIntensity * pulse;
    });
  }

  return { update, updateDecks };
}
