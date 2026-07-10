# Control Experience Stage Prompt Injection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable “上线体验配置” app that lets the user edit one master prompt, then inject stage-aware control-experience guidance based on `上线次数 + 适应度` into immediate reaction and follow-up narration.

**Architecture:** Keep stage thresholds fixed in code. Add one small rules module that converts `onlineCount` and `adaptation` into neutral stage metadata plus a rendered prompt block, then reuse that rendered block in both the immediate `character-feedback` flow and the active story runtime continuity path. Keep Stage1 as a material-collection layer only: it may expose data, but it must not narrate or inject final reaction logic.

**Tech Stack:** Plain browser JavaScript, Alpine store state, existing static prompt/template system, existing desktop app/window pattern, Node `vm`-based test files.

---

## File Map

- Create: `C:/Users/liuqi/Documents/TestDev/publish/control-experience-config.js`
  - Default config, config normalization, preview cases, default master prompt text.
- Create: `C:/Users/liuqi/Documents/TestDev/publish/control-experience-stage.js`
  - Stage tier calculation, neutral stage description assembly, prompt-block rendering helpers.
- Create: `C:/Users/liuqi/Documents/TestDev/publish/control-experience-config-app.js`
  - Desktop app open/close/save/reset/preview actions.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/boot/scripts.json`
  - Register the three new modules in boot order.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/boot/script-manifest.js`
  - Keep runtime manifest aligned with the boot list.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/game.js`
  - Add store state for the new config app and loaded config values.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/storage.js`
  - Persist and restore the config safely.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/app-switch-actions.js`
  - Close the new app along with other desktop apps.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/character-feedback.js`
  - Build and inject the new stage rule block into the first-reaction prompt.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/prompts/character-feedback.md`
  - Add a placeholder section for the injected rule block.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/prompts/character-feedback.js`
  - Keep the runtime inline prompt in sync with the markdown source.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/story-agent-context.js`
  - Add the same stage-aware rule block to the active story continuity context.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/index.html`
  - Add desktop icon and app window for “上线体验配置”.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/settings-app.css`
  - Reuse or extend the existing settings-app styling for the new app surface.
- Modify: `C:/Users/liuqi/Documents/TestDev/tests/story-agent-guided.test.js`
  - Assert Stage1 remains routing-only while continuity context can carry control-experience rules.
- Create: `C:/Users/liuqi/Documents/TestDev/tests/control-experience-stage.test.js`
  - Cover tier calculation, neutral description generation, and prompt block rendering.
- Create: `C:/Users/liuqi/Documents/TestDev/tests/control-experience-config-app.test.js`
  - Cover config normalization plus open/save/reset app actions.

## Active Runtime Notes

- Immediate reaction path is live in `publish/character-feedback.js`; this is the primary injection point.
- Ongoing story continuity is live through `publish/story-agent-context.js` + `publish/real-world-agent-loop.js` + `publish/prompts/推演引擎/stage3-narration.js`.
- `publish/prompts/story-engine.md` exists as legacy prompt documentation, but the current live story pipeline does not call `renderPrompt('story-engine', ...)`. This plan injects the live path instead of the legacy file so the feature affects actual gameplay.
- Stage1 lives in `publish/prompts/推演引擎/stage1-guided-query.md` and related routing helpers. It must remain a retrieval/planning phase, not a reaction-writing phase.

## Canonical Default Prompt Text

Use this exact default `masterPrompt` in `publish/control-experience-config.js`:

```text
你正在生成${被控制者}在“被玩家上线操控”相关情境中的反应。

请先读取当前阶段信息：
- 上线次数：${上线次数}
- 适应度：${适应度}
- 当前阶段：${上线阶段}
- 阶段说明：${阶段说明}

