const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
function loadScript(context, relativePath) {
  vm.runInNewContext(read(relativePath), context, { filename: relativePath });
}

async function main() {
  const context = {
    window: { GameModules: {} },
    console,
  };
  loadScript(context, 'publish/character-state-store.js');
  loadScript(context, 'publish/current-location-field.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  loadScript(context, 'publish/player-identity-actions.js');
  loadScript(context, 'publish/rpg-field-ui.js');

  const fog = context.window.GameModules.realWorldMapFog;
  const storeApi = context.window.GameModules.characterStateStore;
  const loc = '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元601室内客厅沙发';
  const live = {
    id: 'rel-ai-247528',
    name: '刘思琪',
    profile: {
      id: 'rel-ai-247528',
      name: '刘思琪',
      work: '2026 现代都市现实世界',
      role: '三胞胎妹妹之二',
      appearance: '黑直长发',
      preferences: '偏爱黑丝JK',
      personality: '外表高冷',
      age: '15',
    },
    values: { current_location: { name: '当前位置未知' } },
  };
  const store = {
    identityTargetId: 'rel-ai-247528',
    rpgStates: { 'rel-ai-247528': live },
    characterSchedules: {},
    identityTargetState() { return this.rpgStates[this.identityTargetId] || null; },
    identityTargetProfile() { return this.identityTargetState()?.profile || {}; },
    roleCardReasonGetter() { return () => ''; },
    ...context.window.GameModules.playerIdentityActions,
    ...context.window.GameModules.rpgFieldUi,
  };
  storeApi.bindLiveHost(store);
  fog.mapApi = () => ({ factTime: () => '2026-07-23T12:00:00.000Z' });

  const payload = fog.validateUnlockPayload({
    当前节点: '锦苑小区3栋',
    周围地点: [],
    势力: [],
    地点信息: [],
    出场人物位置: [
      { 姓名: '刘思琪', ID: 'rel-ai-247528', 当前位置: loc },
    ],
  }, { name: '锦苑小区3栋' }, {}, 'full');

  assert.strictEqual(payload.characterLocations.length, 1, 'normalize must keep 出场人物位置');
  await fog.applyCharacterLocations(store, payload.characterLocations);

  assert.strictEqual(live.profile.currentLocation, loc, 'live profile must receive location');
  assert.strictEqual(
    store.characterSchedules['rel-ai-247528'].profileCurrentLocation,
    loc,
    'schedule profileCurrentLocation must be stamped',
  );

  const field = store.identityTargetFields().find((item) => item.label === '当前位置');
  assert.ok(field, 'identity fields must include 当前位置');
  assert.strictEqual(field.value, loc);
  assert.notStrictEqual(field.value, '未记录');

  const identitySection = store.profileSections(store.identityTargetState(), store.identityTargetFields())
    .find((section) => section.title === '身份信息');
  assert.ok(identitySection, '身份信息 section exists');
  const dossier = store.identityInfoPresentation(identitySection.fields || []);
  const loreLocation = (dossier.lore || []).find((card) => card.label === '当前位置');
  assert.ok(loreLocation, '叙事档案 must include 当前位置');
  assert.notStrictEqual(loreLocation.preview, '未记录');
  assert.ok(String(loreLocation.preview || '').includes('锦苑小区3栋'), loreLocation.preview);

  // Empty merge must not wipe a good live location.
  storeApi.mergeOntoLive({
    id: 'rel-ai-247528',
    profile: { id: 'rel-ai-247528', name: '刘思琪', currentLocation: '' },
    values: { current_location: { name: '当前位置未知' } },
  }, store);
  assert.strictEqual(live.profile.currentLocation, loc);

  // AI fused text must be written to card/DB as-is (no coerce gate).
  const fused = '中华人民共和国·四川省·成都市·武侯区锦苑小区3栋·2单元601号';
  const player = {
    id: 'player-self',
    name: '刘悠',
    profile: { id: 'player-self', name: '刘悠', isPlayer: true },
    values: { current_location: { name: '当前位置未知' } },
  };
  store.rpgStates['player-self'] = player;
  store.appearingLocationById = {};
  const saved = {};
  storeApi.source = () => ({
    save(character) {
      saved[character.id] = character.profile.currentLocation;
      return Promise.resolve(character);
    },
  });
  await fog.applyCharacterLocations(store, [
    { name: '刘悠', id: 'player-self', location: fused },
  ]);
  assert.strictEqual(player.profile.currentLocation, fused);
  assert.strictEqual(saved['player-self'], fused, 'player location must hit character_state save as AI text');
  assert.strictEqual(store.appearingLocationById['player-self'], fused);

  // Non-chain AI text still persists; map merge is skipped (no nodeId).
  const loose = '锦苑小区附近某处';
  await fog.applyCharacterLocations(store, [
    { name: '刘思琪', id: 'rel-ai-247528', location: loose },
  ]);
  assert.strictEqual(live.profile.currentLocation, loose);
  assert.strictEqual(saved['rel-ai-247528'], loose);

  console.log('PASS surround unlock JSON writes location that identity 叙事档案 can read');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
