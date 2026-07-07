const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test('faction audit prompt aligns with real-world-only China default rule', () => {
  const md = read('publish/prompts/faction-audit.md');
  const js = read('publish/prompts/faction-audit.js');
  const expected = '只有在“2026 现代都市现实世界 / 现实世界”且没有任何其它国家证据时，才默认“中华人民共和国”';
  assert.ok(md.includes(expected));
  assert.ok(js.includes(expected));
  assert.ok(!md.includes('中国人、中国地址或无明确国家证据时默认“中华人民共和国”'));
});

test('faction query skill no longer mandates China fallback outside real-world default case', () => {
  const skill = read('publish/skills/faction-query/SKILL.md');
  const inline = read('publish/skill-docs-inline.js');
  const expected = '只有在现实世界且缺少任何其它国家证据时才可默认“中华人民共和国”';
  assert.ok(skill.includes(expected));
  assert.ok(inline.includes(expected));
});

test('real-world faction query no longer blocks China as a concrete faction name or forces China parent fallback', () => {
  const script = read('publish/prompts/materials/real-world-faction-query.js');
  assert.ok(!script.includes('现实社会|现代社会|现实世界|社会|国家|公民|居民|成年人|成年学生|中华人民共和国'));
  assert.ok(!script.includes("|| this.findFaction(store, '中华人民共和国')"));
});