写作使用规则：
1. 上线次数与阶段说明用于判断她对这种身体控制变化的经历深度、熟悉程度与预期程度。
2. 适应度用于判断她对这种状态的承受与应对是否已经形成稳定经验。
3. 当上线次数为 0 时，应体现这是首次经历这种状态；当上线次数大于 0 时，可体现她对这种状态已存在历史记忆。
4. 最终反应必须结合角色性格、身份、当前场景、当前目标和既有关系自然生成。
5. 不要直接复述阶段说明原文，而是把这些信息转化为角色此刻的感受重点、认知变化、应对倾向和行为反应。
6. 只把阶段信息当作“经历结构”使用，不要把它写成固定句式标签。
```

## Stage Description Strategy

Do not hardcode 16 full emotional paragraphs. Build descriptions from two neutral fragment tables:

```js
const countTierMeta = {
  first: '这是她第一次经历这种身体控制权变化，对这一状态几乎没有既有经验。',
  earlyRepeat: '她已经经历过这种状态再次出现，对它并非完全陌生，但经验仍然有限。',
  familiar: '她对这种状态已有一段累积经历，能够意识到它的出现方式与影响范围。',
  seasoned: '她对这种状态已有较深积累，能够较稳定地识别它带来的身体与认知变化。',
};

const adaptationTierMeta = {
  veryLow: '她尚未形成稳定的应对方式，这种变化对她的身体感和判断都会构成明显冲击。',
  low: '她开始能辨认这种状态，但仍缺乏成熟的处理节奏与稳定预期。',
  medium: '她已经具备一定适应经验，反应中可以体现出逐步形成的应对惯性。',
  high: '她对这种状态已有较高适应度，反应中可以体现出更成熟的承受、判断与调节能力。',
};
```

Then assemble:

```js
const stageDescription = `${countText}${adaptationText}反应需继续结合角色性格、身份与当前场景自然展开。`;
```

This keeps the stage text neutral, non-mechanical, and reusable across personalities.

## Implementation Tasks

### Task 1: Add the stage/config foundation

**Files:**
- Create: `C:/Users/liuqi/Documents/TestDev/publish/control-experience-config.js`
- Create: `C:/Users/liuqi/Documents/TestDev/publish/control-experience-stage.js`
- Create: `C:/Users/liuqi/Documents/TestDev/tests/control-experience-stage.test.js`

- [ ] **Step 1: Write the failing stage test**

```js
test('stage resolver treats first-time low-adaptation as first-stage metadata, not fixed emotion', () => {
  const context = createContext();
  loadScript(context, 'publish/control-experience-config.js');
  loadScript(context, 'publish/control-experience-stage.js');
  const api = context.window.GameModules.controlExperienceStage;
  const meta = api.resolveStageMeta({ onlineCount: 0, adaptation: 6 });

  assert.strictEqual(meta.countTier, 'first');
  assert.strictEqual(meta.adaptationTier, 'veryLow');
  assert.ok(meta.stageLabel.includes('首次'));
  assert.ok(meta.stageDescription.includes('第一次'));
  assert.ok(!meta.stageDescription.includes('恐惧'));
  assert.ok(!meta.stageDescription.includes('顺从'));
});
```

- [ ] **Step 2: Add the prompt rendering test**

```js
test('renderPromptBlock injects user template with resolved variables', () => {
  const context = createContext();
  loadScript(context, 'publish/control-experience-config.js');
  loadScript(context, 'publish/control-experience-stage.js');
  const stage = context.window.GameModules.controlExperienceStage;
  const config = context.window.GameModules.controlExperienceConfig.normalize({
    enabled: true,
    masterPrompt: '阶段={{上线阶段}}；说明={{阶段说明}}；对象={{被控制者}}',
  });
  const text = stage.renderPromptBlock({
    config,
    experience: { onlineCount: 3, adaptation: 12, feeling: '未知', summary: '无' },
    targetName: '阿尔托莉雅',
    personality: '克制',
    identity: '骑士',
    scene: '庭院',
  });

  assert.ok(text.includes('阶段='));
  assert.ok(text.includes('阿尔托莉雅'));
  assert.ok(!text.includes('{{上线阶段}}'));
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node tests/control-experience-stage.test.js`

Expected: FAIL with missing `controlExperienceConfig` or `controlExperienceStage`.

- [ ] **Step 4: Implement config defaults and normalization**

```js
window.GameModules.controlExperienceConfig = {
  defaultConfig() {
    return { enabled: true, masterPrompt: DEFAULT_MASTER_PROMPT };
  },
  normalize(raw = {}) {
    const base = this.defaultConfig();
    return {
      enabled: raw.enabled !== false,
      masterPrompt: String(raw.masterPrompt || base.masterPrompt).trim() || base.masterPrompt,
    };
  },
  previewCases() {
    return [
      { label: '首次 + 极低适应', onlineCount: 0, adaptation: 6 },
      { label: '重复早期 + 极低适应', onlineCount: 4, adaptation: 8 },
      { label: '熟悉中段 + 中适应', onlineCount: 18, adaptation: 52 },
      { label: '高频 + 高适应', onlineCount: 46, adaptation: 82 },
    ];
  },
};
```

- [ ] **Step 5: Implement stage resolver and renderer**

```js
window.GameModules.controlExperienceStage = {
  clampAdaptation(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  },
  normalizeOnlineCount(value) {
    return Math.max(0, Math.round(Number(value) || 0));
  },
  resolveStageMeta(experience = {}) {
    const onlineCount = this.normalizeOnlineCount(experience.onlineCount);
    const adaptation = this.clampAdaptation(experience.adaptation);
    const countTier = onlineCount === 0 ? 'first' : onlineCount <= 10 ? 'earlyRepeat' : onlineCount <= 30 ? 'familiar' : 'seasoned';
    const adaptationTier = adaptation <= 10 ? 'veryLow' : adaptation <= 35 ? 'low' : adaptation <= 65 ? 'medium' : 'high';
    return {
      onlineCount,
      adaptation,
      countTier,
      adaptationTier,
      stageKey: `${countTier}.${adaptationTier}`,
      stageLabel: this.stageLabel(countTier, adaptationTier),
      stageDescription: this.stageDescription(countTier, adaptationTier),
    };
  },
};
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node tests/control-experience-stage.test.js`

Expected: PASS with no assertion failures.

- [ ] **Step 7: Commit**

```bash
git add publish/control-experience-config.js publish/control-experience-stage.js tests/control-experience-stage.test.js
git commit -m "feat: add control experience stage foundation"
```

### Task 2: Wire boot, store state, and persistence

**Files:**
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/boot/scripts.json`
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/boot/script-manifest.js`
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/game.js`
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/storage.js`

- [ ] **Step 1: Add a boot-order assertion test**

```js
test('boot list includes control experience modules before app actions depend on them', () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, 'publish/boot/scripts.json'), 'utf8'));
  assert.ok(scripts.includes('control-experience-config.js'));
  assert.ok(scripts.includes('control-experience-stage.js'));
  assert.ok(scripts.includes('control-experience-config-app.js'));
});
```

- [ ] **Step 2: Run the new test and confirm it fails**

Run: `node tests/control-experience-stage.test.js`

Expected: FAIL because the boot entries do not exist yet.

- [ ] **Step 3: Register the new modules in both boot files**

```js
// publish/boot/scripts.json and publish/boot/script-manifest.js
"control-experience-config.js",
"control-experience-stage.js",
"control-experience-config-app.js",
```

Place them after `character-feedback.js`-adjacent runtime helpers and before desktop/action code so all consumers can access them.

- [ ] **Step 4: Add store state in `publish/game.js`**

```js
controlExperienceConfigState: gm.controlExperienceConfigApp?.defaultState?.()
  || {
    open: false,
    enabled: true,
    masterPrompt: gm.controlExperienceConfig?.defaultConfig?.().masterPrompt || '',
    previewItems: [],
    message: '',
    error: '',
  },
