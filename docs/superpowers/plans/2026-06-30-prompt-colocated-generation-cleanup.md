# Prompt Colocated Generation Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 推演引擎 prompt `.md` sources and generated `.js` registration files live in the same `publish/prompts/推演引擎/` directory tree, and remove old stub/compat prompt files.

**Architecture:** `publish/prompts/推演引擎/**/*.md` becomes the only editable prompt source tree for the inference engine, update prompts, and init prompts. `tools/sync-prompt-md.js` generates colocated `.js` files by default; `publish/index.html` loads those generated files directly. Legacy stub `.md` files and old generated `.js` prompt registration files under `publish/update/`, `publish/init/`, and old root prompt aliases under `publish/prompts/` are deleted.

**Tech Stack:** Plain JavaScript browser globals under `window.GameModules`; Node.js scripts/tests with `assert`, `fs`, `path`, and `vm`; static `publish/index.html` script loading.

## Global Constraints

- Do not commit unless the user explicitly asks for a commit.
- Keep existing business update implementation files such as `publish/update/body-status-update.js`; only prompt source/registration files move.
- Prompt `.md` and generated `.js` for 推演引擎 must live in the same directory.
- Preserve runtime registries: `promptTemplates.inline[id]`, `updateRegistry.registerPrompt(id, text)`, and `initPromptSources[id]`.
- Remove old editable/stub compatibility prompt files instead of keeping duplicate sources.

---

## File Structure

- Modify `tools/sync-prompt-md.js`: default output remains `source.md -> source.js`, and it must continue generating three registration styles via `--kind template|update|init`.
- Delete `tools/sync-prompt-templates-inline.js`: old inline bundle generator is no longer needed for 推演引擎 stage prompts.
- Delete `publish/prompt-templates-inline.js`: stage prompts are registered by colocated generated `.js` files.
- Modify `publish/index.html`: remove `prompt-templates-inline.js`; load stage, init, and update generated prompt `.js` files from `prompts/推演引擎/`.
- Modify `publish/prompt-templates.js`: keep canonical stage template item file paths under `prompts/推演引擎/*.md`; remove legacy stage alias entries that point at old stub `.md` files.
- Create generated files beside each prompt source:
  - `publish/prompts/推演引擎/stage1-guided-query.js`
  - `publish/prompts/推演引擎/stage2-scene-anchor.js`
  - `publish/prompts/推演引擎/stage3-narration.js`
  - `publish/prompts/推演引擎/stage4-settlement-window.js`
  - `publish/prompts/推演引擎/init/intimacy-body-init-prompt.js`
  - `publish/prompts/推演引擎/update/*-update-prompt.js`
- Delete old prompt compatibility files:
  - `publish/update/*-update-prompt.md`
  - `publish/update/*-update-prompt.js`
  - `publish/init/*-init-prompt.md`
  - `publish/init/*-init-prompt.js`
  - `publish/prompts/real-world-engine.md`
  - `publish/prompts/real-world-engine-first.md`
  - `publish/prompts/story-agent-engine.md`
  - `publish/prompts/story-agent-engine-first.md`
  - `publish/prompts/stage1-guided-query.md`
  - `publish/prompts/stage2-scene-anchor.md`
  - `publish/prompts/stage3-narration.md`
- Modify `tests/real-world-loop-update.test.js`: update path assertions, add colocated generation/cleanup tests, and load new prompt registration files where tests inspect prompt registry content.

---

### Task 1: Protect colocated prompt generation with failing tests

**Files:**
- Modify: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: filesystem paths relative to repo root.
- Produces: tests that require every `publish/prompts/推演引擎/**/*.md` prompt source to have a colocated `.js`, and require old prompt stubs/generated files to be absent.

- [ ] **Step 1: Replace old centralization tests with colocated cleanup tests**

In `tests/real-world-loop-update.test.js`, find the existing tests named like:

```js
test('inference engine prompts are centralized markdown sources', () => {
```

and:

```js
test('old inference prompt markdown sources are not duplicated outside unified directory', () => {
```

Replace those tests with:

