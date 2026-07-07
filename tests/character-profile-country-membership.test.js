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
          inferTopCountry(profile = {}) {
            const text = [profile.country, profile.nationality, profile.work, profile.detail].filter(Boolean).join(' ');
            if (/美国|USA|United States/i.test(text)) return { name: '美利坚合众国' };
            return { name: '中华人民共和国' };
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/character-profile.js');
  return context;
}

test('memberships add China citizenship by default only in real world', () => {
  const context = createContext();
  const tool = context.window.GameModules.characterProfile;
  const result = tool.memberships({ name: '刘悠', work: '2026 现代都市现实世界' }, { workplace: '', position: '' });
  assert.strictEqual(result[0].orgName, '中华人民共和国');
  assert.strictEqual(result[0].title, '公民');
});

test('memberships do not fabricate China citizenship for non-real-world characters', () => {
  const context = createContext();
  const tool = context.window.GameModules.characterProfile;
  const result = tool.memberships({ name: '阿尔托莉雅', work: 'Fate/stay night' }, { workplace: '', position: '' });
  assert.strictEqual(Array.isArray(result), true);
  assert.strictEqual(result.length, 0);
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
