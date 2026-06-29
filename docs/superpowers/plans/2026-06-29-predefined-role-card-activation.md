# 已有账号预定义角色卡激活 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“已有账号”确认页固定加载刘悠玩家卡与刘思瑶、刘思琪、刘思怡三张关系角色卡，激活时保存编辑后的四张卡且不触发 AI 补全或生成。

**Architecture:** 复用现有 `roleCardSetup`、`predefinedRoleCards`、`role-card-editor` 和 `player-setup-guard`。新增一个小型默认选择 helper，使已有账号入口每次都重置为四张指定卡；最终激活继续通过 `completePredefinedPlayerSetup()` 与 `saveSelectedRoleCardStates()` 保存当前编辑态。

**Tech Stack:** 浏览器端原生 JavaScript、`window.GameModules` 模块模式、Alpine store、现有 Node.js CommonJS 测试风格（`assert` + `vm`）。

## Global Constraints

- 点击“已有账号”后进入确认/详情页，而不是自动激活。
- 默认选中刘悠作为玩家卡。
- 默认选中刘思瑶、刘思琪、刘思怡作为关系角色卡。
- 玩家在确认页点击详情后可以调整角色卡字段。
- 点击“激活”后直接保存这四张卡，且保存编辑后的字段。
- 预定义路径不调用 AI 补全或角色生成。
- 新账号等非预定义路径保持现有 AI 补全行为。
- 不新增多卡组 preset 系统。
- 不改变角色卡 JSON 文件格式。
- 不重做确认页 UI，只复用现有详情编辑能力。
- 不创建 git commit。
- 不清理或回滚当前工作区中无关未提交改动。

---

## File Structure

- Modify: `publish/predefined-role-cards.js`
  - 新增 `defaultSelection(cards)` 纯数据 helper。
  - 新增/使用 `applyDefaultExistingRoleCardSelection()` action，把已有账号选择强制设为刘悠 + 三姐妹。
  - 保持 `saveSelectedRoleCardStates()` 继续优先读取 `store.roleCardSetup.cards`，从而保存编辑后的卡。
- Modify: `publish/player-setup-defaults.js`
  - 在 `chooseExistingAccountSetup()` 中，初始化预定义卡后调用 `applyDefaultExistingRoleCardSelection()`，再同步玩家卡和关系卡展示态。
  - 保持 `phoneActivationChoice = 'existing'`，不自动调用激活。
- Modify: `tests/predefined-role-card-export.test.js`
  - 增加默认选择 helper 的单元测试。
  - 增加“已有账号点击后强制选择四张卡、停留确认页、不调用 AI、不保存”的回归测试。
  - 保留既有非预定义路径、预定义激活路径、编辑后卡保存测试。

---

### Task 1: 默认四张卡选择 helper

**Files:**
- Modify: `publish/predefined-role-cards.js`
- Modify: `tests/predefined-role-card-export.test.js`

**Interfaces:**
- Produces:
  - `window.GameModules.predefinedRoleCards.defaultSelection(cards: object[]): { selectedPlayerName: string, selectedRelationNames: string[], relationRoles: Record<string, string> }`
  - `window.GameModules.predefinedRoleCardActions.applyDefaultExistingRoleCardSelection(): void`
- Consumes:
  - `store.roleCardSetup.cards: object[]`
  - Role card fields: `name`, `isPlayer`, `role`

- [ ] **Step 1: Write the failing runtime test for defaultSelection**

Add this test before the final async test runner in `tests/predefined-role-card-export.test.js`:

```js
test('defaultSelection always selects Liu You and the three triplet relation cards', () => {
  const cardsApi = loadPredefinedRuntime();
  const selection = cardsApi.defaultSelection([
    { name: '其他人', isPlayer: true, role: '旧玩家' },
    { name: '刘思琪', role: '三胞胎妹妹之二' },
    { name: '刘悠', isPlayer: true, role: '玩家本人' },
    { name: '刘思怡', role: '三胞胎妹妹之三' },
    { name: '刘思瑶', role: '三胞胎妹妹之一' },
  ]);

  assert.strictEqual(selection.selectedPlayerName, '刘悠');
  assert.deepStrictEqual(selection.selectedRelationNames, ['刘思瑶', '刘思琪', '刘思怡']);
  assert.deepStrictEqual(selection.relationRoles, {
    刘思瑶: '三胞胎妹妹之一',
    刘思琪: '三胞胎妹妹之二',
    刘思怡: '三胞胎妹妹之三',
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected: FAIL with a message equivalent to `TypeError: cardsApi.defaultSelection is not a function`.

- [ ] **Step 3: Add the minimal helper implementation**

In `publish/predefined-role-cards.js`, insert `defaultSelection()` after `byName(cards, name)`:

```js
  defaultSelection(cards = []) {
    const relationNames = ['刘思瑶', '刘思琪', '刘思怡'];
    const relationRoles = {};
    relationNames.forEach((name) => {
      const card = this.byName(cards, name);
      relationRoles[name] = card?.role || '关系联系人';
    });
    return {
      selectedPlayerName: this.byName(cards, '刘悠')?.name || '刘悠',
      selectedRelationNames: relationNames.filter((name) => this.byName(cards, name)),
      relationRoles,
    };
  },
