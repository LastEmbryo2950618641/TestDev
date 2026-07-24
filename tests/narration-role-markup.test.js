const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
function loadScript(context, relativePath) {
  vm.runInNewContext(read(relativePath), context, { filename: relativePath });
}

const prompt = read('publish/prompts/推演引擎/stage3-narration.md');
assert.ok(prompt.includes('<role id="真实ID">角色名</role>') || prompt.includes('<role id='));
assert.ok(prompt.includes('{{出场角色标签清单}}'));
assert.ok(prompt.includes('可渲染的 HTML'));

const context = {
  window: { GameModules: {} },
  console,
  String,
  Boolean,
  Array,
  Object,
  Error,
  JSON,
  Math,
  Date,
  Number,
  Set,
  Map,
  RegExp,
};
loadScript(context, 'publish/character-id-ensure.js');
loadScript(context, 'publish/narration-role-markup.js');
const api = context.window.GameModules.narrationRoleMarkup;
assert.ok(api);

const tagged = '你走进房间，<role id="rel-ai-247528">刘思琪</role>抬起头看你。';
const mentions = api.extractRoleMentions(tagged);
assert.strictEqual(mentions.length, 1);
assert.strictEqual(mentions[0].id, 'rel-ai-247528');
assert.strictEqual(mentions[0].name, '刘思琪');

const html = api.toSafeHtml(tagged);
assert.ok(html.includes('data-role-id="rel-ai-247528"'));
assert.ok(html.includes('class="narration-role"'));
assert.ok(!html.includes('<role'));
assert.ok(html.includes('你走进房间'));

const forceTagged = '你在<force id="force-company-1">成都市高新区科创有限公司</force>上班。';
const forceMentions = api.extractForceMentions(forceTagged);
assert.strictEqual(forceMentions.length, 1);
assert.strictEqual(forceMentions[0].id, 'force-company-1');
const forceHtml = api.toSafeHtml(forceTagged);
assert.ok(forceHtml.includes('class="narration-force"'));
assert.ok(forceHtml.includes('data-force-id="force-company-1"'));
assert.ok(!forceHtml.includes('<force'));

const bareForce = '成都市高新区科创有限公司在高新区。';
const wrappedForce = api.wrapMissingForceTags(bareForce, [{ id: 'force-company-1', name: '成都市高新区科创有限公司' }]);
assert.ok(wrappedForce.includes('<force id="force-company-1">成都市高新区科创有限公司</force>'));
assert.strictEqual(api.forceTag('force-company-1', '成都市高新区科创有限公司'), '<force id="force-company-1">成都市高新区科创有限公司</force>');

assert.ok(prompt.includes('<force id="真实ID">势力名</force>') || prompt.includes('<force id='));
assert.ok(read('publish/real-world.css').includes('.narration-force'));

const unsafe = '攻击<script>alert(1)</script><role id="rel-ai-1">甲</role>';
const safe = api.toSafeHtml(unsafe);
assert.ok(!safe.includes('<script'));
assert.ok(safe.includes('&lt;script&gt;'));
assert.ok(safe.includes('data-role-id="rel-ai-1"'));

const bare = '刘思琪坐在窗边，望着你。';
const wrapped = api.wrapMissingRoleTags(bare, [{ id: 'rel-ai-247528', name: '刘思琪' }]);
assert.ok(wrapped.includes('<role id="rel-ai-247528">刘思琪</role>'));

assert.strictEqual(api.roleTag('rel-ai-247528', '刘思琪'), '<role id="rel-ai-247528">刘思琪</role>');
assert.strictEqual(api.roleTag('player-self', '刘悠'), '<role id="player-self">刘悠</role>');
assert.strictEqual(api.roleTag('', '路人'), '路人');

const guide = api.buildRoleTagGuide({
  forcedParticipants: [{ id: 'rel-ai-247528', name: '刘思琪' }],
}, { playerName: '刘悠' });
assert.ok(guide.includes('<role id="rel-ai-247528">刘思琪</role>'));
assert.ok(guide.includes('player-self'));

const protectedFormat = api.withProtectedRoleTags(
  '前文。<role id="rel-ai-247528">刘思琪</role>后文。',
  (text) => text.replace(/。/g, '。\n\n'),
);
assert.ok(protectedFormat.includes('<role id="rel-ai-247528">刘思琪</role>'));
assert.ok(!protectedFormat.includes('⟦R'));

// online control helper uses role tags + real player name
loadScript(context, 'publish/domain/control/online-control-helpers.js');
const helpers = context.window.GameModules.domain.control.onlineControlHelpers;
const host = {
  playerName: '刘悠',
  playerProfile: { name: '刘悠' },
  rpgStates: {
    'player-self': { id: 'player-self', profile: { name: '刘悠' } },
    'rel-ai-247528': { id: 'rel-ai-247528', profile: { name: '刘思琪' } },
  },
  sharedControlTargetName(state) { return state?.profile?.name || ''; },
};
const logText = helpers.buildOnlineControlLogText.call(host, host.rpgStates['rel-ai-247528']);
assert.ok(logText.includes('<role id="player-self">刘悠</role>'));
assert.ok(logText.includes('<role id="rel-ai-247528">刘思琪</role>'));
assert.ok(!logText.includes('慎二'));

const indexHtml = read('publish/index.html');
assert.ok(indexHtml.includes('x-html="$store.game.realWorldNarrationHtml(entry)"'));
assert.ok(indexHtml.includes('x-html="$store.game.novelStoryHtml(entry)"'));
const manifest = read('publish/boot/script-manifest.js');
assert.ok(manifest.includes('narration-role-markup.js'));

console.log('narration-role-markup tests passed');
