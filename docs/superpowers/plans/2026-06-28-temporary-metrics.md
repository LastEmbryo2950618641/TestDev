# Temporary Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add temporary emotion/feeling values that reuse the existing `emotion` and `feeling` update skills, decay by 1 each real-world settlement, and preserve AI-provided change reasons.

**Architecture:** Keep the AI-facing contract unchanged: `updateType:"emotion"` writes `metrics.emotions.<key>` and `updateType:"feeling"` writes `metrics.playerFeelings.<key>`. Inside existing metric methods, fixed keys continue to update `emotions/playerFeelings`; unknown keys are treated as temporary keys and update `temporaryEmotions/temporaryPlayerFeelings`.

**Tech Stack:** Browser JavaScript modules under `publish/`; Node one-off regression checks using `node`; no new dependencies.

## Global Constraints

- Do not add AI-visible skills, update types, or JSON fields.
- Do not add new public metric APIs; implement by extending existing methods in-place.
- Temporary values use the same numeric range as fixed metrics: `0-100`.
- Temporary values decay by `1` per real-world settlement, minimum `0`, and are not deleted at `0`.
- Apply decay before applying the current AI metric updates.
- Prompt wording must say fixed keys are long-term/stable influence and temporary keys are short-term/non-long-term state.
- AI should be guided to prefer semantically close fixed keys for long-term impact, but not be forced to only output fixed keys.
- Change reasons must remain associated with the specific fixed or temporary metric that changed.
- Do not create a git commit unless the user explicitly requests it.

---

## File Structure

- Modify `publish/metrics.js`
  - Ensure temporary containers exist.
  - Let `applyGroup()` route unknown keys into the matching temporary container.
  - Decay existing temporary values inside `apply()` before current updates.
  - Keep `writeMetric()` as the single reason/status writer so reason association remains consistent.

- Modify `publish/ai.js`
  - Adjust `normalizeMetricGroup()` so unknown keys are preserved as `{ temporary: true }` instead of being dropped.
  - Keep fixed-key normalization for existing aliases like `害羞 -> 羞耻` and `依恋 -> 依赖`.
  - Remove temporary-like aliases such as `兴奋度 -> 高兴` so they can become temporary keys when AI chooses them.

- Modify `publish/actions.js`
  - Ensure `ensureStateMetrics()` initializes `temporaryEmotions` and `temporaryPlayerFeelings` for character/player states.

- Modify `publish/result-actions.js`
  - Load temporary containers into the active identity metrics UI state.

- Modify `publish/game.js`
  - Add temporary groups after fixed `情绪` and `感觉` in `metricGroups()` using the existing group rendering path.
  - Initialize store-level temporary containers.

- Modify `publish/real-world-settlement-actions.js`
  - Show settlement rows for temporary emotion/feeling updates using the existing `realWorldMetricSettlement()` method.

- Modify `publish/update/emotion-update-prompt.js`
  - Update skill prompt wording: fixed keys = stable/long-term influence, temporary keys = short-term state.

- Modify `publish/update/feeling-update-prompt.js`
  - Same wording pattern for feelings.

- Verify with Node one-off checks; no test framework currently exists in this repository.

---

### Task 1: Preserve Unknown Metric Keys as Temporary Items

**Files:**
- Modify: `publish/ai.js:97-123`

**Interfaces:**
- Consumes: `window.GameModules.ai.normalizeMetricGroup(value, keys, currentValues)`
- Produces: normalized metric items with shape `{ key: string, delta: number, status: string, reason: string, metricSources: object, temporary?: true }`

- [ ] **Step 1: Write the failing RED check**

Run this exact command before changing implementation:

```bash
node <<'NODE'
const assert = require('assert');
global.window = { GameModules: {} };
require('/workspace/publish/metrics.js');
require('/workspace/publish/ai.js');
const rows = window.GameModules.ai.normalizeMetricGroup([
  { key: '兴奋度', change: { mode: 'delta', value: 5 }, reasons: [{ trigger: '短期刺激', evidence: '本回合短暂亢奋' }] },
  { key: '害羞', change: { mode: 'delta', value: 3 }, reasons: [{ trigger: '被注视', evidence: '固定情绪应靠拢羞耻' }] },
], window.GameModules.metrics.emotionKeys, window.GameModules.metrics.defaults.emotions);
assert(rows.some((item) => item.key === '兴奋度' && item.temporary === true && item.delta === 5), '未知情绪 key 应作为 temporary item 保留');
assert(rows.some((item) => item.key === '羞耻' && !item.temporary && item.delta === 3), '固定别名害羞应靠拢羞耻');
NODE
```

