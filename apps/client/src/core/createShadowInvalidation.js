/** Refresh soft shadows when casters change, without rerendering a static map every frame. */
export function createShadowInvalidation(renderer, { interval = 1 / 12 } = {}) {
  let snapshots = new Map();
  let lastUpdate = -Infinity;

  function update(objects, elapsed) {
    if (!renderer.shadowMap.enabled || elapsed - lastUpdate < interval) return false;
    lastUpdate = elapsed;
    const next = new Map();
    let changed = false;
    for (const object of objects) {
      if (!object) continue;
      const signature = [
        ...object.position, ...object.quaternion, ...object.scale,
        object.visible, object.children.length, object.userData.currentLevel,
        object.userData.underConstruction,
      ].join(',');
      next.set(object, signature);
      if (snapshots.get(object) !== signature) changed = true;
    }
    if (snapshots.size !== next.size) changed = true;
    snapshots = next;
    if (changed) renderer.shadowMap.needsUpdate = true;
    return changed;
  }

  return { update };
}
