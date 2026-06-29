#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TARGET_PEOPLE = [
  { name: '刘悠', slug: 'liu-you', isPlayer: true },
  { name: '刘思瑶', slug: 'liu-siyao', isPlayer: false },
  { name: '刘思琪', slug: 'liu-siqi', isPlayer: false },
  { name: '刘思怡', slug: 'liu-siyi', isPlayer: false },
];

const DEFAULT_ROLE_CARD_UPDATED_AT = '2026-06-28T00:00:00.000Z';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function getStableRoleCardUpdatedAt(profile = {}) {
  return profile.roleCardUpdatedAt || DEFAULT_ROLE_CARD_UPDATED_AT;
}

function getTripletAdultBirthday(birthday) {
  if (typeof birthday !== 'string') return birthday;
  const match = birthday.match(/^(\d{4})(-\d{2}-\d{2})$/u);
  if (!match) return birthday;
  return `2008${match[2]}`;
}

function targetByName(name = '') {
  return TARGET_PEOPLE.find((item) => item.name === name) || null;
}

function normalizeAgeText(value, targetName) {
  if (typeof value !== 'string') return value;
  if (['刘思瑶', '刘思琪', '刘思怡'].includes(targetName)) {
    return value.replace(/\b\d+\s*岁\b/gu, '18岁').replace(/\d+岁/gu, '18岁');
  }
  return value;
}

function deepTransform(value, visitor, key) {
  const visited = visitor(value, key);
  if (visited !== value) return visited;
  if (Array.isArray(value)) return value.map((item) => deepTransform(item, visitor));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, deepTransform(childValue, visitor, childKey)])
    );
  }
  return value;
}

function zeroSexualExperienceCounts(value) {
  return deepTransform(value, (current, key) => {
    if ((key === 'sexualExperienceCount' || key === '性经验次数') && typeof current === 'number') return 0;
    return current;
  });
}

function normalizeAdultTriplet(card) {
  if (!card || !['刘思瑶', '刘思琪', '刘思怡'].includes(card.name)) return card;
  const next = deepTransform(card, (current) => normalizeAgeText(current, card.name));
  next.age = 18;
  next.role = normalizeAgeText(next.role || '18岁三胞胎妹妹', card.name);
  next.detail = normalizeAgeText(next.detail || '', card.name);
  if (typeof next.birthday === 'string') {
    next.birthday = getTripletAdultBirthday(next.birthday);
  }
  if (next.values && typeof next.values === 'object') {
    next.values.age = 18;
    if (typeof next.values.birthday === 'string') {
      next.values.birthday = getTripletAdultBirthday(next.values.birthday);
    }
  }
  return zeroSexualExperienceCounts(next);
}

function extractCharacterStates(input) {
  if (Array.isArray(input)) return input;
  if (!input || typeof input !== 'object') return [];

  if (Array.isArray(input.characterStates)) return input.characterStates;
  if (input.characterStates && typeof input.characterStates === 'object') return Object.values(input.characterStates);

  if (Array.isArray(input.states)) return input.states;
  if (input.states && typeof input.states === 'object') return Object.values(input.states);

  if (Array.isArray(input.characters)) return input.characters;
  if (input.characters && typeof input.characters === 'object') return Object.values(input.characters);

  if (input.main?.rpgStates && typeof input.main.rpgStates === 'object') return Object.values(input.main.rpgStates);
  if (input.fallbackState?.characterStates && typeof input.fallbackState.characterStates === 'object') {
    return Object.values(input.fallbackState.characterStates);
  }

  return [];
}

function metricsToInitialMetrics(metrics = {}, fallbackProfile = {}) {
  if (fallbackProfile.initialMetrics && typeof fallbackProfile.initialMetrics === 'object') {
    return clone(fallbackProfile.initialMetrics);
  }
  const toList = (obj) =>
    Object.entries(obj || {}).map(([key, value]) => ({ key, value: Number(value) || 0 }));
  return {
    emotions: toList(metrics.emotions),
    playerFeelings: toList(metrics.playerFeelings),
  };
}

