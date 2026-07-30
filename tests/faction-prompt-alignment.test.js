const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

test('faction query skill documents Stage9 create/patch and Stage1 pending-candidate read', () => {
  const skill = read('publish/skills/faction-query/SKILL.md');
  const inline = read('publish/skill-docs-inline.js');
  assert.ok(skill.includes('createFaction'));
  assert.ok(skill.includes('patchFactionField'));
  assert.ok(skill.includes('getFactionField'));
  assert.ok(inline.includes('createFaction'));
  assert.ok(inline.includes('patchFactionField'));
});

test('Stage1 uses factions field and keeps createFaction out of Stage1 requests', () => {
  const materials = read('publish/prompts/materials/real-world-materials.js');
  assert.ok(materials.includes("method: 'createFaction', stage1Policy: 'deny'"));
  assert.ok(materials.includes('faction.query.patchFactionField'));
  const loader = read('publish/inference/material-loader.js');
  assert.ok(loader.includes('listFactions'));
  assert.ok(loader.includes('自动资料：全部势力名/ID与组织架构'));
  const catalog = read('publish/inference/material-request-catalog.js');
  const stage1 = read('publish/prompts/推演引擎/stage1-guided-query.md');
  assert.ok(stage1.includes('势力资料规则'));
  assert.ok(stage1.includes('factions：对象数组'));
  assert.ok(stage1.includes('status 只能是“已获取”或“待创建”'));
  assert.ok(stage1.includes('不是资料请求，也不是创建指令'));
  assert.ok(stage1.includes('字符串壳'));
  assert.ok(stage1.includes('API 选择路由'));
  assert.ok(stage1.includes('玩家输入可信度与可行性规则'));
  assert.ok(stage1.includes('既成结果、背景改写、状态突变或超出当前因果能力的宣称'));
  assert.ok(stage1.includes('只要稍微识别到可作为势力的组织线索'));
  assert.ok(!stage1.includes('判断标准只看该线索是否已经在上下文中出现'));
  assert.ok(!stage1.includes('禁止把没有具体名称、没有稳定指代、不能承载归属/规则/资源/关系的抽象标签造势力'));
  assert.ok(catalog.includes('工作查询'));
  assert.ok(stage1.includes('禁止写入 API'));
  assert.ok(!catalog.includes("action: '创建势力'"));
});

test('real-world faction query no longer blocks China as a concrete faction name or forces China parent fallback', () => {
  const script = read('publish/prompts/materials/real-world-faction-query.js');
  assert.ok(!script.includes('现实社会|现代社会|现实世界|社会|国家|公民|居民|成年人|成年学生|中华人民共和国'));
  assert.ok(!script.includes("|| this.findFaction(store, '中华人民共和国')"));
  assert.ok(script.includes('worldTag') || script.includes('所属世界'));
});


test('Stage1 catalog exposes work query but not createFaction request', () => {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        realWorld2026: { label: '2026现代都市现实世界' },
        realWorldAgentContextParts: {},
      },
    },
  });
  vm.runInContext(read('publish/inference/material-request-catalog.js'), context, { filename: 'publish/inference/material-request-catalog.js' });
  const catalog = context.window.GameModules.realWorldAgentContextParts.materialRequestCatalog;
  const workReq = catalog.parseJsonMaterialRequest({ type: '工作查询', action: '工作上下文', params: ['刘悠'] }, { mode: 'real' });
  assert.ok(workReq);
  assert.strictEqual(workReq.skill, 'company.query');
  assert.strictEqual(workReq.method, 'getWorkContext');
  assert.strictEqual(workReq.params.companyName, '刘悠');
  const createReq = catalog.parseJsonMaterialRequest({ type: '势力查询', action: '创建势力', params: ['成都市高新区科创有限公司', '公司'] }, { mode: 'real' });
  assert.strictEqual(createReq, null);
});


test('Stage1 createFaction request is blocked and must not become a pending candidate', async () => {
  const context = vm.createContext({
    console,
    Date,
    JSON,
    Set,
    Map,
    window: { GameModules: { realWorld2026: { label: '2026现代都市现实世界' }, realWorldAgentContextParts: {}, realWorldMaterials: null } },
  });
  context.window.window = context.window;
  vm.runInContext(read('publish/prompts/materials/real-world-materials.js'), context, { filename: 'publish/prompts/materials/real-world-materials.js' });
  vm.runInContext(read('publish/inference/material-dedup.js'), context, { filename: 'publish/inference/material-dedup.js' });
  vm.runInContext(read('publish/inference/material-loader.js'), context, { filename: 'publish/inference/material-loader.js' });
  const materials = context.window.GameModules.realWorldMaterials;
  const loader = context.window.GameModules.realWorldAgentContextParts.materialLoader;
  loader.materialReferenceCandidates = () => [];
  loader.materialReferenceFor = () => null;
  loader.materialReferenceText = (text) => text;
  loader.materialRequestKey = (skill, method, params) => `${skill}:${method}:${JSON.stringify(params || {})}`;
  const store = {};
  const reqs = [{ skill: 'faction.query', method: 'createFaction', params: { name: '成都市高新区科创有限公司', type: '公司', worldTag: '2026现代都市现实世界' }, sourceJson: { type: '势力查询', action: '创建势力', params: ['成都市高新区科创有限公司', '公司'] } }];
  const session = materials.createSession('行动');
  const out = await loader.loadRequests(store, '行动', reqs, new Set(), session, materials, new Set(), [], [], { limit: 3, step: 1, label: '现实' });
  assert.strictEqual((session.pendingFactionCandidates || []).length, 0);
  assert.ok(String(out[0].text || '').includes('Stage1 禁止'));
});
