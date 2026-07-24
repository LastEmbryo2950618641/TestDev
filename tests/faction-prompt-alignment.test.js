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

test('faction audit prompt requires worldTag and forbids hardcoded China seed', () => {
  const md = read('publish/prompts/faction-audit.md');
  const js = read('publish/prompts/faction-audit.js');
  assert.ok(md.includes('worldTag'));
  assert.ok(js.includes('worldTag'));
  assert.ok(md.includes('所属世界'));
  assert.ok(md.includes('不得依赖代码默认国家'));
  assert.ok(js.includes('不得依赖代码默认国家'));
  assert.ok(!md.includes('中国人、中国地址或无明确国家证据时默认“中华人民共和国”'));
});

test('faction query skill documents Stage6 create/patch and Stage1 field read', () => {
  const skill = read('publish/skills/faction-query/SKILL.md');
  const inline = read('publish/skill-docs-inline.js');
  assert.ok(skill.includes('createFaction'));
  assert.ok(skill.includes('patchFactionField'));
  assert.ok(skill.includes('getFactionField'));
  assert.ok(inline.includes('createFaction'));
  assert.ok(inline.includes('patchFactionField'));
});

test('Stage1 allows createFaction and auto-loads faction list', () => {
  const materials = read('publish/prompts/materials/real-world-materials.js');
  assert.ok(materials.includes("method: 'createFaction', stage1Policy: 'allow'"));
  assert.ok(!materials.includes("faction.query.createFaction"));
  assert.ok(materials.includes('faction.query.patchFactionField'));
  const loader = read('publish/inference/material-loader.js');
  assert.ok(loader.includes('listFactions'));
  assert.ok(loader.includes('自动资料：全部势力名/ID与组织架构'));
  const catalog = read('publish/inference/material-request-catalog.js');
  assert.ok(catalog.includes("action: '创建势力'"));
  assert.ok(catalog.includes("method: 'createFaction'"));
  const stage1 = read('publish/prompts/推演引擎/stage1-guided-query.md');
  assert.ok(stage1.includes('势力资料规则'));
  assert.ok(stage1.includes('创建势力'));
  assert.ok(stage1.includes('不得因本轮未互动'));
});

test('real-world faction query no longer blocks China as a concrete faction name or forces China parent fallback', () => {
  const script = read('publish/prompts/materials/real-world-faction-query.js');
  assert.ok(!script.includes('现实社会|现代社会|现实世界|社会|国家|公民|居民|成年人|成年学生|中华人民共和国'));
  assert.ok(!script.includes("|| this.findFaction(store, '中华人民共和国')"));
  assert.ok(script.includes('worldTag') || script.includes('所属世界'));
});
