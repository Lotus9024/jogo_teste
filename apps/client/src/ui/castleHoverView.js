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
  const currentLevel = Math.max(1, Math.round(Number(level) || 1));
  if (currentLevel >= 2) {
    return {
      currentLevel,
      nextLevel: null,
      requirements: [],
      advantages: [],
      message: 'Nível máximo implementado. Novas ascensões ainda não possuem requisitos definidos.',
    };
  }
  return {
    currentLevel,
    nextLevel: 2,
    requirements: [
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
    })),
    advantages: [
      `Energia máxima aumenta para ${GAME_CONFIG.level2MaxEnergy}`,
      `Receba ${GAME_CONFIG.level2EnergyBonus} de energia imediatamente`,
      'Área da base aumenta de 9 para 15 casas',
      'Construções recuperam 1 de vida a cada 2 rodadas',
    ],
    message: '',
  };
}

export function castleHoverMarkup({
  kingdomName,
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

  return `
    <article class="castle-hover-card">
      <header>
        <span>REINO</span>
        <b>NÍVEL ${progress.currentLevel}</b>
      </header>
      <h3>${escapeHtml(kingdomName || 'Reino sem nome')}</h3>
      <p class="castle-hover-name">${escapeHtml(castleName || 'Castelo')}</p>
      <div class="castle-hover-health">
        <span><small>INTEGRIDADE</small><b>${safeHp}/${safeMaxHp}</b></span>
        <i><em style="width:${hpPercent}%"></em></i>
      </div>
      ${progress.nextLevel ? `
        <section>
          <small>REQUISITOS · NÍVEL ${progress.nextLevel}</small>
          <ul class="castle-hover-requirements">${requirements}</ul>
        </section>
        <section>
          <small>VANTAGENS DA ASCENSÃO</small>
          <ul class="castle-hover-advantages">${advantages}</ul>
        </section>
      ` : `
        <p class="castle-hover-max"><i aria-hidden="true">✦</i>${escapeHtml(progress.message)}</p>
      `}
    </article>`;
}
