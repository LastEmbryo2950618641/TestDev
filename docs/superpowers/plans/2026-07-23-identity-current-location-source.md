# Identity Current Location Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the identity dossier display exactly one current-location item sourced only from `profile.currentLocation`.

**Architecture:** Keep `values.current_location` unchanged for RPG use, but remove it from identity-dossier composition. Both explicit player identity fields and generic profile identity fields read `profile.currentLocation`; the identity section no longer appends the RPG field.

**Tech Stack:** Browser JavaScript, Alpine.js templates, Node.js `node:test` regression tests.

---

### Task 1: Lock the single-source behavior with regression tests

**Files:**
- Modify: `tests/predefined-role-card-selection.test.js`
- Test: `tests/predefined-role-card-selection.test.js`

- [ ] **Step 1: Write the failing tests**

Change the existing location test so a blank `profile.currentLocation` and populated `values.current_location` must produce `未记录`. Add a profile-section test asserting that a populated profile and a different RPG value produce exactly one identity location item containing the profile value.

```js
assert.strictEqual(field.value, '未记录');
assert.strictEqual(field.raw, '');

const locations = identity.fields.filter((item) => item.label === '当前位置');
assert.strictEqual(locations.length, 1);
assert.strictEqual(locations[0].value, '角色档案地址');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/predefined-role-card-selection.test.js`

Expected: FAIL because `identityTargetFields()` currently falls back to `values.current_location`, and `profileSections()` currently appends the RPG field as a second location.

### Task 2: Use only the role-profile location in the identity dossier

**Files:**
- Modify: `publish/player-identity-actions.js:101-113`
- Modify: `publish/rpg-field-ui.js:126-140`
- Modify: `publish/rpg-field-ui.js:246-278`
- Test: `tests/predefined-role-card-selection.test.js`

- [ ] **Step 1: Implement the minimal source change**

In `identityTargetFields()`, build the location row directly from `p.currentLocation`:

```js
row('currentLocation', '当前位置', p.currentLocation, '玩家当前位置来自角色卡 profile.currentLocation。')
```

In `profileIdentityFields()`, add the same profile-backed field for generic identity dossiers. In `profileSections()`, remove `current_location` from the RPG fields appended to the identity section:

```js
{ title: '身份信息', fields: [...identityRest, ...(longing ? [longing] : []), ...take(['world_tag', 'age', 'factions', 'memberships'])] }
```

- [ ] **Step 2: Run the focused test and verify GREEN**

Run: `node --test tests/predefined-role-card-selection.test.js`

Expected: all tests pass.

- [ ] **Step 3: Run related regression tests**

Run: `node --test tests/predefined-role-card-selection.test.js tests/role-card-json-app.test.js`

Expected: all tests pass with zero failures.

- [ ] **Step 4: Verify the final diff**

Run: `git diff --check && git diff -- publish/player-identity-actions.js publish/rpg-field-ui.js tests/predefined-role-card-selection.test.js`

Expected: no whitespace errors; the diff contains no changes to `values.current_location` storage or synchronization.

