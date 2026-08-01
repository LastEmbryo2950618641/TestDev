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

function loadProfileStage5() {
  const relPath = 'publish/real-world-profile-stage5.js';
  const file = path.join(__dirname, '..', relPath);
  const code = fs.readFileSync(file, 'utf8');
  const context = {
    window: {
      GameModules: {
        characterProfile: {
          bodyProfileParts: () => ['头发', '脸部', '耳朵', '脖颈', '胸部', '双臂', '小腹', '臀部', '神秘花园', '双大腿', '双小腿'],
        },
        characterStateStore: {
          getByName: () => null,
        },
      },
    },
    console,
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: relPath });
  return context.window.GameModules.realWorldProfileStage5;
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
assert.ok(triggerGuide.includes('湿发'));
assert.ok(triggerGuide.includes('卸妆'));
assert.ok(triggerGuide.includes('素颜'));
assert.ok(!triggerGuide.includes('实际发生永久变化'));
assert.ok(!triggerGuide.includes('临时生理反应、可洗净污渍、妆造塑形'));

const profileStage5 = loadProfileStage5();

const store = {
  itemSkillState: () => ({
    id: 'rel-ai-247528',
    name: '刘思琪',
    profile: {
      bodyProfile: [{ part: '头发', description: '旧自然外观' }],
      dressedProfile: [{ part: '头发', description: '旧盛装外观' }],
    },
  }),
};
const targets = profileStage5.normalizeGateTargets({
  targets: [{
    subject: '刘思琪',
    profileType: 'dressedProfile',
    updateScope: 'parts',
    parts: ['头发', '脸部'],
    reason: '刚洗澡湿发卸妆素颜',
    evidence: '湿发滴水、水汽、素颜',
  }],
}, store);
assert.strictEqual(targets.length, 1);
assert.strictEqual(targets[0].profileType, 'bodyProfile');

console.log('stage6 profile gate guidance verified');