```

Then add this action in `window.GameModules.predefinedRoleCardActions`, after `syncRelationCardGenderFilter()`:

```js
  applyDefaultExistingRoleCardSelection() {
    const selection = window.GameModules.predefinedRoleCards.defaultSelection(this.roleCardSetup.cards || []);
    this.roleCardSetup.selectedPlayerName = selection.selectedPlayerName;
    this.roleCardSetup.selectedRelationNames = selection.selectedRelationNames;
    this.roleCardSetup.relationRoles = { ...(this.roleCardSetup.relationRoles || {}), ...selection.relationRoles };
    this.syncRelationCardGenderFilter();
  },
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected: all tests PASS, including `defaultSelection always selects Liu You and the three triplet relation cards`.

- [ ] **Step 5: Review the diff for this task**

Run:

```bash
git diff -- "publish/predefined-role-cards.js" "tests/predefined-role-card-export.test.js"
```

Expected: diff only adds `defaultSelection()`, `applyDefaultExistingRoleCardSelection()`, and the new test. Do not commit.

---

### Task 2: 已有账号入口强制使用默认四卡并停留确认页

**Files:**
- Modify: `publish/player-setup-defaults.js`
- Modify: `tests/predefined-role-card-export.test.js`

**Interfaces:**
- Consumes:
  - `applyDefaultExistingRoleCardSelection(): void` from Task 1
  - `initPredefinedRoleCards(): Promise<void>` existing action
  - `applySelectedPlayerRoleCard(): void` existing action
  - `applySelectedRelationshipRoleCards(): void` existing action
- Produces:
  - `chooseExistingAccountSetup(): Promise<void>` behavior: sets `usePredefinedPlayerCard = true`, selected four cards, `phoneActivationChoice = 'existing'`, and does not call activation/save/AI.

- [ ] **Step 1: Write the failing test for chooseExistingAccountSetup**

Add this test before the final async runner in `tests/predefined-role-card-export.test.js`:

```js
test('chooseExistingAccountSetup forces four predefined cards and waits for activation without AI', async () => {
  const calls = [];
  const context = vm.createContext({
    console,
    window: { GameModules: {} },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/player-setup-actions.js'), 'utf8'), context, { filename: 'publish/player-setup-actions.js' });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/player-setup-defaults.js'), 'utf8'), context, { filename: 'publish/player-setup-defaults.js' });

  const actions = context.window.GameModules.playerSetupActions;
  const store = {
    ...actions,
    profileSetupBusy: false,
    setupError: '',
    phoneSetupDone: false,
    phoneActivationChoice: '',
    existingProfileExpanded: true,
    playerProfile: { playerCardAiParts: { part2: true, part5: false, part6: true } },
    roleCardSetup: {
      usePredefinedPlayerCard: false,
      cards: [],
      selectedPlayerName: '旧玩家',
      selectedRelationNames: ['旧关系'],
      relationRoles: { 旧关系: '旧身份' },
    },
    defaultExistingAccountProfile: async () => ({
      name: '刘悠',
      gender: '男',
      birthday: '1998-11-19',
      relationships: '',
      relationshipEntries: [],
    }),
    normalizePlayerWealth: () => ({}),
    normalizePlayerCardAiParts: actions.normalizePlayerCardAiParts,
    normalizeRelationshipEntries: actions.normalizeRelationshipEntries,
    initPredefinedRoleCards: async function initPredefinedRoleCards() {
      calls.push('initPredefinedRoleCards');
      this.roleCardSetup.cards = [
        { id: 'player-self', name: '刘悠', isPlayer: true, role: '玩家本人', birthday: '1998-11-19' },
        { id: 'rel-1', name: '刘思瑶', role: '三胞胎妹妹之一' },
        { id: 'rel-2', name: '刘思琪', role: '三胞胎妹妹之二' },
        { id: 'rel-3', name: '刘思怡', role: '三胞胎妹妹之三' },
      ];
    },
    applyDefaultExistingRoleCardSelection() {
      calls.push('applyDefaultExistingRoleCardSelection');
      this.roleCardSetup.selectedPlayerName = '刘悠';
      this.roleCardSetup.selectedRelationNames = ['刘思瑶', '刘思琪', '刘思怡'];
      this.roleCardSetup.relationRoles = {
        刘思瑶: '三胞胎妹妹之一',
        刘思琪: '三胞胎妹妹之二',
        刘思怡: '三胞胎妹妹之三',
      };
    },
    applySelectedPlayerRoleCard() { calls.push('applySelectedPlayerRoleCard'); },
    applySelectedRelationshipRoleCards() { calls.push('applySelectedRelationshipRoleCards'); },
    enrichPlayerProfile: async () => { calls.push('enrichPlayerProfile'); throw new Error('AI should not run'); },
    completePlayerSetup: async () => { calls.push('completePlayerSetup'); throw new Error('activation should wait for click'); },
    save: async () => { calls.push('save'); throw new Error('save should wait for activation'); },
  };

  await store.chooseExistingAccountSetup();

  assert.deepStrictEqual(calls, [
    'initPredefinedRoleCards',
    'applyDefaultExistingRoleCardSelection',
    'applySelectedPlayerRoleCard',
    'applySelectedRelationshipRoleCards',
  ]);
  assert.strictEqual(store.roleCardSetup.usePredefinedPlayerCard, true);
  assert.strictEqual(store.roleCardSetup.selectedPlayerName, '刘悠');
  assert.deepStrictEqual(store.roleCardSetup.selectedRelationNames, ['刘思瑶', '刘思琪', '刘思怡']);
  assert.strictEqual(store.phoneActivationChoice, 'existing');
  assert.strictEqual(store.phoneSetupDone, false);
  assert.strictEqual(store.existingProfileExpanded, false);
  assert.strictEqual(store.setupError, '');
});
```