```

- [ ] **Step 5: Persist and restore normalized config**

```js
// snapshot()
controlExperienceConfig: store.controlExperienceConfigState ? {
  enabled: store.controlExperienceConfigState.enabled !== false,
  masterPrompt: String(store.controlExperienceConfigState.masterPrompt || ''),
} : undefined,

// restore()
if (store.controlExperienceConfigState) {
  const restored = window.GameModules.controlExperienceConfig.normalize(save.controlExperienceConfig || {});
  store.controlExperienceConfigState = {
    ...store.controlExperienceConfigState,
    ...restored,
    open: false,
    message: '',
    error: '',
  };
}
```

- [ ] **Step 6: Run the stage test again**

Run: `node tests/control-experience-stage.test.js`

Expected: PASS, with no boot-list assertion failure.

- [ ] **Step 7: Commit**

```bash
git add publish/boot/scripts.json publish/boot/script-manifest.js publish/game.js publish/storage.js tests/control-experience-stage.test.js
git commit -m "feat: persist control experience prompt config"
```

### Task 3: Inject stage rules into immediate character feedback

**Files:**
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/character-feedback.js`
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/prompts/character-feedback.md`
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/prompts/character-feedback.js`

- [ ] **Step 1: Extend the prompt test first**

```js
test('character feedback prompt includes injected control experience rule block', async () => {
  const context = createContextForPrompt();
  loadScript(context, 'publish/control-experience-config.js');
  loadScript(context, 'publish/control-experience-stage.js');
  loadScript(context, 'publish/character-feedback.js');
  context.window.GameModules.renderPrompt = async (_id, vars) => JSON.stringify(vars);
  const text = await context.window.GameModules.characterFeedback.prompt(mockStore());
  const vars = JSON.parse(text);

  assert.ok(vars['上线体验规则块']);
  assert.ok(vars['上线体验规则块'].includes('阶段说明'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/control-experience-stage.test.js`

