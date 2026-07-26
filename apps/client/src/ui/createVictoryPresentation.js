const RESULT_COPY = {
  victory: {
    eyebrow: 'O DESTINO FOI SELADO',
    title: 'VITÓRIA',
    subtitle: 'O trono reconhece seu reinado',
  },
  defeat: {
    eyebrow: 'A COROA FOI PARTIDA',
    title: 'DERROTA',
    subtitle: 'Das cinzas, um novo reino se erguerá',
  },
  spectator: {
    eyebrow: 'A BATALHA FOI DECIDIDA',
    title: 'VITÓRIA',
    subtitle: 'Um novo soberano reclama o trono',
  },
};

export function createVictoryPresentation(root = document) {
  const presentation = root.querySelector('#victory-presentation');
  const eyebrow = root.querySelector('#victory-eyebrow');
  const title = root.querySelector('#victory-title');
  const subtitle = root.querySelector('#victory-subtitle');
  const detail = root.querySelector('#victory-detail');
  let settleTimer;

  function hide() {
    clearTimeout(settleTimer);
    presentation.classList.remove('playing', 'settled');
    presentation.hidden = true;
  }

  function show({
    outcome = 'victory',
    winnerSeat = null,
    wonByForfeit = false,
  } = {}) {
    const copy = RESULT_COPY[outcome] ?? RESULT_COPY.victory;
    clearTimeout(settleTimer);
    presentation.hidden = false;
    presentation.dataset.outcome = outcome;
    eyebrow.textContent = copy.eyebrow;
    title.textContent = outcome === 'spectator' && winnerSeat
      ? `${copy.title} ${winnerSeat === 1 ? 'AZUL' : 'VERMELHA'}`
      : copy.title;
    subtitle.textContent = copy.subtitle;
    detail.textContent = wonByForfeit ? 'O reino rival abandonou o campo' : '';
    presentation.classList.remove('playing', 'settled');
    void presentation.offsetWidth;
    presentation.classList.add('playing');
    settleTimer = setTimeout(() => presentation.classList.add('settled'), 5_400);
  }

  return { hide, show };
}
