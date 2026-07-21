import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const SKY_TEXTURE = '/assets/sky/qwantani_moonrise_puresky_4k.hdr';

export function createMagicSky(scene, renderer, app, { quality = 'high' } = {}) {
  scene.background = new THREE.Color(0x070b11);
  scene.environmentRotation.set(0, -Math.PI * 0.38, 0);

  // A floating-board camera looks toward the lower half of an equirectangular
  // panorama. Remapping the sphere to the photographed sky hemisphere keeps
  // the space below the island dark instead of exposing the removed ground.
  const skyGeometries = {
    low: new THREE.SphereGeometry(68, 32, 16),
    high: new THREE.SphereGeometry(68, 96, 48)
  };
  Object.values(skyGeometries).forEach(geometry => {
    const uvs = geometry.getAttribute('uv');
    for (let index = 0; index < uvs.count; index += 1) uvs.setY(index, 0.5 + uvs.getY(index) * 0.5);
    uvs.needsUpdate = true;
  });
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: 0x7f8c97,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false
  });
  const sky = new THREE.Mesh(skyGeometries[quality], skyMaterial);
  sky.name = 'Skybox HDRI Qwantani Moonrise 4K';
  sky.rotation.y = -Math.PI * 0.38;
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  scene.add(sky);

  let currentQuality = quality;
  let loading = false;
  let hdriTexture = null;
  let environmentTexture = null;

  function useHdri() {
    if (!hdriTexture || currentQuality !== 'high') return;
    skyMaterial.map = hdriTexture;
    skyMaterial.needsUpdate = true;
    scene.environment = environmentTexture;
    scene.environmentIntensity = 0.34;
    app.dataset.skybox = 'qwantani-moonrise-pure-sky-hdri-4k';
  }

  function loadHdri() {
    if (loading || hdriTexture) return;
    loading = true;
    app.dataset.skybox = 'loading-hdri-4k';
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader().setDataType(THREE.HalfFloatType).load(SKY_TEXTURE, texture => {
      environmentTexture = pmrem.fromEquirectangular(texture).texture;
      texture.mapping = THREE.UVMapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1;
      texture.offset.x = 1;
      hdriTexture = texture;
      useHdri();
      pmrem.dispose();
    }, undefined, () => {
      loading = false;
      pmrem.dispose();
      app.dataset.skybox = 'navy-night-fallback';
    });
  }

  function setQuality(nextQuality) {
    currentQuality = nextQuality;
    sky.geometry = skyGeometries[nextQuality];
    if (nextQuality === 'high') loadHdri();
    else {
      skyMaterial.map = null;
      skyMaterial.needsUpdate = true;
      scene.environment = null;
      app.dataset.skybox = 'navy-night-low-poly';
    }
    useHdri();
  }

  setQuality(quality);

  function update() {}

  return { update, setQuality };
}
