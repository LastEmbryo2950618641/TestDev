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

const context = {
  window: { GameModules: {} },
  console,
  String,
  Boolean,
  Array,
  Object,
  Error,
  JSON,
  Math,
  Date,
  Number,
  Set,
  Map,
  RegExp,
};
loadScript(context, 'publish/player-aspiration-preference-layers.js');
loadScript(context, 'publish/player-aspiration-config.js');
const api = context.window.GameModules.playerAspirationPreferenceLayers;
assert.ok(api);

assert.strictEqual(api.isImmutableFieldName('价值立场偏好'), true);
assert.strictEqual(api.isImmutableFieldName('决策风格偏好'), true);
assert.strictEqual(api.isImmutableFieldName('人生六维偏好'), true);
assert.strictEqual(api.isImmutableFieldName('底线锚点偏好'), true);
// Life-orientation lexicon uses the same short label; must remain visible.
assert.strictEqual(api.isImmutableFieldName('心理偏好'), false);
assert.strictEqual(api.isImmutableFieldName('价值立场'), false);
assert.strictEqual(api.isImmutableFieldName('本质偏好·心理偏好'), true);

// 0 must not collapse to 50 when formatting layers.
const zeroAxes = api.formatLayer3({
  control_freedom: 0,
  detachment_engagement: 50,
  depth_breadth: 50,
  acquisition_giving: 50,
  tradition_innovation: 50,
  solitude_companionship: 50,
});
assert.ok(zeroAxes.includes('偏掌控0') || /权力\/自由[^,]*0/.test(zeroAxes), zeroAxes);
assert.ok(!/权力\/自由居中50/.test(zeroAxes), zeroAxes);

const profile = {
  essentialPreferenceLayers: {
    layer1: '价值立场偏好: 守序邪恶',
    layer2: '决策风格偏好: 偏绝对理性,0',
    layer3: '人生六维偏好: 权力/自由居中50,智慧/欲望居中50,感情/名望居中50,财富/救赎居中50,平凡/创造居中50,内省/归属居中50',
    layer4: '底线锚点偏好: 伦理·普世是非偏无伦理0,职业·身份尊严居中50',
    layer5: '心理偏好: 未勾选',
  },
  psychPreferences: {
    selected: {
      emotion_pref: ['妹控', '主动对异性', '保护型'],
      appearance_pref: ['萝莉', '贫乳', '无阴毛'],
    },
  },
  lifeOrientation: {
    completedAt: '2026-07-01T00:00:00.000Z',
    alignment: 'lawful_evil',
    alignmentLabel: '守序邪恶',
    rationality: 0,
    rationalityLabel: '偏绝对理性',
    axes: {
      control_freedom: 0,
      detachment_engagement: 50,
      depth_breadth: 50,
      acquisition_giving: 40,
      tradition_innovation: 50,
      solitude_companionship: 50,
    },
    guiltAxes: { ethics: 0, profession: 50 },
    psychPreferences: {
      selected: {
        emotion_pref: ['妹控', '主动对异性', '保护型'],
        appearance_pref: ['萝莉', '贫乳', '无阴毛'],
      },
    },
  },
};

const repaired = api.ensureOnProfile(profile);
assert.ok(repaired.layer5);
assert.ok(!/未勾选/.test(repaired.layer5));
assert.ok(repaired.layer5.includes('妹控'));
assert.ok(repaired.layer2.includes(',0') || repaired.layer2.endsWith('0'), repaired.layer2);
assert.ok(/权力\/自由[^,]*0/.test(repaired.layer3), repaired.layer3);
const view = api.viewFromLayers(repaired);
assert.ok((view.psychGroups || []).length >= 1);
assert.strictEqual(view.rationality, 0);
assert.strictEqual(view.axes[0].value, 0);
const chinesePunctuationView = api.viewFromLayers({
  layer1: '价值立场偏好: 守序邪恶',
  layer2: '决策风格偏好: 偏绝对理性,0',
  layer3: '人生六维偏好: 权力/自由偏掌控0',
  layer4: '底线锚点偏好: 伦理·普世是非偏无伦理0',
  layer5: '心理偏好: 情感偏好：妹控，主动对异性、保护型；穿着偏好：制服感，过膝袜控；穿着偏好：短发，干练风',
});
assert.ok(chinesePunctuationView.psychGroups.length >= 3);
assert.strictEqual(Array.from(chinesePunctuationView.psychGroups[0].tags).join('|'), '妹控|主动对异性|保护型');
const duplicatedLabels = chinesePunctuationView.psychGroups.filter((group) => group.groupLabel === '穿着偏好');
assert.strictEqual(duplicatedLabels.length, 2);
assert.notStrictEqual(duplicatedLabels[0].key, duplicatedLabels[1].key);

// Continue-game: profile exists without layers → rebuild from lifeOrientation.
const continued = {
  name: '测试',
  lifeOrientation: {
    completedAt: '2026-07-01T00:00:00.000Z',
    alignment: 'lawful_evil',
    alignmentLabel: '守序邪恶',
    rationality: 0,
    rationalityLabel: '偏绝对理性',
    axes: {
      control_freedom: 0,
      detachment_engagement: 50,
      depth_breadth: 50,
      acquisition_giving: 50,
      tradition_innovation: 50,
      solitude_companionship: 50,
    },
    guiltAxes: { ethics: 0, profession: 50 },
    psychPreferences: {
      selected: { emotion_pref: ['妹控', '主动对异性', '保护型'] },
    },
  },
};
const rebuilt = api.ensureOnProfile(continued);
assert.ok(rebuilt?.layer1, 'continue-game should rebuild layer1');
assert.ok(rebuilt.layer1.includes('守序邪恶'));
assert.ok(continued.essentialPreferenceLayers?.layer1);
assert.strictEqual(api.viewFromLayers(rebuilt).axes[0].value, 0);

console.log('psych-preference-visibility: ok');