Expected: FAIL with `未知情绪 key 应作为 temporary item 保留`.

- [ ] **Step 2: Implement minimal in-place change**

In `publish/ai.js`, replace `normalizeMetricKey()` and `normalizeMetricGroup()` with this implementation:

```js
  normalizeMetricKey(rawKey = '', keys = []) {
    const key = String(rawKey || '').trim();
    if (keys.includes(key)) return key;
    const aliases = { 羞涩: '羞耻', 羞怯: '羞耻', 害羞: '羞耻', 依恋: '依赖' };
    return keys.includes(aliases[key]) ? aliases[key] : key;
  },

  normalizeMetricGroup(value, keys, currentValues = null) {
    const main = Array.isArray(value) ? value : [];
    const used = new Set();
    const fixed = keys.map((key) => {
      const item = main.find((x) => this.normalizeMetricKey(x?.key, keys) === key);
      if (!item) return null;
      used.add(item);
      const rawDelta = window.GameModules.metrics.clampDelta(this.metricDeltaValue(item));
      const fallbackValues = window.Alpine?.store?.('game')?.[keys === window.GameModules.metrics.emotionKeys ? 'emotions' : 'playerFeelings'];
      const current = window.GameModules.metrics.clamp((currentValues || fallbackValues)?.[key] || 0);
      const delta = window.GameModules.metrics.lockedPlayerDelta?.(key, rawDelta, current) ?? rawDelta;
      const nextValue = window.GameModules.metrics.clamp(current + delta);
      const firstReason = Array.isArray(item.reasons) ? item.reasons.find(Boolean) || {} : {};
      const reason = String(item.reason || item.evidence || item.trigger || firstReason.evidence || firstReason.trigger || item.explanation || item.cause || item.status || '').slice(0, 180);
      const status = window.GameModules.metrics.valueExplanation(key, nextValue, item.status, reason);
      return { key, delta, status: String(status).slice(0, 180), reason, metricSources: { 数值: 'AI', 解释: 'AI', 原因: 'AI' } };
    }).filter(Boolean);
    const temporary = main.filter((item) => item && !used.has(item)).map((item) => {
      const key = String(item.key || '').trim();
      if (!key || keys.includes(this.normalizeMetricKey(key, keys))) return null;
      const rawDelta = window.GameModules.metrics.clampDelta(this.metricDeltaValue(item));
      const firstReason = Array.isArray(item.reasons) ? item.reasons.find(Boolean) || {} : {};
      const reason = String(item.reason || item.evidence || item.trigger || firstReason.evidence || firstReason.trigger || item.explanation || item.cause || item.status || '').slice(0, 180);
      const status = String(item.status || (reason ? `${key}：短期状态，因为${reason}。` : `${key}：短期状态。`)).slice(0, 180);
      return { key, delta: rawDelta, status, reason, temporary: true, metricSources: { 数值: 'AI', 解释: 'AI', 原因: 'AI' } };
    }).filter(Boolean);
    return [...fixed, ...temporary];
  },
```

- [ ] **Step 3: Run the RED check again**

Run the command from Step 1.

Expected: PASS with no output.

---

### Task 2: Store, Apply, and Decay Temporary Metrics in Existing Metric Methods

**Files:**
- Modify: `publish/metrics.js:72-124`
- Modify: `publish/actions.js:26-31`
- Modify: `publish/result-actions.js:94-100`
- Modify: `publish/game.js:23-31` and `publish/game.js:99-103`

**Interfaces:**
- Consumes: normalized items from Task 1, especially `item.temporary === true`.
- Produces: `metrics.temporaryEmotions` and `metrics.temporaryPlayerFeelings`, both plain `{ [key: string]: number }` objects.

- [ ] **Step 1: Write the failing RED check**

Run this before implementation:

