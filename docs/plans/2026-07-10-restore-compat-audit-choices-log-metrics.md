# 2026-07-10 Restore Compatibility Audit For Choices Log Metrics Ensure

## Goal

Audit the remaining high-risk restore items in `publish/storage.js` and determine what structural movement is safe without changing gameplay behavior.

Audited items:

- `choices`
- `log`
- `window.GameModules.metrics.ensure(store)`

## Evidence Summary

### choices

Current restore behavior:
- `store.choices = save.choices || store.choices`

Relevant normalization path found:
- `publish/ai.js` exposes `normalizeChoices(value, fallback)`

Key observation:
- the normalize path is used when AI output is ingested
- restore does **not** currently re-run that normalization on persisted choices

Implication:
- persisted choices are currently treated as already-authoritative payloads
- adding restore-time normalization would be a behavior change, not a pure structural move

### log

Current save behavior:
- `publish/storage.js` snapshots only the recent log window
- each saved log entry's `thinking` field is normalized at save time when `store.normalizeNovelThinking` exists

Current restore behavior:
- `store.log = save.log || store.log`

Key observation:
- restore currently trusts persisted log payloads exactly as stored
- there is no restore-time log reshaping pass today

Implication:
- adding restore-time log normalization or migration would alter historical payload compatibility and may affect story display/history semantics

### metrics.ensure(store)

Current restore behavior:
- called after `normalizeMetricState`
- called before `normalizeQuestIntentState`

Implementation behavior in `publish/metrics.js`:
- normalizes `store.emotions`
- normalizes `store.playerFeelings`
- ensures `temporaryEmotions` is an object
- ensures `temporaryPlayerFeelings` is an object
- migrates `metricNotes`

Key observation:
- this call is a runtime consistency/repair step for metric structures
- it does not touch `choices` or `log`

Implication:
- `metrics.ensure(store)` should be reasoned about as a metric-side computation/repair call, not as part of `choices/log` compatibility
- moving it is possible in the future, but only with order preservation relative to late runtime-state restoration

## Compatibility Decision For Now

Based on current evidence, the safest interpretation is:

- `choices`: keep raw restore behavior for now
- `log`: keep raw restore behavior for now
- `metrics.ensure(store)`: may be movable later, but not as part of a `choices/log` cleanup

## Recommended Next Action

Do **not** bundle the final remaining restore items into a single helper.

Instead:

1. keep `choices` raw until an explicit decision is made about restore-time choice normalization
2. keep `log` raw until a dedicated historical payload compatibility audit is performed
3. if continuing structural work, treat `metrics.ensure(store)` as a separate ordering-sensitive candidate, not as part of the same bucket

## Current Conclusion

The remaining inline restore code is now small because the hard part is no longer structural decomposition alone; it is compatibility policy.

That means the next correct move is not blind extraction, but an explicit compatibility decision for `choices` and `log`.
