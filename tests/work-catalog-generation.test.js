const assert = require('assert');
const {
  buildOutputs,
  loadWorkConfigs,
  parseCharacterIndex,
} = require('../dev/scripts/generate-work-catalog.cjs');

const sample = [
  '| 年龄 | 人物 | 详细文件 | 身份/定位 | 标签 | 性别 |',
  '| --- | --- | --- | --- | --- | --- |',
  '| 17岁 | 测试人物 | 主要人物/测试人物.md | 学生 | 测试标签 | 女 |',
].join('\n');
const parsed = parseCharacterIndex(sample, {
  name: '测试作品',
  lore: { characterRoot: '01_按需加载_人物' },
});

assert.strictEqual(parsed.length, 1);
assert.strictEqual(parsed[0].name, '测试人物');
assert.strictEqual(parsed[0].role, '学生');
assert.strictEqual(parsed[0].profilePath, '01_按需加载_人物/主要人物/测试人物.md');
assert.strictEqual(parsed[0].id, 'char-e8cfef3d1ed2');

const configs = loadWorkConfigs();
assert.strictEqual(configs.length, 13);
assert.ok(configs.some((config) => config.name === '刀剑神域'));

const outputs = buildOutputs();
const catalog = JSON.parse(outputs.get(require('path').resolve(
  __dirname,
  '..',
  'assets',
  '刀剑神域',
  'metadata',
  'character-catalog.json',
)));
assert.strictEqual(catalog.work.name, '刀剑神域');
assert.ok(catalog.work.characters.some((character) => character.name === '桐人'));

console.log('work catalog generation tests passed');