```bash
node <<'NODE'
const assert = require('assert');
global.window = { GameModules: {} };
require('/workspace/publish/metrics.js');
const store = { emotions: {}, playerFeelings: {}, metricNotes: {} };
window.GameModules.metrics.apply(store, {
  emotions: [
    { key: '紧张', delta: 3, reason: '固定情绪原因' },
    { key: '兴奋度', delta: 5, temporary: true, reason: '短期兴奋原因' },
  ],
  playerFeelings: [
    { key: '依恋感', delta: 4, temporary: true, reason: '短期依恋原因' },
  ],
});
assert.strictEqual(store.emotions.紧张, 23, '固定情绪仍应更新固定容器');
assert.strictEqual(store.temporaryEmotions.兴奋度, 5, '未知情绪应写入 temporaryEmotions');
assert.strictEqual(store.temporaryPlayerFeelings.依恋感, 4, '未知感觉应写入 temporaryPlayerFeelings');
assert(store.metricNotes['emotion:兴奋度'].reason.includes('短期兴奋原因'), '临时情绪原因应关联对应 key');
window.GameModules.metrics.apply(store, { emotions: [], playerFeelings: [] });
assert.strictEqual(store.temporaryEmotions.兴奋度, 4, '下一回合临时情绪自动 -1');
assert.strictEqual(store.temporaryPlayerFeelings.依恋感, 3, '下一回合临时感觉自动 -1');
store.temporaryEmotions.兴奋度 = 0;
window.GameModules.metrics.apply(store, { emotions: [], playerFeelings: [] });
assert.strictEqual(store.temporaryEmotions.兴奋度, 0, '临时值最低为 0 且不删除');
NODE
```

Expected: FAIL because `temporaryEmotions` is missing or unknown key is dropped.

- [ ] **Step 2: Update `publish/metrics.js` in-place**

Replace the `ensure`, `apply`, `applyGroup`, and `writeMetric` block with this version. Keep existing methods before and after the block unchanged.

```js
  ensure(store) {
    store.emotions = this.fill(store.emotions, this.emotionKeys, this.defaults.emotions);
    store.playerFeelings = this.fill(store.playerFeelings, this.playerKeys, this.defaults.playerFeelings);
    store.temporaryEmotions = store.temporaryEmotions && typeof store.temporaryEmotions === 'object' ? store.temporaryEmotions : {};
    store.temporaryPlayerFeelings = store.temporaryPlayerFeelings && typeof store.temporaryPlayerFeelings === 'object' ? store.temporaryPlayerFeelings : {};
    store.metricNotes = store.metricNotes || {};
  },
  fill(current, keys, defaults) {
    const out = {};
    keys.forEach((key) => { out[key] = this.clamp(current?.[key] ?? defaults[key] ?? 0); });
    return out;
  },
  apply(store, updates) {
    this.ensure(store);
    Object.keys(store.temporaryEmotions).forEach((key) => { store.temporaryEmotions[key] = Math.max(0, this.clamp(store.temporaryEmotions[key]) - 1); });
    Object.keys(store.temporaryPlayerFeelings).forEach((key) => { store.temporaryPlayerFeelings[key] = Math.max(0, this.clamp(store.temporaryPlayerFeelings[key]) - 1); });
    this.applyGroup(store.emotions, updates?.emotions, store.metricNotes, 'emotion', store.temporaryEmotions);
    this.applyGroup(store.playerFeelings, updates?.playerFeelings, store.metricNotes, 'player', store.temporaryPlayerFeelings);
  },
  applyInitial(store, updates) {
    this.ensure(store);
    this.setGroup(store.emotions, updates?.emotions, store.metricNotes, 'emotion');
    this.setGroup(store.playerFeelings, updates?.playerFeelings, store.metricNotes, 'player');
  },
  applyGroup(target, items, notes, group, temporaryTarget = null) {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      const key = String(item?.key || '').trim();
      if (!key) return;
      const isFixed = Object.prototype.hasOwnProperty.call(target, key);
      const targetGroup = isFixed ? target : (item.temporary && temporaryTarget ? temporaryTarget : null);
      if (!targetGroup) return;
      const before = this.clamp(targetGroup[key] || 0);
      const rawDelta = this.clampDelta(this.metricDeltaValue(item));
      const delta = group === 'player' && isFixed ? this.lockedPlayerDelta(item.key, rawDelta, before) : rawDelta;
      const value = this.clamp(before + delta);
      this.writeMetric(targetGroup, notes, group, { ...item, key, delta, temporary: !isFixed }, value, '本回合没有直接触发变化，保持原值。');
    });
  },
  setGroup(target, items, notes, group) {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      if (!Object.prototype.hasOwnProperty.call(target, item?.key)) return;
      this.writeMetric(target, notes, group, item, this.clamp(item.value), '你刚介入她/他的处境，因此这项感受还在形成。');
    });
  },
  writeMetric(target, notes, group, item, value, fallbackReason) {
    const noteGroup = item.temporary ? `${group}:temporary` : group;
    const stage = item.temporary ? '短期状态' : this.stageFor(item.key, value);
    target[item.key] = value;
    const rawStatus = String(item.status || '').trim();
    const rawReason = String(item.reason || '').trim();
    const reason = String(rawReason || fallbackReason).slice(0, 180);
    const status = item.temporary
      ? String(rawStatus || `${item.key}${this.clamp(value)}：短期状态，因为${reason.replace(/[。.!！]+$/g, '')}。`).slice(0, 180)
      : String(this.valueExplanation(item.key, value, rawStatus, reason)).slice(0, 180);
    const explicitSources = item.metricSources || null;
    const statusFromAi = rawStatus && status === rawStatus;
    const isAi = (source) => String(source || '').toLowerCase() === 'ai';
    const metricSources = explicitSources ? {
      数值: isAi(explicitSources.数值) ? 'AI' : '系统',
      解释: isAi(explicitSources.解释) && statusFromAi ? 'AI' : '系统',
      原因: isAi(explicitSources.原因) && rawReason ? 'AI' : '系统',
    } : {
      数值: 'AI',
      解释: statusFromAi ? 'AI' : '系统',
      原因: rawReason ? 'AI' : '系统',
    };
    notes[`${noteGroup}:${item.key}`] = { status, reason, metricSources };
  },
```

