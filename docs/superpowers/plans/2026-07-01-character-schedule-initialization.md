# 角色日程初始化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 进入游戏保存预设角色卡时，为玩家与关系角色建立非 AI 生成的初始日程表，初始地点直接来自角色 RPG state 的 `values.current_location`。

**Architecture:** 在 `predefined-role-cards.js` 的预设角色卡保存流程内追加轻量日程初始化 helper。日程表保存在 `store.characterSchedules`，以角色 id 为 key；只在没有日程或仍是默认初始化日程时写入，不覆盖后续结算/事件驱动更新。

**Tech Stack:** Browser runtime JavaScript (`window.GameModules`), Node VM tests (`node tests/predefined-role-card-export.test.js`), existing RPG state and predefined role card modules.

## Global Constraints

- 不使用 AI 生成初始日程；只从角色 state 的 `values.current_location`、角色名、角色身份和玩家当前时间/地点提取。
- 角色太多时不做全角色每轮结算；日程默认稳定，后续只由 Stage4 结算或大事件显式更新相关角色。
- 若已有日程来源不是默认初始化，禁止覆盖，避免破坏事件驱动移动结果。
- 不新增依赖，不引入异步外部查询。
- 不执行 git commit，除非主人明确要求。

---

## File Structure

- Modify: `publish/predefined-role-cards.js`
  - 增加 `scheduleLocationName(state)`、`scheduleAvailability(locationName)`、`buildInitialScheduleEntry(state, store)`、`ensureInitialScheduleForState(store, state)`、`ensureInitialSchedules(store, states)`。
  - 在 `saveSelectedRoleCardStates(store)` 保存玩家和关系卡后调用 `ensureInitialSchedules(store, states)`。
- Modify: `tests/predefined-role-card-export.test.js`
  - 增加预设角色卡保存后建立 `store.characterSchedules` 的回归测试。
  - 增加已有事件驱动日程不被初始化覆盖的回归测试。

---

### Task 1: 初始化角色日程表

**Files:**
- Modify: `publish/predefined-role-cards.js:91-98`
- Test: `tests/predefined-role-card-export.test.js`

**Interfaces:**
- Consumes: `state.values.current_location`, `store.realWorldLocationName`, `store.phoneDateText?.()`, `store.phoneTimeText?.()`。
- Produces: `store.characterSchedules[id]` entries:
  ```js
  {
    characterId: string,
    characterName: string,
    currentLocation: string,
    currentAction: string,
    availability: '在场' | '场外' | '未知',
    confidence: '确认' | '默认',
    source: '角色卡初始化',
    stability: '默认稳定',
    updatedAt: string,
    reason: string
  }
  ```

- [ ] **Step 1: Write failing test for schedule creation**

Append this test before the final async runner in `tests/predefined-role-card-export.test.js`:

```js
test('saveSelectedRoleCardStates initializes schedules from current_location', async () => {
  const saved = [];
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        predefinedRoleCardData: {
          'liu-you': { id: 'player-self', name: '刘悠', isPlayer: true, role: '玩家', work: '现实世界' },
          'liu-siyao': { id: 'rel-1', name: '刘思瑶', role: '三胞胎妹妹之一', work: '现实世界' },
          'liu-siqi': { id: 'rel-2', name: '刘思琪', role: '三胞胎妹妹之二', work: '现实世界' },
          'liu-siyi': { id: 'rel-3', name: '刘思怡', role: '三胞胎妹妹之三', work: '现实世界' },
        },
        sqliteSave: {
          db: true,
          getCharacterState: () => null,
          saveCharacterState: async (state) => { saved.push(JSON.parse(JSON.stringify(state))); },
        },
        characterProfile: { hasRequiredInitialMetrics: () => false },
        rpgState: {
          ensureSchema: async (worldTag) => ({ worldTag, sections: [] }),
          createCharacterState: (profile, schema) => ({
            id: profile.id,
            name: profile.name,
            worldTag: schema.worldTag,
            values: {
              current_location: {
                name: profile.name === '刘思琪' ? '刘思琪房间' : '锦苑小区3栋2单元601号',
                worldTag: schema.worldTag,
                updatedAt: '2026年7月1日 周三',
                reason: '创建角色卡时根据明确上下文登记。',
              },
            },
            metrics: {},
            profile,
          }),
          upgradeCharacterState: () => {},
        },
        rpgProfileMetrics: { rebase: () => {} },
        rpgLexicon: { syncState: async () => {} },
      },
    },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/predefined-role-cards.js'), 'utf8'), context, { filename: 'publish/predefined-role-cards.js' });

  const store = {
    roleCardSetup: {
      usePredefinedPlayerCard: true,
      selectedPlayerName: '刘悠',
      selectedRelationNames: ['刘思瑶', '刘思琪', '刘思怡'],
      cards: [
        { id: 'player-self', name: '刘悠', isPlayer: true, role: '玩家', work: '现实世界' },
        { id: 'rel-1', name: '刘思瑶', role: '三胞胎妹妹之一', work: '现实世界' },
        { id: 'rel-2', name: '刘思琪', role: '三胞胎妹妹之二', work: '现实世界' },
        { id: 'rel-3', name: '刘思怡', role: '三胞胎妹妹之三', work: '现实世界' },
      ],
    },
    rpgStates: {},
    realWorldLocationName: '锦苑小区3栋2单元601号',
    phoneDateText: () => '2026年7月1日 周三',
    phoneTimeText: () => '09:45',
  };

  await context.window.GameModules.predefinedRoleCards.saveSelectedRoleCardStates(store);

  assert.strictEqual(store.characterSchedules['player-self'].currentLocation, '锦苑小区3栋2单元601号');
  assert.strictEqual(store.characterSchedules['rel-1'].currentLocation, '锦苑小区3栋2单元601号');
  assert.strictEqual(store.characterSchedules['rel-2'].currentLocation, '刘思琪房间');
  assert.strictEqual(store.characterSchedules['rel-3'].currentAction, '按角色日常安排活动');
  assert.strictEqual(store.characterSchedules['rel-2'].source, '角色卡初始化');
  assert.strictEqual(store.characterSchedules['rel-2'].stability, '默认稳定');
  assert.strictEqual(store.characterSchedules['rel-2'].availability, '在场');
  assert.strictEqual(store.characterSchedules['rel-2'].updatedAt, '2026年7月1日 周三 09:45');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected: FAIL with a `TypeError` or assertion failure because `store.characterSchedules` is undefined.

- [ ] **Step 3: Implement minimal schedule helpers**

In `publish/predefined-role-cards.js`, insert these methods after `createState(...)` and before `ensurePlayerState(...)`:

```js
  scheduleLocationName(state = {}, store = {}) {
    const raw = state?.values?.current_location;
    const name = typeof raw === 'string' ? raw : raw?.name;
    const clean = String(name || '').trim();
    if (clean && !/^当前位置未知|未知地点|现实地点|当前位置$/u.test(clean)) return clean;
    return String(store?.realWorldLocationName || store?.realWorldMap?.current || '当前位置未知').trim() || '当前位置未知';
  },

  scheduleAvailability(locationName = '') {
    return /^当前位置未知|未知地点|现实地点|当前位置$/u.test(String(locationName || '').trim()) ? '未知' : '在场';
  },

  scheduleUpdatedAt(store = {}) {
    return [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || new Date().toISOString();
  },

  defaultScheduleAction(state = {}) {
    return state?.id === 'player-self' ? '由玩家当前行动决定' : '按角色日常安排活动';
  },

  buildInitialScheduleEntry(state = {}, store = {}) {
    const location = this.scheduleLocationName(state, store);
    return {
      characterId: state.id || state.name || '',
      characterName: state.name || state.profile?.name || state.id || '',
      currentLocation: location,
      currentAction: this.defaultScheduleAction(state),
      availability: this.scheduleAvailability(location),
      confidence: this.scheduleAvailability(location) === '未知' ? '默认' : '确认',
      source: '角色卡初始化',
      stability: '默认稳定',
      updatedAt: this.scheduleUpdatedAt(store),
      reason: '进入游戏时根据角色卡当前所在位置建立默认日程；后续仅由结算或明确事件更新。',
    };
  },

  ensureInitialScheduleForState(store, state) {
    if (!store || !state?.id) return null;
    store.characterSchedules = store.characterSchedules && typeof store.characterSchedules === 'object' ? store.characterSchedules : {};
    const existing = store.characterSchedules[state.id];
    if (existing && existing.source !== '角色卡初始化') return existing;
    if (existing && existing.stability && existing.stability !== '默认稳定') return existing;
    const entry = this.buildInitialScheduleEntry(state, store);
    store.characterSchedules[state.id] = entry;
    return entry;
  },

  ensureInitialSchedules(store, states = []) {
    return (states || []).map((state) => this.ensureInitialScheduleForState(store, state)).filter(Boolean);
  },
```

Then replace `saveSelectedRoleCardStates(store)` with:

```js
  async saveSelectedRoleCardStates(store) {
    if (!store?.roleCardSetup?.usePredefinedPlayerCard) return [];
    const [player, relations] = await Promise.all([
      this.ensurePlayerState(store),
      this.saveSelectedRelationshipStates(store),
    ]);
    const states = [player, ...relations].filter(Boolean);
    this.ensureInitialSchedules(store, states);
    return states;
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected: all tests PASS.

- [ ] **Step 5: Do not commit unless explicitly requested**

Run:

```bash
git diff -- "publish/predefined-role-cards.js" "tests/predefined-role-card-export.test.js"
```

Expected: diff only contains schedule helper and tests. Do not run `git commit` unless主人明确要求。

---

### Task 2: 保护事件驱动日程不被初始化覆盖

**Files:**
- Modify: `tests/predefined-role-card-export.test.js`
- Modify: `publish/predefined-role-cards.js` only if Task 1 implementation does not already pass this test.

**Interfaces:**
- Consumes: existing `store.characterSchedules[id]`.
- Produces: no overwrite when existing schedule has `source !== '角色卡初始化'` or `stability !== '默认稳定'`.

- [ ] **Step 1: Write failing/passing protection test**

Append this test before the final async runner in `tests/predefined-role-card-export.test.js`:

```js
test('initial schedules do not overwrite event-driven schedules', async () => {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        predefinedRoleCardData: {
          'liu-you': { id: 'player-self', name: '刘悠', isPlayer: true, role: '玩家', work: '现实世界' },
          'liu-siyao': { id: 'rel-1', name: '刘思瑶', role: '三胞胎妹妹之一', work: '现实世界' },
          'liu-siqi': { id: 'rel-2', name: '刘思琪', role: '三胞胎妹妹之二', work: '现实世界' },
          'liu-siyi': { id: 'rel-3', name: '刘思怡', role: '三胞胎妹妹之三', work: '现实世界' },
        },
        sqliteSave: {
          db: true,
          getCharacterState: () => null,
          saveCharacterState: async () => {},
        },
        characterProfile: { hasRequiredInitialMetrics: () => false },
        rpgState: {
          ensureSchema: async (worldTag) => ({ worldTag, sections: [] }),
          createCharacterState: (profile, schema) => ({
            id: profile.id,
            name: profile.name,
            worldTag: schema.worldTag,
            values: { current_location: { name: '锦苑小区3栋2单元601号', worldTag: schema.worldTag } },
            metrics: {},
            profile,
          }),
          upgradeCharacterState: () => {},
        },
        rpgProfileMetrics: { rebase: () => {} },
        rpgLexicon: { syncState: async () => {} },
      },
    },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/predefined-role-cards.js'), 'utf8'), context, { filename: 'publish/predefined-role-cards.js' });

  const store = {
    roleCardSetup: {
      usePredefinedPlayerCard: true,
      selectedPlayerName: '刘悠',
      selectedRelationNames: ['刘思瑶', '刘思琪', '刘思怡'],
      cards: [
        { id: 'player-self', name: '刘悠', isPlayer: true, role: '玩家', work: '现实世界' },
        { id: 'rel-1', name: '刘思瑶', role: '三胞胎妹妹之一', work: '现实世界' },
        { id: 'rel-2', name: '刘思琪', role: '三胞胎妹妹之二', work: '现实世界' },
        { id: 'rel-3', name: '刘思怡', role: '三胞胎妹妹之三', work: '现实世界' },
      ],
    },
    rpgStates: {},
    characterSchedules: {
      'rel-2': {
        characterId: 'rel-2',
        characterName: '刘思琪',
        currentLocation: '学校医务室',
        currentAction: '处理大事件后的临时安排',
        availability: '场外',
        confidence: '确认',
        source: '结算事件',
        stability: '事件锁定',
        updatedAt: '2026年7月1日 周三 08:30',
        reason: '上一轮大事件移动。',
      },
    },
    realWorldLocationName: '锦苑小区3栋2单元601号',
    phoneDateText: () => '2026年7月1日 周三',
    phoneTimeText: () => '09:45',
  };

  await context.window.GameModules.predefinedRoleCards.saveSelectedRoleCardStates(store);

  assert.strictEqual(store.characterSchedules['rel-2'].currentLocation, '学校医务室');
  assert.strictEqual(store.characterSchedules['rel-2'].source, '结算事件');
  assert.strictEqual(store.characterSchedules['rel-1'].source, '角色卡初始化');
  assert.strictEqual(store.characterSchedules['rel-3'].source, '角色卡初始化');
});
```

- [ ] **Step 2: Run test**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected: PASS if Task 1 helper guarded existing schedules correctly; otherwise FAIL showing `rel-2` was overwritten.

- [ ] **Step 3: If failing, tighten guard**

Ensure `ensureInitialScheduleForState` in `publish/predefined-role-cards.js` contains exactly this guard before writing:

```js
    const existing = store.characterSchedules[state.id];
    if (existing && existing.source !== '角色卡初始化') return existing;
    if (existing && existing.stability && existing.stability !== '默认稳定') return existing;
```

- [ ] **Step 4: Run verification**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected: all tests PASS.

- [ ] **Step 5: Do not commit unless explicitly requested**

Run:

```bash
git diff --check -- "publish/predefined-role-cards.js" "tests/predefined-role-card-export.test.js"
```

Expected: no whitespace errors. Do not run `git commit` unless主人明确要求。

---

### Task 3: 验证对推演入口无回归

**Files:**
- Test only: `tests/predefined-role-card-export.test.js`
- Test only: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: Task 1/2 code.
- Produces: verified runtime behavior; no additional code unless tests expose regression.

- [ ] **Step 1: Run focused predefined-role-card tests**

Run:

```bash
node "tests/predefined-role-card-export.test.js"
```

Expected: every line begins with `PASS`, process exits 0.

- [ ] **Step 2: Run real-world loop tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: every line begins with `PASS`, process exits 0.

- [ ] **Step 3: Check formatting**

Run:

```bash
git diff --check -- "publish/predefined-role-cards.js" "tests/predefined-role-card-export.test.js"
```

Expected: no output and exit 0.

- [ ] **Step 4: Summarize without claiming unrelated fixes**

Report only:

```text
已完成：进入游戏保存预设角色卡后初始化 store.characterSchedules。
验证：predefined-role-card-export 与 real-world-loop-update 测试通过；git diff --check 通过。
未做：Stage1/Stage2 候选读取日程表、Stage4 结算更新日程表。
```

Do not run `git commit` unless主人明确要求。

---

## Self-Review

- Spec coverage: 计划覆盖“进入游戏时先对预设角色卡建立日程”、“根据角色卡当前地点提取”、“默认稳定，不每轮全角色结算”、“不覆盖后续事件移动”。
- Placeholder scan: 无 TBD/TODO/implement later；每个测试和实现步骤都给出具体代码。
- Type consistency: `store.characterSchedules`、`buildInitialScheduleEntry`、`ensureInitialScheduleForState`、`ensureInitialSchedules` 命名一致。