```js
test('inference engine prompt markdown sources have colocated generated scripts', () => {
  const promptRoot = path.join(root, 'publish/prompts/推演引擎');
  const collect = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
  const mdFiles = collect(promptRoot);
  assert.ok(mdFiles.length >= 20);
  mdFiles.forEach((file) => {
    const generated = file.replace(/\.md$/u, '.js');
    assert.ok(fs.existsSync(generated), `${path.relative(root, generated)} should exist beside its md source`);
  });
});

test('old inference prompt compatibility files are removed', () => {
  const removed = [
    'publish/prompt-templates-inline.js',
    'publish/prompts/real-world-engine.md',
    'publish/prompts/real-world-engine-first.md',
    'publish/prompts/story-agent-engine.md',
    'publish/prompts/story-agent-engine-first.md',
    'publish/prompts/stage1-guided-query.md',
    'publish/prompts/stage2-scene-anchor.md',
    'publish/prompts/stage3-narration.md',
    'publish/init/intimacy-body-init-prompt.md',
    'publish/init/intimacy-body-init-prompt.js',
  ];
  fs.readdirSync(path.join(root, 'publish/update'))
    .filter((name) => /-update-prompt\.(?:md|js)$/u.test(name))
    .forEach((name) => removed.push(`publish/update/${name}`));
  removed.forEach((file) => {
    assert.ok(!fs.existsSync(path.join(root, file)), `${file} should be removed`);
  });
});
```

- [ ] **Step 2: Add runtime path test for `index.html`**

Add this test near those filesystem prompt tests:

