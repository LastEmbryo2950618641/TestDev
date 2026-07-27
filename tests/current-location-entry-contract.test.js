const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const canonical = '所在世界·所在势力·动态层级链·地图地点·详细位置';

const part1 = read('publish/prompts/character-profile-part1-base-identity.md');
const mapPrompt = read('publish/prompts/推演引擎/update/map-update-prompt.md');
const template = read('publish/character-profile-template-class.js');
const setup = read('publish/player-setup-defaults.js');
const identity = read('publish/player-identity-actions.js');

assert.match(part1, /required[^\n]+"currentLocation"/);
assert.ok(part1.includes(canonical));
assert.ok(part1.includes('第1段是当前所在世界'));
assert.ok(part1.includes('worldTag') && part1.includes('出生世界'));
assert.ok(mapPrompt.includes(canonical));
assert.ok(mapPrompt.includes('倒数第2段'));
assert.ok(template.includes(canonical));
assert.ok(setup.includes(canonical));
assert.ok(identity.includes(canonical));

console.log('PASS all character-card entry points share the current-location contract');
