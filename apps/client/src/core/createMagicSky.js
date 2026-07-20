import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const SKY_TEXTURE = '/assets/sky/qwantani_moonrise_puresky_4k.hdr';

export function createMagicSky(scene, renderer, app) {
  scene.background = new THREE.Color(0x070b11);
  scene.environmentRotation.set(0, -Math.PI * 0.38, 0);

  // A floating-board camera looks toward the lower half of an equirectangular
  // panorama. Remapping the sphere to the photographed sky hemisphere keeps
  // the space below the island dark instead of exposing the removed ground.
  const skyGeometry = new THREE.SphereGeometry(68, 96, 48);
  const skyUvs = skyGeometry.getAttribute('uv');
  for (let index = 0; index < skyUvs.count; index += 1) {
    skyUvs.setY(index, 0.5 + skyUvs.getY(index) * 0.5);
  }
  skyUvs.needsUpdate = true;
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: 0x7f8c97,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.name = 'Skybox HDRI Qwantani Moonrise 4K';
  sky.rotation.y = -Math.PI * 0.38;
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  scene.add(sky);

  app.dataset.skybox = 'loading-hdri-4k';
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  new RGBELoader().setDataType(THREE.HalfFloatType).load(
    SKY_TEXTURE,
    texture => {
      const environment = pmrem.fromEquirectangular(texture).texture;
      texture.mapping = THREE.UVMapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1;
      texture.offset.x = 1;
      skyMaterial.map = texture;
      skyMaterial.needsUpdate = true;
      scene.environment = environment;
      scene.environmentIntensity = 0.34;
      app.dataset.skybox = 'qwantani-moonrise-pure-sky-hdri-4k';
      pmrem.dispose();
    },
    undefined,
    () => {
      pmrem.dispose();
      app.dataset.skybox = 'navy-night-fallback';
    }
  );

  function update() {}

  return { update };
}
