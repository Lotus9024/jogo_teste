const GAME_ICON_ROOT = '/assets/card-icons/game-icons/';
const GAME_ICON_VERSION = '2';

// Game-icons.net assets are distributed under CC BY 3.0.
// Their original author and filename are intentionally preserved here and in CREDITS.md.
const GAME_ICON_FILES = Object.freeze({
  warrior: 'cathelineau/swordman.svg',
  henry: 'lorc/sprint.svg',
  wooden_barrier: 'lorc/wooden-fence.svg',
  tower: 'delapouite/watchtower.svg',
  operator: 'lorc/gear-hammer.svg',
  citizen: 'delapouite/person.svg',
  cannon: 'lorc/cannon.svg',
  wooden_house: 'delapouite/wood-cabin.svg',
  goblin_house: 'delapouite/goblin-camp.svg',
  road: 'delapouite/road.svg',
  goblin: 'caro-asercion/goblin.svg',
  goblin_swarm: 'lorc/minions.svg',
  goblin_bomber: 'lorc/sparky-bomb.svg',
  goblin_clone: 'sbed/doubled.svg',
  goblin_tower: 'delapouite/evil-tower.svg',
  mage: 'delapouite/wizard-face.svg',
  builder_area: 'lorc/hammer-nails.svg',
  cobblestone_road: 'delapouite/stone-path.svg',
});

const CUSTOM_ICON_PATHS = Object.freeze({
  guard: `
    <path class="card-icon-fill" d="M32 7c8 6 15 7 20 8v14c0 13-8 22-20 28-12-6-20-15-20-28V15c5-1 12-2 20-8Z"/>
    <path d="M32 7c8 6 15 7 20 8v14c0 13-8 22-20 28-12-6-20-15-20-28V15c5-1 12-2 20-8Z"/>
    <path d="M32 15v32m-12-22h24"/>`,
  archer: `
    <path d="M19 8c18 11 18 37 0 48"/>
    <path d="M19 8c-9 12-9 36 0 48"/>
    <path d="M19 32h36"/>
    <path d="M47 24l8 8-8 8"/>
    <path d="M13 32h6"/>`,
  goblin_altar: `
    <path class="card-icon-fill" d="M10 48h44l5 9H5l5-9Zm6-9h32l3 9H13l3-9Z"/>
    <path d="M10 48h44l5 9H5l5-9Zm6-9h32l3 9H13l3-9Z"/>
    <path d="M20 20 9 10l3 18 9-3c2 8 6 13 11 13s9-5 11-13l9 3 3-18-11 10c-3-5-7-7-12-7s-9 2-12 7Z"/>
    <path d="M25 26h3m8 0h3m-12 6h10"/>`,
  mage_altar: `
    <path class="card-icon-fill" d="M9 49h46l4 8H5l4-8Zm8-10h30l4 10H13l4-10Z"/>
    <path d="M9 49h46l4 8H5l4-8Zm8-10h30l4 10H13l4-10Z"/>
    <path class="card-icon-accent" d="M32 5 44 21 32 37 20 21 32 5Z"/>
    <path d="M32 5 44 21 32 37 20 21 32 5Zm0 0v32M20 21h24"/>`,
  royal_warrior: `
    <path class="card-icon-fill" d="M13 49h38l4 8H9l4-8Z"/>
    <path d="M13 49h38l4 8H9l4-8ZM32 8v40M19 21h26M24 8h16l-3 8H27l-3-8Z"/>
    <path d="m18 43 28-28m-4-5 6 6-7 3-2-2 3-7Z"/>`,
  royal_tower: `
    <path class="card-icon-fill" d="M12 21h40v36H12V21Z"/>
    <path d="M12 21h40v36H12V21ZM8 8h12v13H8V8Zm18 0h12v13H26V8Zm18 0h12v13H44V8ZM24 57V43h16v14"/>
    <path d="M32 25v12m-6-6h12"/>`,
  blizzard: `
    <path d="M32 5v54M8 19l48 26M8 45l48-26M32 5l-6 7m6-7 6 7M32 59l-6-7m6 7 6-7M8 19l9 1m-9-1 4 8M56 45l-9-1m9 1-4-8M8 45l9-1m-9 1 4-8M56 19l-9 1m9-1-4 8"/>`,
});

export const CARD_ICON_IDS = Object.freeze([
  'warrior',
  'guard',
  'henry',
  'archer',
  'wooden_barrier',
  'tower',
  'operator',
  'citizen',
  'cannon',
  'wooden_house',
  'goblin_house',
  'road',
  'goblin',
  'goblin_swarm',
  'goblin_bomber',
  'goblin_clone',
  'goblin_tower',
  'mage',
  'goblin_altar',
  'mage_altar',
  'builder_area',
  'cobblestone_road',
  'royal_warrior',
  'royal_tower',
  'blizzard',
]);

const preloadedIconImages = [];
const gameIconUrl = file => `${GAME_ICON_ROOT}${file}?v=${GAME_ICON_VERSION}`;

export function preloadCardIcons() {
  if (typeof Image === 'undefined' || preloadedIconImages.length) return;
  new Set(Object.values(GAME_ICON_FILES)).forEach(file => {
    const image = new Image();
    image.decoding = 'async';
    image.src = gameIconUrl(file);
    preloadedIconImages.push(image);
  });
}

function gameIconMarkup(id, file, className) {
  const source = gameIconUrl(file);
  return `<span class="${className} card-illustration--game-icon" data-card-icon="${id}" style="--card-icon:url('${source}')" aria-hidden="true"></span>`;
}

export function cardIconMarkup(cardOrId, { className = 'card-illustration' } = {}) {
  const id = typeof cardOrId === 'string' ? cardOrId : cardOrId?.id;
  const gameIconFile = GAME_ICON_FILES[id];
  if (gameIconFile) {
    return gameIconMarkup(id, gameIconFile, className);
  }

  const body = CUSTOM_ICON_PATHS[id];
  if (body) {
    return `<svg class="${className}" data-card-icon="${id}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  const glyph = typeof cardOrId === 'object' ? cardOrId?.glyph : '?';
  return `<span class="card-icon-fallback" aria-hidden="true">${glyph ?? '?'}</span>`;
}

preloadCardIcons();
