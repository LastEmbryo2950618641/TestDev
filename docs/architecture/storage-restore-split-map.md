# Storage Restore Split Map 2026-07-10

## Purpose

This document records the current layered structure of `publish/storage.js#restore(store, save)` so future sessions can continue the refactor from evidence instead of re-discovering which parts are already safe to move.

It answers four questions:

1. what restore responsibilities already moved out of `storage.js`
2. what still remains inside `storage.js`
3. which ordering constraints must be preserved
4. which remaining fields are currently considered high-risk and why

## Current High-Level Split

The restore flow is now intentionally split across three layers:

- `publish/storage.js`
  - still owns the top-level `restore(store, save)` flow and final return behavior
- `publish/domain/storage/restore-state-helpers.js`
  - owns deterministic restore-time normalization rules
- `publish/app/storage/restore-post-flow.js`
  - owns restore-time side-effect sequencing after normalized state is present

## Current Restore Order

Current order inside `publish/storage.js` is:

1. `normalizePlayerIdentityState`
2. `normalizeWechatProfileState`
3. `normalizeSettingsState`
4. `normalizeControlExperienceConfigState`
5. `normalizeRealWorldState`
6. `applyNonFieldSideEffects`
7. `normalizeAppPanelState`
8. `if (!save.started) return false`
9. `normalizeEntrySceneControlState`
10. `normalizeEmotionState`
11. `normalizeMetricState`
12. `window.GameModules.metrics.ensure(store)`
13. `normalizeQuestIntentState`
14. raw restore of `choices`
15. raw restore of `log`
16. `normalizeRpgPanelState`
17. `store.started = true`
18. `return true`

This order should be treated as authoritative unless there is explicit evidence that a reorder is safe.

## Current Domain Layer Responsibilities

`publish/domain/storage/restore-state-helpers.js` currently owns the following deterministic restore rules:

### Player / phone / identity

- `normalizePlayerIdentityState`
  - `phoneSetupDone`
  - `phoneFixedTime`
  - `playerProfile`
  - `playerAspiration`
  - `playerName`
  - `roleCardSetup`

### Wechat / body-figure profile state

- `normalizeWechatProfileState`
  - `wechatUsers`
  - `wechatMessagesByContact`
  - `wechatAlbumPhotos`
  - `wechatAlbumPrompts`
  - `bodyFigureMaskState`

### Settings / control experience config

- `normalizeSettingsState`
  - local key retention
  - provider/base-url/model defaults
  - stage1 iteration normalization
  - activation text-model normalization
- `normalizeControlExperienceConfigState`
  - config normalization
  - preview items regeneration

### Real-world state

- `normalizeRealWorldState`
  - `realWorldThinkMode`
  - `realWorldSceneTitle`
  - `realWorldLocationName`
  - `realWorldMap`
  - `realWorldQuest`
  - `realWorldStatus`
  - `realWorldChoices`
  - `realWorldLog`
  - `realWorldLongingEvents`
  - `realWorldlineState`
  - `realWorldSystemRecords`
  - `realWorldAgentKvByMode`
  - `characterSchedules`
  - `orgTerritoryReconciliationLog`
  - `orgTerritoryConsistency`

### App panel closed-safe state

- `normalizeAppPanelState`
  - `companyState`
  - `bossState`
  - `calendarState`
  - `eventState`
  - `factionState`
  - `taobaoState`
  - `solidifyState`

### Late runtime contextual state

- `normalizeEntrySceneControlState`
  - `selectedWork`
  - `selectedCharacterId`
  - `characterAge`
  - `entryTime`
  - `entryCalendar`
  - `entryCurrentAction`
  - `controlMode`
  - `online`
  - `turn`
  - `sceneTitle`

### Late runtime emotion state

- `normalizeEmotionState`
  - `mood`
  - `trust`
  - `resistance`
  - `emotions`
  - `playerFeelings`
  - `temporaryEmotions`
  - `temporaryPlayerFeelings`

### Late runtime metric fields

- `normalizeMetricState`
  - `metricsReady`
  - `metricNotes`

### Late runtime quest / intent state

- `normalizeQuestIntentState`
  - `quest`
  - `mindText`
  - `feedbackSource`
  - `characterIntent`

### Late runtime RPG panel pointer

- `normalizeRpgPanelState`
  - `rpgPanelCharacterId`

## Current App Layer Responsibilities

`publish/app/storage/restore-post-flow.js` currently owns restore-time side effects:

- `window.GameModules.runtimeConfig?.applyToStore?.(store)`
- `window.GameModules.realWorldMap?.ensure?.(store, store.playerProfile || {})`
- `window.GameModules.platform.storage.realWorldLogSource.saveAll?.(store.realWorldLog)`
- `window.GameModules.wechatCleanup?.run?.(store)`
- `store.initEventSystem?.()`
- `store.initFactionSystem?.()`
- `window.GameModules.orgTerritory?.validateWorldConsistency?.(store)`
- `store.initTaobaoApp?.()`

These should stay out of `domain/storage` because they are sequencing side effects, not state-shaping rules.

## What Still Remains In storage.js

At this point, the meaningful restore logic still left inline inside `publish/storage.js` is very small:

- top-level null guard
- top-level restore order orchestration
- `if (!save.started) return false`
- `window.GameModules.metrics.ensure(store)`
- raw restore of `choices`
- raw restore of `log`
- `store.started = true`
- final `return true`

## Current Ordering Constraints

The following constraints are important and should not be broken casually:

### 1. Real-world normalization before post-flow side effects

`normalizeRealWorldState` must remain before `applyNonFieldSideEffects` because the post-flow uses values such as:

- `store.realWorldMap`
- `store.realWorldLog`

### 2. Metric field restore before metrics.ensure

`normalizeMetricState` must remain before `window.GameModules.metrics.ensure(store)` so the ensure pass reads the restored metric flags/notes.

### 3. save.started gate before late runtime groups

The `if (!save.started) return false` gate must remain before late gameplay/runtime state groups.

### 4. choices/log still treated as raw payload restore

Current behavior restores:

- `store.choices = save.choices || store.choices`
- `store.log = save.log || store.log`

without additional restore-time normalization.

Do not change this accidentally while performing structural refactors.

## Current High-Risk Remaining Fields

### choices

Risk level: medium

Why:
- `publish/ai.js` has `normalizeChoices`, but restore currently does not use it
- changing restore to normalize choices would alter historical payload handling, not just module structure

### log

Risk level: high

Why:
- save-time snapshot already shapes log entries and normalizes `thinking`
- restore currently trusts persisted payloads as-is
- adding restore-time shaping may alter story history compatibility or display behavior

### metrics.ensure(store)

Risk level: medium

Why:
- this is not a plain field restore; it is a follow-up runtime computation/consistency call
- moving it requires preserving exact ordering relative to late runtime state fields

## Recommended Next Strategy

Preferred next steps are:

1. keep using `restoreStateHelpers` for deterministic field normalization only
2. keep using `restorePostFlow` for restore-time side effects only
3. defer any `choices` / `log` extraction until there is an explicit compatibility decision
4. if moving `metrics.ensure(store)`, do so only with a focused ordering audit

## Current Conclusion

The restore refactor is no longer an abstract plan.

It now has a real layered structure with:

- a domain normalization layer
- an app sequencing layer
- a thin but still authoritative top-level restore flow

The only remaining late-restore fields still inline are there for a reason and should be treated as deliberate holdouts, not forgotten leftovers.
