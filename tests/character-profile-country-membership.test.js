const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

function createContext() {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        realWorld2026: { label: '2026 现代都市现实世界' },
        characterQuery: {
          normalizeWorldTag(value = '') {
            const text = String(value || '').trim();
            if (!text) return '';
            if (this.isRealWorldTag(text)) return '2026 现代都市现实世界';
            return text;
          },
          isRealWorldTag(value = '') {
            const text = String(value || '').trim();
            return ['现实世界', '现代都市现实世界', '2026 现代都市现实世界'].includes(text);
          },
        },
        socialPosition: {
          membershipItem(orgName, title, reason = '', _store = null, extra = {}) {
            return { orgName, title, reason, department: extra.department || '', departmentFog: extra.departmentFog !== false, source: extra.source || '' };
          },
        },
        factionSystem: {
          inferTopCountry() {
            return null;
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/character-profile.js');
  return context;
}

test('memberships do not invent default China citizenship in code', () => {
  const context = createContext();
  const tool = context.window.GameModules.characterProfile;
  const result = tool.memberships({ name: '刘悠', work: '2026 现代都市现实世界' }, { workplace: '', position: '' });
  assert.strictEqual(Array.isArray(result), true);
  assert.ok(!result.some((item) => item.orgName === '中华人民共和国' && item.title === '公民'));
});

test('memberships do not fabricate China citizenship for non-real-world characters', () => {
  const context = createContext();
  const tool = context.window.GameModules.characterProfile;
  const result = tool.memberships({ name: '阿尔托莉雅', work: 'Fate/stay night' }, { workplace: '', position: '' });
  assert.strictEqual(Array.isArray(result), true);
  assert.strictEqual(result.length, 0);
});

test('certificates and titles are profile-only identity facts with exact dedupe keys', () => {
  const context = createContext();
  const tool = context.window.GameModules.characterProfile;
  const certificates = tool.uniqueCertificates([
    { orgName: '中华人民共和国', field: '机动车驾驶证', level: 'C类', reason: '已取得C类驾驶资格。' },
    { orgName: '中华人民共和国', field: '机动车驾驶证', level: 'C类', reason: '重复证书。' },
  ]);
  const titles = tool.uniqueTitles([
    { society: '中华人民共和国群众', field: '农业', title: '杂交水稻之父', reason: '公众认可其农业贡献。' },
    { society: '中华人民共和国群众', field: '农业', title: '杂交水稻之父', reason: '重复称号。' },
  ]);
  assert.strictEqual(JSON.stringify(certificates), JSON.stringify([{ orgName: '中华人民共和国', field: '机动车驾驶证', level: 'C类', reason: '已取得C类驾驶资格。' }]));
  assert.strictEqual(JSON.stringify(titles), JSON.stringify([{ society: '中华人民共和国群众', field: '农业', title: '杂交水稻之父', reason: '公众认可其农业贡献。' }]));
});

(async () => {
  for (const item of tests) {
    await item.fn();
    console.log(`PASS ${item.name}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