Expected: FAIL because `上线体验规则块` is not passed yet.

- [ ] **Step 3: Add a dedicated placeholder section to the prompt source**

```md
## 上线体验规则块

{{上线体验规则块}}
```

Place it immediately after the existing “已有上线体验” line and before “处境”.

- [ ] **Step 4: Keep the inline runtime prompt synchronized**

Update `publish/prompts/character-feedback.js` to include the same section and placeholder text as the markdown source.

- [ ] **Step 5: Inject the rendered block from `character-feedback.js`**

```js
const ruleBlock = window.GameModules.controlExperienceStage.renderPromptBlock({
  config: window.GameModules.controlExperienceConfig.normalize(store.controlExperienceConfigState || {}),
  experience,
  targetName: base.name || '角色',
  personality: card.personality || base.personality || '',
  identity: card.role || base.role || '',
  scene: store.entryCurrentAction || store.sceneTitle || '',
});

return window.GameModules.renderPrompt('character-feedback', {
  // existing vars...
  上线体验规则块: ruleBlock,
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node tests/control-experience-stage.test.js`

Expected: PASS and prompt vars now include the new rule block.

- [ ] **Step 7: Commit**

```bash
git add publish/character-feedback.js publish/prompts/character-feedback.md publish/prompts/character-feedback.js tests/control-experience-stage.test.js
git commit -m "feat: inject control experience stage into character feedback"
```

### Task 4: Add the desktop “上线体验配置” app

