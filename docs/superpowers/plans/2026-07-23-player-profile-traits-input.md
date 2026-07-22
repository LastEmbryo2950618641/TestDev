# Player Profile Traits Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在手机激活表单新增外貌、喜好、性格输入，并确保新账号与已有账号最终都把用户填写值保存到正式玩家角色卡。

**Architecture:** 表单通过一个统一动作更新 `playerProfile`；已有账号模式下，该动作额外更新当前选中的预定义玩家卡。资料标准化和新账号角色卡构造显式传递三个字段，已有账号通过 `playerProfileFromCard()` 完成选卡回显并由原有预定义卡保存流程固化。

**Tech Stack:** 原生 JavaScript、Alpine.js 模板、Node.js `node:test`

---

### Task 1: 锁定资料字段的数据流

**Files:**
- Modify: `tests/predefined-role-card-selection.test.js`
- Modify: `publish/predefined-role-cards.js`
- Modify: `publish/role-card-editor.js`
- Modify: `publish/player-setup-actions.js`

- [ ] **Step 1: Write the failing tests**

新增模块加载辅助函数，并添加断言：

```js
test('player profile from predefined card copies editable traits', () => {
  const profile = modules.predefinedRoleCards.playerProfileFromCard({
    id: 'player', appearance: '短发', preferences: '喜欢阅读', personality: '沉稳',
  }, {});
  assert.strictEqual(profile.appearance, '短发');
  assert.strictEqual(profile.preferences, '喜欢阅读');
  assert.strictEqual(profile.personality, '沉稳');
});

test('profile trait input updates profile and selected predefined card', () => {
  store.setPlayerProfileTrait('appearance', '戴眼镜');
  assert.strictEqual(store.playerProfile.appearance, '戴眼镜');
  assert.strictEqual(card.appearance, '戴眼镜');
});

test('new profile normalization preserves user traits', () => {
  const base = store.normalizePlayerSetupBase('刘悠', '1998-11-19');
  const enriched = store.normalizeEnrichedPlayerProfile(base, { personality: 'AI改写值' });
  assert.strictEqual(enriched.appearance, '用户外貌');
  assert.strictEqual(enriched.preferences, '用户喜好');
  assert.strictEqual(enriched.personality, '用户性格');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/predefined-role-card-selection.test.js`

Expected: FAIL，指出三个字段尚未复制、统一更新动作不存在，或标准化没有显式保留字段。

- [ ] **Step 3: Implement the minimal data flow**

在 `playerProfileFromCard()` 返回值中加入：

```js
appearance: profile.appearance ?? '',
preferences: profile.preferences ?? '',
personality: profile.personality ?? '',
```

在角色卡编辑动作中加入白名单更新接口：

```js
actions.setPlayerProfileTrait = function setPlayerProfileTrait(key, value) {
  if (!['appearance', 'preferences', 'personality'].includes(key)) return;
  const clean = String(value ?? '').slice(0, 1000);
  this.playerProfile = { ...(this.playerProfile || {}), [key]: clean };
  if (!this.roleCardSetup?.usePredefinedPlayerCard) return;
  const card = this.selectedPlayerRoleCard?.();
  if (card) card[key] = clean;
};
```

在 `normalizePlayerSetupBase()` 中对三个字段执行 `trim().slice(0, 1000)`；`normalizeEnrichedPlayerProfile()` 保持展开后的 `base` 值，不读取 AI 返回的同名字段。

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/predefined-role-card-selection.test.js`

Expected: PASS。

### Task 2: 在激活表单增加三个输入框

**Files:**
- Modify: `tests/predefined-role-card-selection.test.js`
- Modify: `publish/index.html`

- [ ] **Step 1: Write the failing markup test**

```js
test('activation form exposes appearance preferences and personality inputs', () => {
  const html = fs.readFileSync('publish/index.html', 'utf8');
  for (const key of ['appearance', 'preferences', 'personality']) {
    assert.ok(html.includes(`setPlayerProfileTrait('${key}', $event.target.value)`));
    assert.ok(html.includes(`playerProfile.${key}`));
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/predefined-role-card-selection.test.js`

Expected: FAIL，因为基础资料区尚无三个输入框。

- [ ] **Step 3: Add the three textareas**

在 `phone-setup-grid` 中加入三项，使用明确的值和输入事件绑定：

```html
<label class="phone-setup-wide dev-section" data-section-title="外貌输入">
  <span>外貌</span>
  <textarea :value="$store.game.playerProfile.appearance || ''" @input="$store.game.setPlayerProfileTrait('appearance', $event.target.value)"></textarea>
</label>
```

“喜好”和“性格”使用相同结构及各自字段。三项在新账号资料区直接显示；已有账号沿用当前展开资料区的交互。

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/predefined-role-card-selection.test.js`

Expected: PASS。

### Task 3: 让新账号正式角色卡携带三个字段

**Files:**
- Modify: `tests/player-identity-actions.test.js`
- Modify: `publish/game.js`
- Modify: `publish/player-identity-actions.js`

- [ ] **Step 1: Write the failing role-card construction test**

```js
test('player character base keeps user supplied traits', () => {
  const card = store.playerCharacterBase();
  assert.strictEqual(card.appearance, '短发戴眼镜');
  assert.strictEqual(card.preferences, '喜欢阅读');
  assert.strictEqual(card.personality, '沉稳内敛');
});
```

同时增加静态断言，确保 `game.js` 的 `playerProfile` 初始结构包含三个空字段。

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/player-identity-actions.test.js`

Expected: FAIL，因为 `playerCharacterBase()` 尚未返回外貌和喜好，并把性格错误映射为备注。

- [ ] **Step 3: Pass traits into the formal player card source**

在 `game.js` 默认 `playerProfile` 中加入三个空字符串字段，并在 `playerCharacterBase()` 返回：

```js
appearance: p.appearance || '',
preferences: p.preferences || '',
personality: p.personality || '',
```

备注继续只参与 `detail`，不再充当 `personality`。

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/player-identity-actions.test.js tests/predefined-role-card-selection.test.js tests/role-card-json-app.test.js`

Expected: PASS。

### Task 4: 回归验证

**Files:**
- Verify only

- [ ] **Step 1: Check syntax and whitespace**

Run: `node --check publish/player-setup-actions.js; node --check publish/predefined-role-cards.js; node --check publish/role-card-editor.js; node --check publish/player-identity-actions.js; git diff --check`

Expected: 所有命令退出码为 0。

- [ ] **Step 2: Run the feature test set**

Run: `node --test tests/player-identity-actions.test.js tests/predefined-role-card-selection.test.js tests/role-card-json-app.test.js`

Expected: PASS，无失败测试。

- [ ] **Step 3: Inspect the final diff**

Run: `git diff -- publish/index.html publish/game.js publish/player-setup-actions.js publish/predefined-role-cards.js publish/role-card-editor.js publish/player-identity-actions.js tests/player-identity-actions.test.js tests/predefined-role-card-selection.test.js`

Expected: 仅包含三个字段的表单、同步、标准化、正式角色卡传递和对应测试；不包含无关重构。