- [ ] **Step 3: Update `publish/actions.js`**

Change `ensureStateMetrics(state)` to include temporary containers:

```js
  ensureStateMetrics(state) {
    const fresh = window.GameModules.metrics.fresh();
    state.metrics = state.metrics || {};
    state.metrics.emotions = window.GameModules.metrics.fill(state.metrics.emotions, window.GameModules.metrics.emotionKeys, fresh.emotions);
    state.metrics.playerFeelings = window.GameModules.metrics.fill(state.metrics.playerFeelings, window.GameModules.metrics.playerKeys, fresh.playerFeelings);
    state.metrics.temporaryEmotions = state.metrics.temporaryEmotions && typeof state.metrics.temporaryEmotions === 'object' ? state.metrics.temporaryEmotions : {};
    state.metrics.temporaryPlayerFeelings = state.metrics.temporaryPlayerFeelings && typeof state.metrics.temporaryPlayerFeelings === 'object' ? state.metrics.temporaryPlayerFeelings : {};
    state.metrics.notes = state.metrics.notes || {};
    return state.metrics;
  },
```

- [ ] **Step 4: Update `publish/result-actions.js`**

Change `loadMetricsFromCharacterState(state = this.characterRpgState)` to load temporary containers:

```js
  loadMetricsFromCharacterState(state = this.characterRpgState) {
    const metrics = this.ensureStateMetrics(state);
    this.emotions = { ...metrics.emotions };
    this.playerFeelings = { ...metrics.playerFeelings };
    this.temporaryEmotions = { ...(metrics.temporaryEmotions || {}) };
    this.temporaryPlayerFeelings = { ...(metrics.temporaryPlayerFeelings || {}) };
    this.metricNotes = { ...(metrics.notes || {}) };
    this.metricsReady = true;
    this.syncMetricDerived();
  },
```

- [ ] **Step 5: Update `publish/game.js` metric UI groups and defaults**

Change `metricGroups(state = null)` to append temporary groups:

```js
    metricGroups(state = null) {
      if (!state || state.id === this.character?.id) {
        window.GameModules.metrics.ensure(this);
        return [
          { title: '情绪', type: 'emotion', values: this.emotions, ready: this.metricsReady },
          { title: '感觉', type: 'player', values: this.playerFeelings, ready: this.metricsReady },
          { title: '临时情绪', type: 'emotion:temporary', values: this.temporaryEmotions || {}, ready: this.metricsReady },
          { title: '临时感觉', type: 'player:temporary', values: this.temporaryPlayerFeelings || {}, ready: this.metricsReady },
        ];
      }
      const metrics = this.ensureStateMetrics ? this.ensureStateMetrics(state) : (state.metrics || {});
      return [
        { title: '情绪', type: 'emotion', values: metrics.emotions || {}, ready: true },
        { title: '感觉', type: 'player', values: metrics.playerFeelings || {}, ready: true },
        { title: '临时情绪', type: 'emotion:temporary', values: metrics.temporaryEmotions || {}, ready: true },
        { title: '临时感觉', type: 'player:temporary', values: metrics.temporaryPlayerFeelings || {}, ready: true },
      ];
    },
```

