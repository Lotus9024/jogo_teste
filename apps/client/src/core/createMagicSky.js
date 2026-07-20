import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const SKY_TEXTURE = '/assets/sky/qwantani_moonrise_puresky_1k.hdr';
const SKY_BACKGROUND = '/assets/sky/qwantani_moonrise_puresky_4k.jpg';

function createMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const glow = context.createRadialGradient(128, 128, 8, 128, 128, 126);
  glow.addColorStop(0, 'rgba(255,255,246,1)');
  glow.addColorStop(0.18, 'rgba(232,220,255,.96)');
  glow.addColorStop(0.42, 'rgba(175,137,255,.32)');
  glow.addColorStop(1, 'rgba(100,48,210,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 256, 256);
  const moon = context.createRadialGradient(112, 106, 5, 128, 128, 45);
  moon.addColorStop(0, '#fffdf2');
  moon.addColorStop(0.62, '#e8e3f2');
  moon.addColorStop(1, '#aaa4c8');
  context.fillStyle = moon;
  context.beginPath();
  context.arc(128, 128, 43, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.13;
  context.fillStyle = '#736f98';
  [[108, 111, 8], [145, 102, 5], [140, 139, 10], [116, 149, 4]].forEach(([x, y, radius]) => {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMagicSky(scene, renderer, app, camera) {
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: 0x8c4fc5,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(38, 64, 32), skyMaterial);
  sky.name = 'Céu de Qwantani Encantado';
  sky.rotation.y = Math.PI * 0.18;
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  scene.add(sky);

  const auroraMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vDirection;
      void main() {
        vec3 d = normalize(vDirection);
        float wave = sin(d.x * 10.0 + d.z * 7.0 + time * 0.08) * 0.055;
        wave += sin(d.x * 21.0 - d.z * 13.0 - time * 0.045) * 0.025;
        float horizonVeil = smoothstep(0.22, 0.015, abs(d.y + 0.05 - wave));
        float lowerVeil = smoothstep(0.34, 0.025, abs(d.y + 0.58 - wave * 1.7));
        float ripple = 0.55 + 0.45 * sin((d.x - d.z) * 18.0 + time * 0.12);
        float lowerField = smoothstep(0.05, 0.92, -d.y);
        float nebula = 0.5 + 0.5 * sin(d.x * 8.0 + d.z * 11.0 - time * 0.025);
        nebula *= 0.58 + 0.42 * sin(d.x * 17.0 - d.z * 6.0 + time * 0.018);
        vec3 violet = vec3(0.48, 0.12, 0.95);
        vec3 cyan = vec3(0.18, 0.72, 0.92);
        vec3 color = mix(violet, cyan, ripple * 0.34);
        vec3 starCell = floor(d * 420.0);
        float starSeed = fract(sin(dot(starCell, vec3(12.9898, 78.233, 39.425))) * 43758.5453);
        float star = step(0.9972, starSeed);
        float twinkle = 0.68 + 0.32 * sin(time * 1.4 + starSeed * 6.2831);
        float veil = horizonVeil * (0.05 + ripple * 0.08);
        veil += lowerVeil * (0.09 + ripple * 0.11);
        veil += lowerField * (0.035 + nebula * 0.055);
        color = mix(color, vec3(0.82, 0.72, 1.0), star * 0.92);
        veil += star * twinkle * 0.72;
        gl_FragColor = vec4(color, veil);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false
  });
  const aurora = new THREE.Mesh(new THREE.SphereGeometry(37.6, 64, 32), auroraMaterial);
  aurora.name = 'Aurora Arcana';
  aurora.renderOrder = -99;
  aurora.frustumCulled = false;
  scene.add(aurora);

  const moonMaterial = new THREE.SpriteMaterial({
    map: createMoonTexture(),
    color: 0xe9dcff,
    transparent: true,
    opacity: 0.86,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false
  });
  const moon = new THREE.Sprite(moonMaterial);
  moon.name = 'Lua Arcana';
  moon.position.set(-5.4, 3.15, -45);
  moon.scale.set(6.6, 6.6, 1);
  moon.renderOrder = -98;
  camera.add(moon);

  app.dataset.skybox = 'loading';
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  new THREE.TextureLoader().load(
    SKY_BACKGROUND,
    texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1;
      texture.offset.x = 1;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      skyMaterial.map = texture;
      skyMaterial.needsUpdate = true;
      app.dataset.skybox = 'qwantani-magic-4k';
    },
    undefined,
    () => { app.dataset.skybox = 'magic-fallback'; }
  );

  new RGBELoader().setDataType(THREE.HalfFloatType).load(
    SKY_TEXTURE,
    texture => {
      const environment = pmrem.fromEquirectangular(texture).texture;
      scene.environment = environment;
      scene.environmentIntensity = 0.12;
      pmrem.dispose();
    },
    undefined,
    () => {
      pmrem.dispose();
      app.dataset.skybox = 'magic-fallback';
    }
  );

  function update(elapsed) {
    auroraMaterial.uniforms.time.value = elapsed;
    aurora.rotation.y = elapsed * 0.0025;
    sky.rotation.y = Math.PI * 0.18 + elapsed * 0.00035;
    moonMaterial.opacity = 0.82 + Math.sin(elapsed * 0.32) * 0.045;
  }

  return { update };
}