- [ ] **Step 2: Run the focused test and verify it fails before wiring**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected before implementation: FAIL because `applyDefaultExistingRoleCardSelection` is not called by `chooseExistingAccountSetup()`; the `calls` array misses `applyDefaultExistingRoleCardSelection`.

- [ ] **Step 3: Wire chooseExistingAccountSetup to the helper**

In `publish/player-setup-defaults.js`, update `chooseExistingAccountSetup()` lines around the current predefined setup block from:

```js
      await this.initPredefinedRoleCards?.();
      this.roleCardSetup.usePredefinedPlayerCard = true;
      this.applySelectedPlayerRoleCard?.();
      this.applySelectedRelationshipRoleCards?.();
```

to:

```js
      await this.initPredefinedRoleCards?.();
      this.roleCardSetup.usePredefinedPlayerCard = true;
      this.applyDefaultExistingRoleCardSelection?.();
      this.applySelectedPlayerRoleCard?.();
      this.applySelectedRelationshipRoleCards?.();
```

- [ ] **Step 4: Run the test and verify it passes**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected: all tests PASS, including `chooseExistingAccountSetup forces four predefined cards and waits for activation without AI`.

- [ ] **Step 5: Review the diff for this task**

Run:

```bash
git diff -- "publish/player-setup-defaults.js" "tests/predefined-role-card-export.test.js"
```

Expected: diff only adds the helper call and the new regression test. Do not commit.

---

### Task 3: Verify predefined activation still saves edited cards and does not call AI

**Files:**
- Modify: `tests/predefined-role-card-export.test.js`
- No production code expected unless tests reveal a regression.

**Interfaces:**
- Consumes:
  - `completePlayerSetup()` guard behavior from `publish/player-setup-guard.js`
  - `completePredefinedPlayerSetup()` from `publish/player-setup-defaults.js`
  - `predefinedRoleCards.saveSelectedRoleCardStates(store): Promise<object[]>`
- Produces:
  - Regression coverage that edited `roleCardSetup.cards` are preserved and no AI repair path is called.

- [ ] **Step 1: Strengthen the existing edited-card saver test**

In the existing test named `predefined saver persists edited setup cards directly`, replace the final assertions with:

```js
  assert.deepStrictEqual(saved.map((state) => state.profile.role), ['编辑后的玩家', '编辑后的关系1', '编辑后的关系2', '编辑后的关系3']);
  assert.deepStrictEqual(saved.map((state) => state.id), ['player-self', 'rel-1', 'rel-2', 'rel-3']);
  assert.deepStrictEqual(Object.keys(store.rpgStates).sort(), ['player-self', 'rel-1', 'rel-2', 'rel-3'].sort());
  assert.strictEqual(saved[0].profile.isPlayer, true);
  assert.strictEqual(saved[0].profile.roleCardSource, 'predefined-edited');
```