In the Alpine store defaults near `emotions` and `playerFeelings`, add:

```js
    temporaryEmotions: {},
    temporaryPlayerFeelings: {},
```

- [ ] **Step 6: Run the RED check again**

Run the command from Step 1.

Expected: PASS with no output.

---

### Task 3: Show Temporary Metric Changes in Real-World Settlement

**Files:**
- Modify: `publish/real-world-settlement-actions.js:73-86`

**Interfaces:**
- Consumes: `updates.emotions` and `updates.playerFeelings` containing both fixed and temporary items.
- Produces: settlement rows with fields `情绪`, `感觉`, `临时情绪`, `临时感觉`.

- [ ] **Step 1: Write the failing RED check**

Run this before implementation:

```bash
node <<'NODE'
const assert = require('assert');
global.window = { GameModules: { metrics: { metricDeltaValue: (item) => item.delta ?? item.value ?? 0, clampDelta: (v) => Math.max(-30, Math.min(30, Math.round(Number(v) || 0))), lockedPlayerDelta: (key, delta) => delta } } };
const actions = {
  ensureStateMetrics() { return { emotions: { 紧张: 20 }, playerFeelings: { 依赖: 10 }, temporaryEmotions: { 兴奋度: 4 }, temporaryPlayerFeelings: { 依恋感: 3 } }; },
  realWorldSettlementTargetGroup() { return '刘思琪'; },
  realWorldSettlementRecord(field, name, value, reason, group) { return { field, name, value, reason, group }; },
};
Object.assign(actions, require('/workspace/publish/real-world-settlement-actions.js'));
NODE
```

This direct `require` will not work because browser files do not export modules. Instead run the behavior using an inline copy of the target method before changing production code:

```bash
node <<'NODE'
const assert = require('assert');
global.window = { GameModules: { metrics: { metricDeltaValue: (item) => item.delta ?? item.value ?? 0, clampDelta: (v) => Math.max(-30, Math.min(30, Math.round(Number(v) || 0))), lockedPlayerDelta: (key, delta) => delta } } };
const store = {
  ensureStateMetrics() { return { emotions: { 紧张: 20 }, playerFeelings: { 依赖: 10 }, temporaryEmotions: { 兴奋度: 4 }, temporaryPlayerFeelings: { 依恋感: 3 } }; },
  realWorldSettlementTargetGroup() { return '刘思琪'; },
  realWorldSettlementRecord(field, name, value, reason, group) { return { field, name, value, reason, group }; },
  realWorldMetricSettlement(state, updates = {}, group = '') {
    group = group || this.realWorldSettlementTargetGroup(state?.id || 'player-self', '');
    const metrics = state ? this.ensureStateMetrics(state) : null;
    const rows = [];
    const add = (field, list, current = {}) => (Array.isArray(list) ? list : []).forEach((item) => {
      const before = Number(current[item.key] || 0);
      const rawDelta = window.GameModules.metrics.metricDeltaValue?.(item) ?? item.delta;
      const delta = field === '感觉' ? window.GameModules.metrics.lockedPlayerDelta(item.key, window.GameModules.metrics.clampDelta(rawDelta), before) : window.GameModules.metrics.clampDelta(rawDelta);
      const after = Math.max(0, Math.min(100, before + delta));
      rows.push(this.realWorldSettlementRecord(field, item.key, `${before} → ${after}（${item.status || '状态更新'}）`, item.reason, group));
    });
    add('情绪', updates.emotions, metrics?.emotions);
    add('感觉', updates.playerFeelings, metrics?.playerFeelings);
    return rows;
  },
};
const rows = store.realWorldMetricSettlement({ id: 'role-a' }, { emotions: [{ key: '兴奋度', delta: 5, temporary: true, reason: '短期兴奋原因' }], playerFeelings: [{ key: '依恋感', delta: 4, temporary: true, reason: '短期依恋原因' }] });
assert(rows.some((row) => row.field === '临时情绪' && row.name === '兴奋度' && row.reason === '短期兴奋原因'), '临时情绪应显示在结算且保留关联原因');
assert(rows.some((row) => row.field === '临时感觉' && row.name === '依恋感' && row.reason === '短期依恋原因'), '临时感觉应显示在结算且保留关联原因');
NODE
```

