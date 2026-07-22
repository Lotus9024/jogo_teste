function trashMarkup() {
  return `<button id="card-discard" class="card-discard" type="button" aria-label="Descartar carta selecionada" title="Arraste uma carta para descartar">
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M10 9h12l-1 17H11L10 9Zm3-4h6l1 2h5v2H7V7h5l1-2Zm1 7v11m4-11v11" />
    </svg>
    <span>DESCARTAR</span>
  </button>`;
}

export function createCardDiscardController({ state, app, hand, controls, callbacks, selectedCardElement }) {
  let trash;
  let restoreTimer;

  function setDragging(active) {
    trash?.classList.toggle('available', active);
    if (!active) trash?.classList.remove('drag-over');
  }

  function isPointerOver(event) {
    if (!trash) return false;
    const rect = trash.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
  }

  function setPointerOver(active) {
    trash?.classList.toggle('drag-over', active);
  }

  function commitDiscard(card) {
    if (state.onlineState) {
      callbacks.sendOnlineAction?.({ type: 'discard_card', cardInstanceId: card.dataset.instance });
      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => card.classList.remove('discarding'), 1600);
      return;
    }
    card.remove();
    document.querySelector('#hand-count').textContent = `${hand.querySelectorAll('.game-card').length} CARTAS`;
  }

  function discard(card) {
    if (!card || card.classList.contains('discarding')) return false;
    if (state.onlineState && state.onlineState.state.activeSeat !== state.selfSeat) {
      callbacks.showGameError?.('Aguarde o seu turno.');
      return false;
    }
    const from = card.getBoundingClientRect();
    const to = trash.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    Object.assign(ghost.style, {
      position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`,
      height: `${from.height}px`, margin: '0', zIndex: '30', pointerEvents: 'none',
    });
    ghost.classList.add('discard-flight');
    document.body.appendChild(ghost);
    card.classList.remove('selected', 'aiming');
    card.classList.add('discarding');
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motion = ghost.animate([
      { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 },
      { offset: 0.36, transform: `translate(${dx * 0.38}px,${dy * 0.28}px) rotate(-7deg) scale(.74)`, opacity: 0.9 },
      { transform: `translate(${dx}px,${dy}px) rotate(18deg) scale(.12)`, opacity: 0 },
    ], { duration: reduced ? 120 : 480, easing: 'cubic-bezier(.3,.75,.2,1)', fill: 'forwards' });
    commitDiscard(card);
    motion.finished.catch(() => {}).finally(() => ghost.remove());
    callbacks.showDeploymentArea?.(false);
    callbacks.syncBottomCommand?.();
    trash.classList.add('received');
    setTimeout(() => trash.classList.remove('received'), 420);
    return true;
  }

  function mount() {
    app.insertAdjacentHTML('beforeend', trashMarkup());
    trash = document.querySelector('#card-discard');
    trash.addEventListener('pointerdown', event => event.stopPropagation());
    trash.addEventListener('click', () => discard(selectedCardElement()));
  }

  return { mount, discard, setDragging, isPointerOver, setPointerOver };
}
