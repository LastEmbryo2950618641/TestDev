const assert = require('assert');
const fs = require('fs');
const path = require('path');

const facadePath = path.join(__dirname, '..', 'publish', 'wechat-album-actions.js');
const source = fs.readFileSync(facadePath, 'utf8');

assert.ok(
  source.includes('// Compatibility facade: keep business logic in app/wechat modules.'),
  'album action entry must declare its compatibility-only boundary',
);

const methods = [...source.matchAll(
  /^\s{2}(?:async\s+)?([A-Za-z_$][\w$]*)\(\.\.\.args\)\s*\{/gm,
)].map((match) => match[1]);
const forwards = source.match(
  /return window\.GameModules\.app\.wechat\.[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*\.call\(this, \.\.\.args\);/g,
) || [];

assert.ok(methods.length >= 30, 'album facade should expose the preserved public method surface');
assert.strictEqual(forwards.length, methods.length, 'every public method must be a direct module forwarder');
assert.ok(!/this\.[A-Za-z_$][\w$]*\s*=/.test(source), 'facade must not mutate store state');
assert.ok(!/\b(?:const|let|var)\s+/.test(source), 'facade must not own local business state');
assert.ok(!/\b(?:if|for|while|switch|try|catch)\b/.test(source), 'facade must not own business control flow');
assert.ok(!/\bawait\s+this\./.test(source), 'facade must not orchestrate public methods through the store');

console.log(`PASS wechat album facade preserves ${methods.length} direct public forwarders`);