Expected: FAIL with `临时情绪应显示在结算且保留关联原因`.

- [ ] **Step 2: Update `realWorldMetricSettlement()` in-place**

Replace the method with:

```js
  realWorldMetricSettlement(state, updates = {}, group = '') {
    group = group || this.realWorldSettlementTargetGroup(state?.id || 'player-self', '');
    const metrics = state ? this.ensureStateMetrics(state) : null;
    const rows = [];
    const add = (field, list, current = {}) => (Array.isArray(list) ? list : []).forEach((item) => {
      const before = Number(current?.[item.key] || 0);
      const rawDelta = window.GameModules.metrics.metricDeltaValue?.(item) ?? item.delta;
      const isFeeling = field === '感觉' || field === '临时感觉';
      const delta = isFeeling && !item.temporary ? window.GameModules.metrics.lockedPlayerDelta(item.key, window.GameModules.metrics.clampDelta(rawDelta), before) : window.GameModules.metrics.clampDelta(rawDelta);
      const after = Math.max(0, Math.min(100, before + delta));
      rows.push(this.realWorldSettlementRecord(field, item.key, `${before} → ${after}（${item.status || '状态更新'}）`, item.reason, group));
    });
    add('情绪', (updates.emotions || []).filter((item) => !item?.temporary), metrics?.emotions);
    add('感觉', (updates.playerFeelings || []).filter((item) => !item?.temporary), metrics?.playerFeelings);
    add('临时情绪', (updates.emotions || []).filter((item) => item?.temporary), metrics?.temporaryEmotions);
    add('临时感觉', (updates.playerFeelings || []).filter((item) => item?.temporary), metrics?.temporaryPlayerFeelings);
    return rows;
  },
```

- [ ] **Step 3: Run an adapted GREEN check**

Run the same inline command from Step 1 after replacing the copied method body with the new method body.

Expected: PASS with no output.

---

### Task 4: Update Prompt Wording Without Adding AI Skills

**Files:**
- Modify: `publish/update/emotion-update-prompt.js`
- Modify: `publish/update/feeling-update-prompt.js`

**Interfaces:**
- Consumes: existing update registry skill text loader.
- Produces: same AI-visible skills: `emotion-update` and `feeling-update` only.

- [ ] **Step 1: Inspect current prompt files**

Use `Read` on:

- `/workspace/publish/update/emotion-update-prompt.js`
- `/workspace/publish/update/feeling-update-prompt.js`

Confirm they define text for existing skills, not new skills.

- [ ] **Step 2: Update emotion prompt wording**

Ensure the `emotion-update` prompt includes these exact requirements in Chinese:

```text
- 固定情绪 key 表示较稳定、可持续影响后续判断的长期情绪维度：冷静、恐惧、担忧、高兴、紧张、愤怒、羞耻、悲伤、好奇、麻木、嫉妒、绝望。
- 若本次变化会影响角色后续判断、长期心理倾向或持续状态，优先向语义最接近的固定情绪 key 靠拢。
- 临时情绪 key 表示本回合或短期场景状态，不代表长期人格、关系或稳定心理倾向。
- 当固定情绪 key 无法准确表达短暂状态时，可以使用临时情绪名；仍使用 field:"metrics.emotions.<临时名>"。
- 临时情绪名必须短、稳定、可复用，避免每回合创造同义词。
```

Keep the existing output shape unchanged:

```json
{"updateType":"emotion","field":"metrics.emotions.<情绪名>","change":{"mode":"delta","value":3}}
```

- [ ] **Step 3: Update feeling prompt wording**

Ensure the `feeling-update` prompt includes these exact requirements in Chinese:

```text
- 固定感觉 key 表示角色对玩家较稳定、可持续影响后续关系判断的长期感觉维度：了解、信任、反抗、好感、友情、亲情、爱情、肉欲、畏惧、尊敬、崇拜、讨厌、依赖、警惕、支配欲、占有欲、服从。
- 若本次变化会影响角色对玩家的长期态度、关系倾向或后续互动，优先向语义最接近的固定感觉 key 靠拢。
- 临时感觉 key 表示本回合或短期场景中对玩家的即时感受，不代表长期关系变化。
- 当固定感觉 key 无法准确表达短暂感受时，可以使用临时感觉名；仍使用 field:"metrics.playerFeelings.<临时名>"。
- 临时感觉名必须短、稳定、可复用，避免每回合创造同义词。
```