```js
test('index loads colocated inference prompt scripts and no old prompt scripts', () => {
  const html = fs.readFileSync(path.join(root, 'publish/index.html'), 'utf8');
  assert.ok(!html.includes('prompt-templates-inline.js'));
  assert.ok(!html.includes('update/body-status-update-prompt.js'));
  assert.ok(!html.includes('init/intimacy-body-init-prompt.js'));
  assert.ok(html.includes('prompts/推演引擎/stage1-guided-query.js'));
  assert.ok(html.includes('prompts/推演引擎/stage4-settlement-window.js'));
  assert.ok(html.includes('prompts/推演引擎/update/body-status-update-prompt.js'));
  assert.ok(html.includes('prompts/推演引擎/init/intimacy-body-init-prompt.js'));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because colocated `.js` files do not yet exist and old prompt compatibility files still exist.

---

### Task 2: Generate colocated prompt registration scripts

**Files:**
- Modify: `tools/sync-prompt-md.js`
- Create: `publish/prompts/推演引擎/*.js`
- Create: `publish/prompts/推演引擎/init/*.js`
- Create: `publish/prompts/推演引擎/update/*.js`

**Interfaces:**
- Consumes: `node tools/sync-prompt-md.js <md-file> --kind template|update|init --id <id> [--template <templateKey>]`.
- Produces: colocated `.js` files that register prompts into existing browser registries.

- [ ] **Step 1: Verify `sync-prompt-md.js` already defaults to colocated output**

Confirm this line remains true in `tools/sync-prompt-md.js`:

```js
const out = opts.out ? path.resolve(root, opts.out) : sourcePath.replace(/\.md$/u, '.js');
```

If it differs, restore it exactly.

- [ ] **Step 2: Generate stage template scripts**

Run:

```bash
node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/stage1-guided-query.md" --kind template --id inference-stage1-guided-query && node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/stage2-scene-anchor.md" --kind template --id inference-stage2-scene-anchor && node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/stage3-narration.md" --kind template --id inference-stage3-narration && node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/stage4-settlement-window.md" --kind template --id inference-stage4-settlement-window
```

Expected output includes:

```text
publish/prompts/推演引擎/stage1-guided-query.js
publish/prompts/推演引擎/stage2-scene-anchor.js
publish/prompts/推演引擎/stage3-narration.js
publish/prompts/推演引擎/stage4-settlement-window.js
```

- [ ] **Step 3: Generate init prompt script**

Run:

```bash
node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/init/intimacy-body-init-prompt.md" --kind init --id intimacy-body --template intimacy-body-init
```

Expected output:

```text
publish/prompts/推演引擎/init/intimacy-body-init-prompt.js
```

- [ ] **Step 4: Generate update prompt scripts**

Run:

```bash
for id in generic emotion feeling vital role-card relationship sexual-experience sexual-history body-status wearing-state item faction-structure faction-overview map system; do node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/update/${id}-update-prompt.md" --kind update --id "${id}-update"; done
```

Expected output includes one `.js` beside each update `.md`, for example:

```text
publish/prompts/推演引擎/update/body-status-update-prompt.js
```

- [ ] **Step 5: Spot-check generated registration content**

Read `publish/prompts/推演引擎/update/body-status-update-prompt.js` and confirm it starts like:

```js
// GENERATED FROM publish/prompts/推演引擎/update/body-status-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("body-status-update",
```

Read `publish/prompts/推演引擎/stage1-guided-query.js` and confirm it assigns:

```js
window.GameModules.promptTemplates.inline["inference-stage1-guided-query"]
```

---

### Task 3: Update runtime script loading to the new colocated prompt paths

**Files:**
- Modify: `publish/index.html`
- Modify: `publish/prompt-templates.js`

**Interfaces:**
- Consumes: generated scripts from Task 2.
- Produces: browser runtime loads prompt registration from `publish/prompts/推演引擎/` and no longer loads `prompt-templates-inline.js` or old update/init prompt paths.

- [ ] **Step 1: Remove old inline bundle loading**

In `publish/index.html`, remove this line:

```html
  <script src="prompt-templates-inline.js"></script>
```

- [ ] **Step 2: Add stage prompt script loading after `prompt-templates.js`**

Immediately after:

```html
  <script src="prompt-templates.js"></script>
```

add:

```html
  <script src="prompts/推演引擎/stage1-guided-query.js"></script>
  <script src="prompts/推演引擎/stage2-scene-anchor.js"></script>
  <script src="prompts/推演引擎/stage3-narration.js"></script>
  <script src="prompts/推演引擎/stage4-settlement-window.js"></script>
```

- [ ] **Step 3: Replace init prompt script path**

In `publish/index.html`, replace:

```html
  <script src="init/intimacy-body-init-prompt.js"></script>
```

with:

```html
  <script src="prompts/推演引擎/init/intimacy-body-init-prompt.js"></script>
```

Keep `init/intimacy-body-init-template.js`, `init/init-prompt-registry.js`, and `init/intimacy-body-ui.js` unchanged.

- [ ] **Step 4: Replace update prompt script paths**

In `publish/index.html`, replace the old block:

```html
  <script src="update/generic-update-prompt.js"></script>
  <script src="update/emotion-update-prompt.js"></script>
  <script src="update/feeling-update-prompt.js"></script>
  <script src="update/vital-update-prompt.js"></script>
  <script src="update/role-card-update-prompt.js"></script>
  <script src="update/relationship-update-prompt.js"></script>
  <script src="update/sexual-experience-update-prompt.js"></script>
  <script src="update/sexual-history-update-prompt.js"></script>
  <script src="update/body-status-update-prompt.js"></script>
  <script src="update/wearing-state-update-prompt.js"></script>
  <script src="update/item-update-prompt.js"></script>
  <script src="update/faction-structure-update-prompt.js"></script>
  <script src="update/faction-overview-update-prompt.js"></script>
  <script src="update/map-update-prompt.js"></script>
  <script src="update/system-update-prompt.js"></script>
```

with:

```html
  <script src="prompts/推演引擎/update/generic-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/emotion-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/feeling-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/vital-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/role-card-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/relationship-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/sexual-experience-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/sexual-history-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/body-status-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/wearing-state-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/item-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/faction-structure-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/faction-overview-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/map-update-prompt.js"></script>
  <script src="prompts/推演引擎/update/system-update-prompt.js"></script>
```

- [ ] **Step 5: Remove legacy stage alias entries from `prompt-templates.js`**

In `publish/prompt-templates.js`, remove these four items from `items`:

```js
{ id: 'story-agent-engine', title: '主剧情分阶段推演引擎', category: '剧情推演', file: 'prompts/story-agent-engine.md', summary: '操控/离线回合复用 Loop Agent 的资料请求、正文生成与状态结算。' },
{ id: 'story-agent-engine-first', title: '主剧情首轮资料识别', category: '剧情推演', file: 'prompts/story-agent-engine-first.md', summary: '主剧情 Loop Agent 第一步识别人物与作品设定资料。' },
{ id: 'real-world-engine', title: '现实世界推演引擎', category: '现实推演', file: 'prompts/real-world-engine.md', summary: '玩家收起手机后的现实行动、现实状态与词条更新。' },
{ id: 'real-world-engine-first', title: '现实世界首轮资料识别', category: '现实推演', file: 'prompts/real-world-engine-first.md', summary: '现实 Loop Agent 第一步识别人物与必要资料。' },
```

Keep the canonical `inference-stage1-guided-query`, `inference-stage2-scene-anchor`, `inference-stage3-narration`, and `inference-stage4-settlement-window` entries.

- [ ] **Step 6: Run targeted test to confirm path assertions now pass or only deletion assertions fail**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: tests may still FAIL until old files are deleted in Task 4, but failures should no longer be due to missing colocated generated scripts or index path expectations.

---

### Task 4: Delete old prompt compatibility files

**Files:**
- Delete: `tools/sync-prompt-templates-inline.js`
- Delete: `publish/prompt-templates-inline.js`
- Delete: `publish/update/*-update-prompt.md`
- Delete: `publish/update/*-update-prompt.js`
- Delete: `publish/init/intimacy-body-init-prompt.md`
- Delete: `publish/init/intimacy-body-init-prompt.js`
- Delete: `publish/prompts/real-world-engine.md`
- Delete: `publish/prompts/real-world-engine-first.md`
- Delete: `publish/prompts/story-agent-engine.md`
- Delete: `publish/prompts/story-agent-engine-first.md`
- Delete: `publish/prompts/stage1-guided-query.md`
- Delete: `publish/prompts/stage2-scene-anchor.md`
- Delete: `publish/prompts/stage3-narration.md`

**Interfaces:**
- Consumes: new runtime paths from Task 3.
- Produces: no duplicate/stub prompt sources remain in old locations.

- [ ] **Step 1: Delete old update prompt md/js files**

Run:

```bash
rm "publish/update/body-status-update-prompt.md" "publish/update/body-status-update-prompt.js" "publish/update/emotion-update-prompt.md" "publish/update/emotion-update-prompt.js" "publish/update/faction-overview-update-prompt.md" "publish/update/faction-overview-update-prompt.js" "publish/update/faction-structure-update-prompt.md" "publish/update/faction-structure-update-prompt.js" "publish/update/feeling-update-prompt.md" "publish/update/feeling-update-prompt.js" "publish/update/generic-update-prompt.md" "publish/update/generic-update-prompt.js" "publish/update/item-update-prompt.md" "publish/update/item-update-prompt.js" "publish/update/map-update-prompt.md" "publish/update/map-update-prompt.js" "publish/update/relationship-update-prompt.md" "publish/update/relationship-update-prompt.js" "publish/update/role-card-update-prompt.md" "publish/update/role-card-update-prompt.js" "publish/update/sexual-experience-update-prompt.md" "publish/update/sexual-experience-update-prompt.js" "publish/update/sexual-history-update-prompt.md" "publish/update/sexual-history-update-prompt.js" "publish/update/system-update-prompt.md" "publish/update/system-update-prompt.js" "publish/update/vital-update-prompt.md" "publish/update/vital-update-prompt.js" "publish/update/wearing-state-update-prompt.md" "publish/update/wearing-state-update-prompt.js"
```

Expected: command succeeds; only prompt registration files are deleted, not `*-update.js` implementation files.

- [ ] **Step 2: Delete old init prompt md/js files**

Run:

```bash
rm "publish/init/intimacy-body-init-prompt.md" "publish/init/intimacy-body-init-prompt.js"
```

Expected: command succeeds; `publish/init/intimacy-body-init-template.js`, `publish/init/init-prompt-registry.js`, and `publish/init/intimacy-body-ui.js` remain.

- [ ] **Step 3: Delete old root prompt stubs and inline bundle tooling**

Run:

```bash
rm "publish/prompt-templates-inline.js" "tools/sync-prompt-templates-inline.js" "publish/prompts/real-world-engine.md" "publish/prompts/real-world-engine-first.md" "publish/prompts/story-agent-engine.md" "publish/prompts/story-agent-engine-first.md" "publish/prompts/stage1-guided-query.md" "publish/prompts/stage2-scene-anchor.md" "publish/prompts/stage3-narration.md"
```

Expected: command succeeds.

- [ ] **Step 4: Search for stale references**

Run no shell grep. Use the code search tool for these patterns:

```text
prompt-templates-inline.js
update/body-status-update-prompt.js
publish/update/body-status-update-prompt.md
prompts/story-agent-engine.md
prompts/real-world-engine.md
sync-prompt-templates-inline
```

Expected: no runtime references remain. References in historical docs under `docs/superpowers/plans/` are acceptable if they document old work, but tests and `publish/` runtime files must not reference stale paths.

---

### Task 5: Verify registries and update tests for new prompt locations

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify if needed: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: colocated generated scripts from Task 2.
- Produces: tests load generated prompt registration files from new locations where registry prompt content is inspected.

- [ ] **Step 1: Add a helper to load colocated prompt scripts if a test needs real registry text**

If tests need to inspect `updateRegistry.prompts[...]`, add this helper near `loadCore` in `tests/real-world-loop-update.test.js`:

```js
function loadPromptRegistrations(context) {
  [
    'publish/prompts/推演引擎/update/generic-update-prompt.js',
    'publish/prompts/推演引擎/update/emotion-update-prompt.js',
    'publish/prompts/推演引擎/update/feeling-update-prompt.js',
    'publish/prompts/推演引擎/update/vital-update-prompt.js',
    'publish/prompts/推演引擎/update/role-card-update-prompt.js',
    'publish/prompts/推演引擎/update/relationship-update-prompt.js',
    'publish/prompts/推演引擎/update/sexual-experience-update-prompt.js',
    'publish/prompts/推演引擎/update/sexual-history-update-prompt.js',
    'publish/prompts/推演引擎/update/body-status-update-prompt.js',
    'publish/prompts/推演引擎/update/wearing-state-update-prompt.js',
    'publish/prompts/推演引擎/update/item-update-prompt.js',
    'publish/prompts/推演引擎/update/faction-structure-update-prompt.js',
    'publish/prompts/推演引擎/update/faction-overview-update-prompt.js',
    'publish/prompts/推演引擎/update/map-update-prompt.js',
    'publish/prompts/推演引擎/update/system-update-prompt.js',
  ].forEach((file) => loadScript(context, file));
}
```

- [ ] **Step 2: Replace old prompt script loads in tests**

Find test code that loads old files such as:

```js
loadScript(context, 'publish/update/sexual-experience-update-prompt.js');
```

Replace each with the new path:

```js
loadScript(context, 'publish/prompts/推演引擎/update/sexual-experience-update-prompt.js');
```

If multiple prompt files are needed, use `loadPromptRegistrations(context)` after `loadScript(context, 'publish/update/update-registry.js')`.

- [ ] **Step 3: Add a direct registry smoke test**

Add this test near prompt filesystem tests:

```js
test('colocated generated update prompts register into updateRegistry', () => {
  const context = createContext();
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/prompts/推演引擎/update/body-status-update-prompt.js');
  const body = context.window.GameModules.updateRegistry.prompts['body-status-update'];
  assert.ok(body.includes('# body-status-update'));
});
```

- [ ] **Step 4: Add a direct stage registry smoke test**

Add this test near prompt filesystem tests:

```js
test('colocated generated stage prompts register into promptTemplates inline registry', () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage1-guided-query.js');
  const body = context.window.GameModules.promptTemplates.inline['inference-stage1-guided-query'];
  assert.ok(body.includes('查询规划'));
});
```

- [ ] **Step 5: Run target tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: PASS.

---

### Task 6: Full regression and review

**Files:**
- No source edits unless tests reveal a defect.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified clean prompt structure.

- [ ] **Step 1: Run full regression**

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: all tests PASS.

- [ ] **Step 2: Inspect git status**

Run:

```bash
git status --short
```

Expected: deleted old prompt compatibility files, added colocated generated prompt `.js` files, modified `publish/index.html`, `publish/prompt-templates.js`, `tools/sync-prompt-md.js` only if necessary, and tests.

- [ ] **Step 3: Request focused code review**

Ask a review agent to inspect:

```text
- No old runtime references to removed prompt paths.
- All 推演引擎 prompt `.md` files have colocated `.js` files.
- Generated scripts register to the same registries as before.
- Business update implementation files under publish/update/*.js remain intact.
- Tests protect cleanup and runtime registration.
```

Expected: no Critical or Important findings.

- [ ] **Step 4: Address review findings if any**

For each Critical/Important finding, add or update a failing test first, implement the smallest fix, then rerun:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: all tests PASS.

---

## Self-Review

- Spec coverage: The plan covers colocated `.md/.js`, deletion of old prompt stubs, runtime loading updates, generated registry preservation, and test coverage.
- Placeholder scan: No TBD/TODO placeholders are present; all file paths and command examples are explicit.
- Type consistency: Registry names remain `promptTemplates.inline`, `updateRegistry.registerPrompt`, and `initPromptSources`; generated script paths match `publish/index.html` paths.
- Scope check: Focused on prompt source/generated file cleanup only; existing business update implementation remains unchanged.