**Files:**
- Create: `C:/Users/liuqi/Documents/TestDev/publish/control-experience-config-app.js`
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/app-switch-actions.js`
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/index.html`
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/settings-app.css`
- Create: `C:/Users/liuqi/Documents/TestDev/tests/control-experience-config-app.test.js`

- [ ] **Step 1: Write the app-action test**

```js
test('config app open/reset/save keeps one master prompt only', () => {
  const store = createStore();
  const app = context.window.GameModules.controlExperienceConfigApp;

  app.openControlExperienceConfigApp.call(store);
  assert.strictEqual(store.controlExperienceConfigState.open, true);

  store.controlExperienceConfigState.masterPrompt = '自定义';
  app.resetControlExperiencePrompt.call(store);
  assert.ok(store.controlExperienceConfigState.masterPrompt.includes('你正在生成${被控制者}'));
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `node tests/control-experience-config-app.test.js`

Expected: FAIL because the app module does not exist yet.

- [ ] **Step 3: Implement the app actions**

```js
window.GameModules.controlExperienceConfigApp = {
  defaultState() {
    const config = window.GameModules.controlExperienceConfig.defaultConfig();
    return { open: false, enabled: config.enabled, masterPrompt: config.masterPrompt, previewItems: [], message: '', error: '' };
  },
  openControlExperienceConfigApp() {
    this.closeDesktopApps?.();
    this.controlExperienceConfigState = {
      ...this.controlExperienceConfigState,
      ...window.GameModules.controlExperienceConfig.normalize(this.controlExperienceConfigState),
      previewItems: this.controlExperiencePreviewItems?.() || [],
      open: true,
      message: '',
      error: '',
    };
    this.desktopUnlocked = true;
  },
};
```

- [ ] **Step 4: Close the new app in shared desktop helpers**

```js
if (this.controlExperienceConfigState) {
  Object.assign(this.controlExperienceConfigState, { open: false, message: '', error: '' });
}
```

- [ ] **Step 5: Add the icon and app window in `publish/index.html`**

Add one desktop icon button:

```html
<button class="desktop-app-icon control-experience-config-icon" type="button" @click="$store.game.openControlExperienceConfigApp()" aria-label="打开上线体验配置">
  <span class="app-glyph-emoji" aria-hidden="true">🧠</span>
  <b>上线体验</b>
</button>
```

Add one app window with:
- `enabled` checkbox
- `masterPrompt` textarea
- read-only preview cards for 4 canonical cases
- `保存配置`
- `恢复默认`
- `返回桌面`

- [ ] **Step 6: Style the new app using the existing settings surface**

Add only minimal CSS extensions:

```css
.control-experience-config-icon .app-glyph {
  background: linear-gradient(135deg, #ff8f5a, #ffcf66 58%, #7ce8c8);
}

.control-experience-preview-grid {
  display: grid;
  gap: 10px;
}
```

- [ ] **Step 7: Run the app-action test**

Run: `node tests/control-experience-config-app.test.js`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add publish/control-experience-config-app.js publish/app-switch-actions.js publish/index.html publish/settings-app.css tests/control-experience-config-app.test.js
git commit -m "feat: add control experience config desktop app"
```

### Task 5: Inject the same stage rules into live story continuity without contaminating Stage1

**Files:**
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/story-agent-context.js`
- Modify: `C:/Users/liuqi/Documents/TestDev/tests/story-agent-guided.test.js`

- [ ] **Step 1: Add the failing continuity test**

```js
test('story base snapshot includes control experience rule block but stage1 routing context stays retrieval-only', () => {
  const context = createContext();
  loadScript(context, 'publish/control-experience-config.js');
  loadScript(context, 'publish/control-experience-stage.js');
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');

  const store = mockStoryStore();
  const base = context.window.GameModules.storyAgentContext.baseSnapshot(store, '继续观察');
  const stage1 = context.window.GameModules.storyAgentContext.buildStage1RoutingContext({ store, action: '继续观察', loaded: [] });

  assert.ok(base.includes('上线体验阶段'));
  assert.ok(base.includes('阶段说明'));
  assert.ok(!stage1.includes('上线体验阶段'));
  assert.ok(!stage1.includes('阶段说明'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/story-agent-guided.test.js`

Expected: FAIL because `baseSnapshot()` does not include the new rule block yet.

- [ ] **Step 3: Inject the rule block only into `baseSnapshot()`**

```js
const controlExperienceRules = window.GameModules.controlExperienceStage.renderPromptBlock({
  config: window.GameModules.controlExperienceConfig.normalize(store.controlExperienceConfigState || {}),
  experience: exp,
  targetName: c.name || '角色',
  personality: c.personality || '',
  identity: c.role || '',
  scene: store.sceneTitle || store.entryCurrentAction || '',
});

return [
  // existing lines...
  `上线体验阶段：\n${controlExperienceRules}`,
  // existing lines...
].join('\n');
```

- [ ] **Step 4: Leave Stage1 helpers untouched except for test coverage**

No new control-experience reaction generation code goes into:
- `buildStage1RoutingContext`
- `stage1-guided-query.md`
- Stage1 request parsing helpers

This is intentional and required.

- [ ] **Step 5: Run the continuity test**

Run: `node tests/story-agent-guided.test.js`

Expected: PASS with `baseSnapshot()` carrying the rule block and Stage1 staying clean.

- [ ] **Step 6: Commit**

```bash
git add publish/story-agent-context.js tests/story-agent-guided.test.js
git commit -m "feat: reuse control experience stage in story continuity"
```

### Task 6: Verify end-to-end behavior

**Files:**
- Modify only if verification reveals issues

- [ ] **Step 1: Run focused automated tests**

Run:

```bash
node tests/control-experience-stage.test.js
node tests/control-experience-config-app.test.js
node tests/story-agent-guided.test.js
```

Expected: All PASS.

- [ ] **Step 2: Launch or refresh the local app**

Run:

```bash
python -m http.server 8000
```

Expected: static app available at `http://127.0.0.1:8000/index.html`.

- [ ] **Step 3: Verify the desktop app UI manually**

Manual checks:
- Desktop shows a new `上线体验` icon.
- Opening the app shows exactly one editable master prompt textarea.
- Toggling `enabled` off causes rendered rule blocks to return empty text.
- `恢复默认` restores the canonical prompt text above.

- [ ] **Step 4: Verify immediate feedback injection**

Manual checks:
- Pick a role with `control_experience.onlineCount = 0` and low `adaptation`.
- Trigger first `confirmControl()`.
- Inspect runtime prompt or debug output and confirm it contains `阶段说明`.
- Confirm the prompt text does not contain fixed words like `恐惧` or `顺从` unless the role/personality/context itself introduces them.

- [ ] **Step 5: Verify repeated-experience continuity**

Manual checks:
- Repeat enough times to get `onlineCount > 0`.
- Confirm the next generated rule block references repeated experience semantics rather than first-time semantics.
- Continue one more narration turn and confirm the continuity text still has the same stage framing through the live story pipeline.

- [ ] **Step 6: Verify Stage1 separation**

Manual checks:
- Trigger a Stage1-heavy turn with missing lore/material context.
- Confirm Stage1 output remains material requests / routing / collection behavior only.
- Confirm the actual reaction tone still comes later from the immediate feedback or narration generation step, not from Stage1.

- [ ] **Step 7: Commit any final fixes**

```bash
git add publish/control-experience-config.js publish/control-experience-stage.js publish/control-experience-config-app.js publish/boot/scripts.json publish/boot/script-manifest.js publish/game.js publish/storage.js publish/app-switch-actions.js publish/character-feedback.js publish/prompts/character-feedback.md publish/prompts/character-feedback.js publish/story-agent-context.js publish/index.html publish/settings-app.css tests/control-experience-stage.test.js tests/control-experience-config-app.test.js tests/story-agent-guided.test.js
git commit -m "feat: add configurable control experience stage injection"
```

## Implementation Notes

- Keep thresholds fixed in code for now:
  - `onlineCount`: `0`, `1-10`, `11-30`, `31+`
  - `adaptation`: `0-10`, `11-35`, `36-65`, `66-100`
- Preserve one and only one editable prompt field.
- Do not add per-stage editable prompts.
- Do not steer emotion inside stage text. The stage layer defines structure of experience, not emotional outcome.
- Prefer interpolating both `{{变量}}` and `${变量}` safely if the current prompt/template code already mixes conventions in nearby modules.
- Keep unrelated local modifications in `publish/index.html` and `publish/rpg-field-ui.js` intact.

## Self-Review

### Spec Coverage

- One editable master prompt: covered by Task 4.
- Fixed stage thresholds in code: covered by Task 1.
- Immediate reaction injection: covered by Task 3.
- Follow-up continuity injection: covered by Task 5.
- Stage1 remains collection-only: covered by Task 5 and Task 6.
- Neutral, non-emotion-hardcoded rule writing: covered by the canonical prompt text and Task 1 tests.

### Placeholder Scan

- No unfinished placeholder markers remain.
- Every new file path is explicit.
- Every verification command is explicit.

### Type and Naming Consistency

- Config module name: `controlExperienceConfig`
- Stage module name: `controlExperienceStage`
- App module name: `controlExperienceConfigApp`
- Store state name: `controlExperienceConfigState`
- Prompt variable name: `上线体验规则块`
