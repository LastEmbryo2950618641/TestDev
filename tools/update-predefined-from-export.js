#!/usr/bin/env node
/**
 * 从 slot 导出 JSON 更新预定义角色卡（publish/predefined-role-cards/*.js）。
 * 用法: node tools/update-predefined-from-export.js [export.json]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'publish/predefined-role-cards');
const APPEARANCE_PATH = path.join(OUT_DIR, 'predefined-appearance-profiles.js');

const NAME_TO_KEY = {
  刘悠: 'liu-you',
  刘思瑶: 'liu-siyao',
  刘思琪: 'liu-siqi',
  刘思怡: 'liu-siyi',
};

const GARDEN_TAG_ALIASES = {
  白虎: '无阴毛',
  稀疏: '阴毛稀疏',
  浓郁: '阴毛浓密',
  浓密: '阴毛浓密',
};

const LAYER5_TAG_ALIASES = [
  ['外貌偏好:萝莉,娇小,白皮肤', '外貌偏好:萝莉,娇小,白皮肤'],
  ['外貌偏好:萝莉,贫乳,白虎', '外貌偏好:萝莉,贫乳,无阴毛'],
  [',白虎,', ',无阴毛,'],
  [',稀疏,', ',阴毛稀疏,'],
  [',浓郁,', ',阴毛浓密,'],
];

function normalizeGardenTag(tag) {
  return GARDEN_TAG_ALIASES[String(tag || '').trim()] || String(tag || '').trim();
}

function normalizeLayer5(layer5 = '') {
  let s = String(layer5 || '');
  LAYER5_TAG_ALIASES.forEach(([from, to]) => {
    s = s.split(from).join(to);
  });
  return s;
}

function normalizeProfile(profile = {}, key = '') {
  const p = JSON.parse(JSON.stringify(profile));
  (p.bodyProfile || []).forEach((item) => {
    if (item?.part === '神秘花园' && Array.isArray(item.tags)) {
      item.tags = item.tags.map(normalizeGardenTag);
    }
  });
  if (p.essentialPreferenceLayers?.layer5) {
    p.essentialPreferenceLayers.layer5 = normalizeLayer5(p.essentialPreferenceLayers.layer5);
  }
  p.roleCard = true;
  if (key === 'liu-you') p.isPlayer = true;
  else delete p.isPlayer;
  if (!p.roleCardSource) p.roleCardSource = 'predefined-edited';
  if (!p.essentialPreferenceLayersLocked && p.essentialPreferenceLayers?.layer1) {
    p.essentialPreferenceLayersLocked = true;
  }
  return p;
}

function writeRoleCardJs(key, profile) {
  const header = [
    'window.GameModules = window.GameModules || {};',
    'window.GameModules.predefinedRoleCardData = window.GameModules.predefinedRoleCardData || {};',
    `window.GameModules.predefinedRoleCardData['${key}'] = `,
  ].join('\n');
  const body = JSON.stringify(profile, null, 2);
  fs.writeFileSync(path.join(OUT_DIR, `${key}.js`), `${header}${body};\n`);
  fs.writeFileSync(path.join(OUT_DIR, `${key}.json`), `${body}\n`);
}

function partTagsFromProfile(list = []) {
  const out = {};
  list.forEach((item) => {
    if (item?.part && Array.isArray(item.tags) && item.tags.length) {
      out[item.part] = item.tags.slice();
    }
  });
  return out;
}

function buildAppearanceProfiles(profilesByKey) {
  const entries = Object.entries(profilesByKey).map(([key, profile]) => {
    const preset = {
      bodyProfileMeta: profile.bodyProfileMeta || {},
      dressedProfileMeta: profile.dressedProfileMeta || {},
      bodyProfileTags: partTagsFromProfile(profile.bodyProfile),
      dressedProfileTags: partTagsFromProfile(profile.dressedProfile),
    };
    return `  '${key}': ${JSON.stringify(preset, null, 4).replace(/^/gm, '  ').trimStart()}`;
  });
  return [
    'window.GameModules = window.GameModules || {};',
    '',
    '/**',
    ' * 预定义角色卡 Part5/Part6 外貌 meta 与各部位 tags。',
    ' * 由 tools/update-predefined-from-export.js 从 slot 导出同步；缺省由 applyAppearanceProfile 推断。',
    ' */',
    'window.GameModules.predefinedAppearanceProfiles = {',
    entries.join(',\n'),
    '};',
    '',
  ].join('\n');
}

function main() {
  const exportPath = path.resolve(process.argv[2] || path.join(OUT_DIR, 'slot-2-export.json'));
  if (!fs.existsSync(exportPath)) {
    console.error(`Export not found: ${exportPath}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  const characters = Array.isArray(data.characters) ? data.characters : [];
  const profilesByKey = {};

  characters.forEach((entry) => {
    const name = entry?.name || entry?.profile?.name;
    const key = NAME_TO_KEY[name];
    if (!key || !entry?.profile) {
      console.warn(`Skip unknown character: ${name || '(no name)'}`);
      return;
    }
    const profile = normalizeProfile(entry.profile, key);
    writeRoleCardJs(key, profile);
    profilesByKey[key] = profile;
    console.log(`Updated ${key}.js (${name})`);
  });

  const sisterKeys = ['liu-siyao', 'liu-siqi', 'liu-siyi'].filter((k) => profilesByKey[k]);
  if (sisterKeys.length) {
    fs.writeFileSync(APPEARANCE_PATH, buildAppearanceProfiles(
      Object.fromEntries(sisterKeys.map((k) => [k, profilesByKey[k]])),
    ));
    console.log(`Updated predefined-appearance-profiles.js (${sisterKeys.join(', ')})`);
  }

  console.log('Done.');
}

main();
