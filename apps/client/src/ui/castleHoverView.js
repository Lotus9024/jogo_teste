import { GAME_CONFIG } from '@tronos/shared/game-config';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function castleProgressView({ level = 1, citizens = 0, completedRoads = 0 } = {}) {
  const currentLevel = Math.min(4, Math.max(1, Math.round(Number(level) || 1)));
  const nextLevel = currentLevel < 4 ? currentLevel + 1 : null;
  const levelTwoRequirements = [
    {
      label: 'Cidadãos no reino',
      current: Math.max(0, Number(citizens) || 0),
      target: GAME_CONFIG.level2CitizenRequirement,
    },
    {
      label: 'Ruas concluídas',
      current: Math.max(0, Number(completedRoads) || 0),
      target: GAME_CONFIG.level2RoadRequirement,
    },
  ].map(requirement => ({
    ...requirement,
    met: requirement.current >= requirement.target,
  }));
  const roadmap = [
    { level: 1, title: 'Fundação do reino', requirement: 'Nível inicial do castelo' },
    {
      level: 2,
      title: 'Reino fortalecido',
      requirement: `${GAME_CONFIG.level2CitizenRequirement} cidadãos e ${GAME_CONFIG.level2RoadRequirement} Rua concluída`,
    },
    { level: 3, title: 'Ascensão futura', requirement: 'Requisitos em planejamento' },
    { level: 4, title: 'Coroa suprema', requirement: 'Requisitos em planejamento' },
  ].map(item => ({
    ...item,
    status: item.level < currentLevel ? 'completed'
      : item.level === currentLevel ? 'current'
        : item.level === nextLevel ? 'next' : 'future',
  }));

  return {
    currentLevel,
    nextLevel,
    requirements: nextLevel === 2 ? levelTwoRequirements : [],
    requirementMessage: nextLevel && nextLevel > 2
      ? 'Este nível está disponível para visualização no DEV MODE, mas seus requisitos de partida ainda estão em planejamento.'
      : '',
    advantages: nextLevel === 2 ? [
      `Energia máxima aumenta para ${GAME_CONFIG.level2MaxEnergy}`,
      `Receba ${GAME_CONFIG.level2EnergyBonus} de energia imediatamente`,
      'Área de lançamento expande 1 casa para cada lateral',
      'Construções recuperam 1 de vida a cada 2 rodadas',
    ] : [],
    roadmap,
    message: nextLevel ? '' : 'Nível visual máximo alcançado. A progressão de partida acima do nível 2 ainda está em planejamento.',
  };
}

export function castleHoverMarkup({
  kingdomName,
  rulerName,
  castleName,
  level = 1,
  hp = GAME_CONFIG.startingBaseHp,
  maxHp = GAME_CONFIG.startingBaseHp,
  citizens = 0,
  completedRoads = 0,
} = {}) {
  const progress = castleProgressView({ level, citizens, completedRoads });
  const safeHp = Math.max(0, Number(hp) || 0);
  const safeMaxHp = Math.max(1, Number(maxHp) || GAME_CONFIG.startingBaseHp);
  const hpPercent = Math.min(100, safeHp / safeMaxHp * 100);
  const requirements = progress.requirements.map(requirement => `
    <li class="${requirement.met ? 'met' : ''}">
      <i aria-hidden="true">${requirement.met ? '✓' : '◇'}</i>
      <span>${escapeHtml(requirement.label)}</span>
      <b>${requirement.current}/${requirement.target}</b>
    </li>`).join('');
  const advantages = progress.advantages.map(advantage => `
    <li><i aria-hidden="true">✦</i><span>${escapeHtml(advantage)}</span></li>`).join('');
  const roadmap = progress.roadmap.map(item => `
    <li class="${item.status}">
      <i aria-hidden="true">${item.status === 'completed' ? '✓' : item.status === 'current' ? '◆' : '◇'}</i>
      <span><b>Nível ${item.level} · ${escapeHtml(item.title)}</b><small>${escapeHtml(item.requirement)}</small></span>
    </li>`).join('');

  return `
    <article class="castle-hover-card">
      <header>
        <span>REINO</span>
        <b>NÍVEL ${progress.currentLevel}</b>
      </header>
      <h3>${escapeHtml(kingdomName || 'Reino sem nome')}</h3>
      <p class="castle-hover-ruler"><small>REI REGENTE</small><b>${escapeHtml(rulerName || 'Regente desconhecido')}</b></p>
      <p class="castle-hover-name">${escapeHtml(castleName || 'Castelo')}</p>
      <div class="castle-hover-health">
        <span><small>INTEGRIDADE</small><b>${safeHp}/${safeMaxHp}</b></span>
        <i><em style="width:${hpPercent}%"></em></i>
      </div>
      ${progress.nextLevel ? `
        <section>
          <small>PRÓXIMO NÍVEL · ${progress.nextLevel}</small>
          ${requirements
            ? `<ul class="castle-hover-requirements">${requirements}</ul>`
            : `<p class="castle-hover-planned">${escapeHtml(progress.requirementMessage)}</p>`}
        </section>
        ${advantages ? `<section>
          <small>VANTAGENS DA ASCENSÃO</small>
          <ul class="castle-hover-advantages">${advantages}</ul>
        </section>` : ''}
      ` : `
        <p class="castle-hover-max"><i aria-hidden="true">✦</i>${escapeHtml(progress.message)}</p>
      `}
      <section>
        <small>LINHAGEM DO CASTELO · NÍVEIS</small>
        <ul class="castle-hover-roadmap">${roadmap}</ul>
      </section>
    </article>`;
}
