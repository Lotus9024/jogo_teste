import * as THREE from 'three';
import { cards, hideDeckPreview as hideCardPreview, showDeckPreview } from './cardView.js';

export function createDeckController({
  state, renderer, camera, controls, cameraTransition, deck3D, hand, gallery,
}) {
  const deckPreview = document.querySelector('#deck-preview');
  const deckPoint = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let drawing = false;
  let handShift = 0;
  let pressed = false;

  const previewCard = index => showDeckPreview(deckPreview, cards[index]);
  const hidePreview = () => hideCardPreview(deckPreview);
  function screenPosition(y = 0.8) {
    deck3D.getWorldPosition(deckPoint);
    deckPoint.y += y;
    deckPoint.project(camera);
    return { x: (deckPoint.x * 0.5 + 0.5) * innerWidth, y: (-deckPoint.y * 0.5 + 0.5) * innerHeight };
  }

  function drawCardPreview() {
    if (state.devMode) return gallery.open();
    if (state.onlineState) return hidePreview();
    if (drawing || state.deckRemaining <= 0) return;
    drawing = true;
    const deck = screenPosition();
    const target = hand.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'draw-card-ghost';
    ghost.textContent = '♜';
    ghost.style.left = `${deck.x - 36}px`;
    ghost.style.top = `${deck.y - 53}px`;
    document.body.appendChild(ghost);
    const dx = target.left + target.width / 2 - deck.x;
    const dy = Math.min(innerHeight - 125, target.top + 40) - deck.y;
    const motion = ghost.animate([
      { transform: 'translate(0,0) rotate(-8deg) scale(.72)', opacity: 0.35 },
      { offset: 0.48, transform: `translate(${dx * 0.52}px,${dy * 0.35}px) rotate(7deg) scale(1.15)`, opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) rotate(0) scale(.9)`, opacity: 0.15 },
    ], { duration: 980, easing: 'cubic-bezier(.2,.75,.2,1)' });
    motion.onfinish = () => {
      const source = hand.querySelector('.game-card');
      if (source) {
        const clone = source.cloneNode(true);
        clone.classList.remove('selected');
        hand.appendChild(clone);
      }
      ghost.remove();
      document.querySelector('#hand-count').textContent = `${hand.children.length} CARTAS`;
      state.deckRemaining -= 1;
      document.querySelector('#deck-count').textContent = state.deckRemaining;
      state.deckPreviewIndex = (state.deckPreviewIndex + 1) % cards.length;
      hand.classList.add('reflow');
      setTimeout(() => hand.classList.remove('reflow'), 600);
      drawing = false;
    };
  }

  function atPointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);
    return ray.intersectObject(deck3D, true).length > 0;
  }

  function hover(event) {
    const over = atPointer(event);
    if (over === state.deckHover) return;
    state.deckHover = over;
    renderer.domElement.style.cursor = over ? 'pointer' : '';
    if (over && !state.onlineState) previewCard(state.deckPreviewIndex);
    else hidePreview();
  }

  function animateServerDraw() {
    const deck = screenPosition();
    const target = hand.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'draw-card-ghost';
    ghost.textContent = '♜';
    ghost.style.left = `${deck.x - 36}px`;
    ghost.style.top = `${deck.y - 53}px`;
    document.body.appendChild(ghost);
    const dx = target.left + target.width / 2 - deck.x;
    const dy = Math.min(innerHeight - 125, target.top + 40) - deck.y;
    ghost.animate([
      { transform: 'translate(0,0) scale(.72)', opacity: 0.35 },
      { transform: `translate(${dx}px,${dy}px) scale(.9)`, opacity: 0.1 },
    ], { duration: 800, easing: 'cubic-bezier(.2,.75,.2,1)' }).onfinish = () => ghost.remove();
  }

  function mount() {
    document.querySelector('#draw-card').addEventListener('click', drawCardPreview);
    renderer.domElement.addEventListener('pointermove', hover);
    renderer.domElement.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !atPointer(event)) return;
      event.preventDefault();
      event.stopPropagation();
      cameraTransition.cancel({ restoreControls: false });
      pressed = true;
      controls.enabled = false;
    }, true);
    renderer.domElement.addEventListener('pointerup', event => {
      if (!pressed) return;
      event.preventDefault();
      event.stopPropagation();
      pressed = false;
      controls.enabled = true;
      if (atPointer(event)) drawCardPreview();
    }, true);
    renderer.domElement.addEventListener('pointerleave', () => {
      state.deckHover = false;
      pressed = false;
      controls.enabled = true;
      renderer.domElement.style.cursor = '';
      hidePreview();
    });
    document.querySelector('.card-dock').addEventListener('wheel', event => {
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      event.preventDefault();
      const dock = document.querySelector('.card-dock');
      const maxShift = Math.max(0, hand.scrollWidth - dock.clientWidth + 48);
      handShift = THREE.MathUtils.clamp(handShift + (event.deltaY > 0 ? -120 : 120), -maxShift, 0);
      hand.style.setProperty('--hand-shift', `${handShift}px`);
    }, { passive: false });
  }

  return { mount, animateServerDraw };
}
