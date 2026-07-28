const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadConfig() {
  const relPath = 'publish/appearance-profile-tags-config.js';
  const file = path.join(__dirname, '..', relPath);
  const code = fs.readFileSync(file, 'utf8');
  const context = {
    window: { GameModules: {} },
    console,
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: relPath });
  return context.window.GameModules.appearanceProfileTags;
}

const cfg = loadConfig();
assert.ok(cfg, 'appearance profile tags config should load');

const factGuide = cfg.bodyChangeFactGuide();
assert.ok(factGuide.includes('亲密/性相关后的身体观感'));
assert.ok(factGuide.includes('潮红、湿润、水迹、体液痕迹'));
assert.ok(!factGuide.includes('永久体貌改变'));
assert.ok(!factGuide.includes('须达到可写进 tags 的**档位跨越**'));

const triggerGuide = cfg.stage5GateTriggerGuide();
assert.ok(triggerGuide.includes('对可见体貌变化更灵敏'));
assert.ok(triggerGuide.includes('不再是唯一入口'));
assert.ok(!triggerGuide.includes('实际发生永久变化'));
assert.ok(!triggerGuide.includes('临时生理反应、可洗净污渍、妆造塑形'));

console.log('stage6 profile gate guidance verified');
