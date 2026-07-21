import * as THREE from 'three';

const ACID_COLOR = 0x89ff43;

export function makeAcidCircle(tileSize = 1.08) {
  const root = new THREE.Group();
  root.name = 'acidCircleEffect';

  const puddleMaterial = new THREE.MeshBasicMaterial({
    color: ACID_COLOR,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xc7ff70,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const puddle = new THREE.Mesh(new THREE.CircleGeometry(tileSize * 1.42, 40), puddleMaterial);
  puddle.name = 'acidPuddle';
  puddle.rotation.x = -Math.PI / 2;
  puddle.scale.setScalar(0.08);
  root.add(puddle);

  const ring = new THREE.Mesh(new THREE.RingGeometry(tileSize * 1.1, tileSize * 1.46, 40), ringMaterial);
  ring.name = 'acidRing';
  ring.rotation.x = -Math.PI / 2;
  ring.scale.setScalar(0.08);
  root.add(ring);

  for (let index = 0; index < 18; index += 1) {
    const angle = index / 18 * Math.PI * 2;
    const radius = tileSize * (0.48 + (index % 4) * 0.19);
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.045 + (index % 3) * 0.012, 7, 5),
      new THREE.MeshBasicMaterial({ color: index % 2 ? ACID_COLOR : 0xd1ff63, transparent: true, opacity: 0.9 })
    );
    drop.position.set(Math.cos(angle) * radius, 0.12 + (index % 5) * 0.035, Math.sin(angle) * radius);
    drop.userData.acidDrop = true;
    drop.userData.phase = index * 0.57;
    root.add(drop);
  }

  root.userData.materials = [puddleMaterial, ringMaterial];
  return root;
}

