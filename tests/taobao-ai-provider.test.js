const assert = require('assert');
const fs = require('fs');
const test = require('node:test');

test('taobao generation uses unified ai provider instead of legacy dzmm gate', () => {
  const source = fs.readFileSync('publish/app/taobao/generate-flow.js', 'utf8');
  assert.ok(source.includes('jsonUtils.generateJsonWithRetry'));
  assert.ok(!source.includes('window.dzmm?.completions'));
  assert.ok(!source.includes('AI接口不可用'));
});

test('taobao generation requests one batch json response for multiple products', () => {
  const source = fs.readFileSync('publish/app/taobao/generate-flow.js', 'utf8');
  const calls = source.match(/generateJsonWithRetry/g) || [];
  assert.strictEqual(calls.length, 1);
  assert.ok(source.includes('batchCount: targets.length'));
  assert.ok(source.includes('Array.isArray(data?.products)'));
  assert.ok(source.includes('jsonMode: true'));
  assert.ok(source.includes("responseFormat: { type: 'json_object' }"));
  assert.ok(!/for\s*\([^)]*\)\s*\{[\s\S]{0,500}generateJsonWithRetry/.test(source));
});

test('taobao prompt requires exact products array count', () => {
  const markdown = fs.readFileSync('publish/prompts/taobao-product-generate.md', 'utf8');
  const inline = fs.readFileSync('publish/prompts/taobao-product-generate.js', 'utf8');
  assert.ok(markdown.includes('顶层只包含 products 数组'));
  assert.ok(markdown.includes('products 必须正好 {{productCount}} 项'));
  assert.ok(inline.includes('products 必须正好 {{productCount}} 项'));
});
