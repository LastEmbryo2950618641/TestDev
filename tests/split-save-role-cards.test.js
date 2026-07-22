const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const tool = require('../tools/split-save-role-cards');

test('splits save export characters without changing card shape', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'split-save-role-cards-'));
  const input = path.join(root, 'slot-export.json');
  const outDir = path.join(root, 'cards');
  const roleCard = {
    id: 'rel-ai-1',
    name: '测试角色',
    worldTag: '测试世界',
    profile: { id: 'rel-ai-1', name: '测试角色', bodyProfile: [{ part: '头部', tags: ['黑发'] }] },
    values: { layer1: '价值立场' },
    metrics: { emotions: { calm: 10 } },
    memory: { records: [] },
    schema: { version: 1 },
    updatedAt: '2026-07-22T11:27:30.616Z',
  };
  fs.writeFileSync(input, JSON.stringify({ slot: 'slot-4', count: 1, characters: [roleCard] }), 'utf8');

  const written = tool.splitSaveRoleCards(input, { outDir });
  assert.strictEqual(written.length, 1);
  const saved = JSON.parse(fs.readFileSync(written[0], 'utf8'));
  assert.deepStrictEqual(saved, roleCard);
  assert.deepStrictEqual(Object.keys(saved), Object.keys(roleCard));
});

test('requires characters array to avoid ambiguous conversion', () => {
  assert.throws(() => tool.assertSaveExport({ profile: { name: '不是存档导出' } }), /characters 数组/);
});

test('uses stable readable file names independent from card data', () => {
  assert.strictEqual(
    tool.outputFileName({ id: 'role:1', name: '刘/思琪' }, 0),
    '01-刘-思琪-role-1.json',
  );
});
