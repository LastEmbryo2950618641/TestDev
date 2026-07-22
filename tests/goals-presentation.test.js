const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

function loadRpgFieldUi() {
  const context = { window: { GameModules: {} } };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish', 'rpg-field-ui.js'), 'utf8'), context);
  return context.window.GameModules.rpgFieldUi;
}

test('goals presentation splits bundled direction and goals text', () => {
  const ui = loadRpgFieldUi();
  const goals = ui.goalsPresentation([
    { key: 'life_goal', label: '目标', value: [
      '目标方向：',
      '近期方向：权力50 / 财富50 / 感情50 / 欲望50；主轴偏权力',
      '中期方向：权力50 / 财富50 / 感情50 / 欲望50；主轴偏权力',
      '长期方向：权力50 / 财富50 / 感情50 / 欲望50；主轴偏权力',
      '目标摘要：守住主线。',
      '近期目标：完成关键项目。',
      '中期目标：建立团队影响力。',
      '长期目标：成为稳定掌控者。',
    ].join('\n') },
  ]);

  assert.strictEqual(goals.hero.title, '守住主线。');
  assert.strictEqual(goals.cards[0].preview, '完成关键项目。');
  assert.strictEqual(goals.cards[1].preview, '建立团队影响力。');
  assert.strictEqual(goals.cards[2].preview, '成为稳定掌控者。');
  assert.strictEqual(goals.cards[0].direction.dominant, '权力');
  assert.deepEqual(goals.cards[0].direction.metrics.map((metric) => [metric.name, metric.value]), [
    ['权力', 50],
    ['财富', 50],
    ['感情', 50],
    ['欲望', 50],
  ]);
});