Keep the existing output shape unchanged:

```json
{"updateType":"feeling","field":"metrics.playerFeelings.<感觉名>","change":{"mode":"delta","value":2}}
```

- [ ] **Step 4: Verify no new AI-visible skill was added**

Run:

```bash
grep -R "temporary-emotion\|temporary-feeling\|临时情绪-update\|临时感觉-update" /workspace/publish/update || true
```

Expected: no matches.

---

### Task 5: End-to-End Verification and Syntax Checks

**Files:**
- Verify only; no required modifications.

**Interfaces:**
- Verifies Tasks 1-4 work together.

- [ ] **Step 1: Run full temporary metric behavior check**

Run:

```bash
node <<'NODE'
const assert = require('assert');
global.window = { GameModules: {} };
require('/workspace/publish/metrics.js');
require('/workspace/publish/ai.js');
const updates = {
  emotions: window.GameModules.ai.normalizeMetricGroup([
    { key: '紧张', change: { mode: 'delta', value: 2 }, reasons: [{ evidence: '长期压力' }] },
    { key: '兴奋度', change: { mode: 'delta', value: 5 }, reasons: [{ evidence: '短期刺激' }] },
  ], window.GameModules.metrics.emotionKeys, window.GameModules.metrics.defaults.emotions),
  playerFeelings: window.GameModules.ai.normalizeMetricGroup([
    { key: '依赖', change: { mode: 'delta', value: 2 }, reasons: [{ evidence: '长期依靠' }] },
    { key: '眩晕般依恋', change: { mode: 'delta', value: 4 }, reasons: [{ evidence: '短期场景感受' }] },
  ], window.GameModules.metrics.playerKeys, window.GameModules.metrics.defaults.playerFeelings),
};
const store = { emotions: {}, playerFeelings: {}, metricNotes: {} };
window.GameModules.metrics.apply(store, updates);
assert.strictEqual(store.emotions.紧张, 22);
assert.strictEqual(store.playerFeelings.依赖, 2);
assert.strictEqual(store.temporaryEmotions.兴奋度, 5);
assert.strictEqual(store.temporaryPlayerFeelings.眩晕般依恋, 4);
assert(store.metricNotes['emotion:temporary:兴奋度'].reason.includes('短期刺激'));
assert(store.metricNotes['player:temporary:眩晕般依恋'].reason.includes('短期场景感受'));
window.GameModules.metrics.apply(store, { emotions: [], playerFeelings: [] });
assert.strictEqual(store.temporaryEmotions.兴奋度, 4);
assert.strictEqual(store.temporaryPlayerFeelings.眩晕般依恋, 3);
NODE
```

Expected: PASS with no output.

- [ ] **Step 2: Run syntax checks for modified JS files**

Run:

```bash
node --check /workspace/publish/ai.js && node --check /workspace/publish/metrics.js && node --check /workspace/publish/actions.js && node --check /workspace/publish/result-actions.js && node --check /workspace/publish/game.js && node --check /workspace/publish/real-world-settlement-actions.js && node --check /workspace/publish/update/emotion-update-prompt.js && node --check /workspace/publish/update/feeling-update-prompt.js
```

Expected: all commands exit 0 with no syntax errors.

- [ ] **Step 3: Check changed prompt text**

Run:

```bash
grep -R "固定情绪 key 表示\|固定感觉 key 表示\|temporary-emotion\|temporary-feeling" /workspace/publish/update/emotion-update-prompt.js /workspace/publish/update/feeling-update-prompt.js
```

Expected:

- Matches for `固定情绪 key 表示` in `emotion-update-prompt.js`.
- Matches for `固定感觉 key 表示` in `feeling-update-prompt.js`.
- No matches for `temporary-emotion` or `temporary-feeling`.

---

## Self-Review

- Spec coverage: fixed keys remain long-term, unknown keys become temporary, temporary values decay by 1, AI-facing skill surface is unchanged, prompt wording is semantic rather than mandatory-only, and reasons remain associated via `metricNotes` and settlement rows.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: temporary containers are consistently named `temporaryEmotions` and `temporaryPlayerFeelings`; temporary items consistently use `temporary: true`.
- Scope check: this is one focused subsystem change inside metric normalization/application/display.
