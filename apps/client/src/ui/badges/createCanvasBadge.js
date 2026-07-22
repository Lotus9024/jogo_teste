import * as THREE from 'three';

export function createCanvasBadge({
  name,
  canvasSize,
  position,
  scale,
  renderOrder,
  depthTest,
  userData = {}
}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest, depthWrite: false });
  const badge = new THREE.Sprite(material);
  badge.name = name;
  badge.position.set(...position);
  badge.scale.set(scale, scale, 1);
  badge.renderOrder = renderOrder;
  badge.userData = { canvas, context, texture, ...userData };
  return badge;
}