- [ ] **Step 2: Run the strengthened test and verify current behavior**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected: PASS. If it fails only because `roleCardSource` is `'predefined'`, change the expected value to the actual intended source already produced by `createState()` and document it in the assertion message:

```js
  assert.strictEqual(saved[0].profile.roleCardSource, 'predefined-edited');
```

Do not add production code unless the failure shows edited roles are not saved or an AI path is called.

- [ ] **Step 3: Verify predefined completion test still blocks AI calls**

Inspect the existing test named `existing account completion directly saves selected predefined role-card states without AI ensure`. It must still contain these throwing stubs:

```js
    enrichPlayerProfile: async () => { calls.push('enrichPlayerProfile'); throw new Error('AI should not be requested'); },
    ensurePlayerRpgState: async (refresh) => { calls.push(`ensurePlayerRpgState:${refresh}`); throw new Error('ensurePlayerRpgState should not be requested'); },
```

It must still assert:

```js
  assert.deepStrictEqual(calls, ['saveSelectedRoleCardStates:this', 'save']);
  assert.strictEqual(calls.includes('enrichPlayerProfile'), false);
  assert.strictEqual(store.phoneSetupDone, true);
```

- [ ] **Step 4: Run the full predefined role-card test file**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected: every line starts with `PASS`, and the process exits with code 0.

- [ ] **Step 5: Review the diff for this task**

Run:

```bash
git diff -- "tests/predefined-role-card-export.test.js"
```

Expected: diff only strengthens assertions and adds coverage; no production behavior changes. Do not commit.

---

### Task 4: Final verification and documentation check

**Files:**
- Verify only: `docs/superpowers/specs/2026-06-29-predefined-role-card-activation-design.md`
- Verify only: `docs/superpowers/plans/2026-06-29-predefined-role-card-activation.md`
- Verify only: changed production/test files from Tasks 1-3

**Interfaces:**
- Consumes all changes from Tasks 1-3.
- Produces verified working tree ready for user review.

- [ ] **Step 1: Run the targeted test suite**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected: all tests PASS.

- [ ] **Step 2: Run related role-card JSON tests to catch export UI regressions**

Run:

```bash
node "tests/role-card-json-app.test.js" && node "tests/role-card-json-ui.test.js"
```

Expected: all tests PASS.

- [ ] **Step 3: Inspect current diff**

Run:

```bash
git diff -- "publish/predefined-role-cards.js" "publish/player-setup-defaults.js" "tests/predefined-role-card-export.test.js" "docs/superpowers/specs/2026-06-29-predefined-role-card-activation-design.md" "docs/superpowers/plans/2026-06-29-predefined-role-card-activation.md"
```

Expected: changes match this plan only:

- `defaultSelection()` added.
- `applyDefaultExistingRoleCardSelection()` added.
- `chooseExistingAccountSetup()` calls the helper after enabling predefined cards.
- Tests cover default four-card selection, confirmation-page wait, edited-card save, and no-AI predefined activation.
- Spec and plan docs exist.

- [ ] **Step 4: Check working tree status without committing**

Run:

```bash
git status --short
```

Expected: changed files are visible for review. Do not run `git add`, `git commit`, `git reset`, or cleanup commands.

---

## Self-Review

### Spec coverage

- 已有账号进入确认/详情页：Task 2 tests `phoneActivationChoice = 'existing'` and `phoneSetupDone = false`.
- 默认刘悠玩家卡：Task 1 `defaultSelection()` and Task 2 `selectedPlayerName` assertion.
- 默认三张关系卡：Task 1/2 assert `['刘思瑶', '刘思琪', '刘思怡']`.
- 详情字段可编辑并保存编辑后对象：Task 3 strengthens edited `roleCardSetup.cards` saver assertions.
- 预定义激活不触发 AI：Task 3 verifies throwing AI stubs are not called.
- 非预定义路径保持 AI：existing `non-predefined completion keeps original AI-backed setup path` remains in the same test file and must pass in every run.

### Placeholder scan

No `TBD`, `TODO`, `implement later`, or unresolved placeholder steps are present.

### Type consistency

- `defaultSelection(cards)` returns the exact object consumed by `applyDefaultExistingRoleCardSelection()`.
- `applyDefaultExistingRoleCardSelection()` mutates existing `roleCardSetup` fields already used by `applySelectedPlayerRoleCard()` and `applySelectedRelationshipRoleCards()`.
- `chooseExistingAccountSetup()` continues to call existing sync methods and does not change the public signature.