function buildCardFromState(state = {}) {
  const profile = clone(state.profile || state) || {};
  const values = clone(state.values || profile.values || {});
  if (profile.birthday !== undefined && values.birthday === undefined) {
    values.birthday = profile.birthday;
  }
  const target = targetByName(profile.name || state.name);

  if (!target) {
    throw new Error(`非目标角色：${profile.name || state.name || 'unknown'}`);
  }

  const isPlayer = target.isPlayer;
  const age = profile.age ?? values.age ?? '';
  const roleCardUpdatedAt = getStableRoleCardUpdatedAt(profile);

  const card = {
    ...profile,
    id: isPlayer ? 'player-self' : (profile.id || state.id || target.slug),
    name: target.name,
    age,
    work: profile.work || state.worldTag || values.world_tag || '2026 现代都市现实世界',
    values,
    items: Array.isArray(profile.items) && profile.items.length ? clone(profile.items) : clone(values.items || []),
    wearing: Array.isArray(profile.wearing) && profile.wearing.length ? clone(profile.wearing) : clone(values.wearing || []),
    factions: Array.isArray(profile.factions) && profile.factions.length ? clone(profile.factions) : clone(values.factions || []),
    force_positions: Array.isArray(profile.force_positions) && profile.force_positions.length ? clone(profile.force_positions) : clone(values.force_positions || []),
    bodyStatus: clone(profile.bodyStatus || values.bodyStatus || {}),
    intimacy: clone(profile.intimacy || values.intimacy || {}),
    initialMetrics: metricsToInitialMetrics(state.metrics || {}, profile),
    worldAttributes: clone(profile.worldAttributes || {
      worldTag: state.worldTag || profile.work || '2026 现代都市现实世界',
      source: 'predefined-export',
      fields: [],
    }),
    roleCardFieldReasons: clone(profile.roleCardFieldReasons || {}),
    rpgFieldReasons: clone(profile.rpgFieldReasons || {}),
    roleCard: true,
    roleCardSource: 'predefined',
    roleCardUpdatedAt,
  };

  if (isPlayer) {
    card.isPlayer = true;
  }

  if (isPlayer) {
    return card;
  }

  return normalizeAdultTriplet(card);
}

function buildExportBundle(states = []) {
  const sourceStates = extractCharacterStates(states);
  const byName = new Map(sourceStates.map((state) => [state?.profile?.name || state?.name, state]));
  const missing = TARGET_PEOPLE.filter((target) => !byName.has(target.name));
  if (missing.length) {
    throw new Error(`存档缺少目标角色：${missing.map((item) => item.name).join('、')}`);
  }

  return TARGET_PEOPLE.map((target) => {
    const card = buildCardFromState(byName.get(target.name));
    const json = `${JSON.stringify(card, null, 2)}\n`;
    const js = renderCardJs(target.slug, card);
    return { slug: target.slug, name: target.name, card, json, js };
  });
}

function renderCardJs(slug, card) {
  return `window.GameModules = window.GameModules || {};
window.GameModules.predefinedRoleCardData = window.GameModules.predefinedRoleCardData || {};
window.GameModules.predefinedRoleCardData['${slug}'] = ${JSON.stringify(card, null, 2)};
`;
}

function writeExportBundle(bundle, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const written = [];
  bundle.forEach((item) => {
    const jsonPath = path.join(outDir, `${item.slug}.json`);
    const jsPath = path.join(outDir, `${item.slug}.js`);
    fs.writeFileSync(jsonPath, item.json, 'utf8');
    fs.writeFileSync(jsPath, item.js, 'utf8');
    written.push(jsonPath, jsPath);
  });
  return written;
}

module.exports = {
  TARGET_PEOPLE,
  extractCharacterStates,
  buildCardFromState,
  buildExportBundle,
  renderCardJs,
  writeExportBundle,
  zeroSexualExperienceCounts,
  normalizeAdultTriplet,
};
