# 2026-07-10 Late Restore Choices Log Panel Check

## Goal

Inspect the remaining late-restore fields in `publish/storage.js` and determine whether they can be safely extracted without changing gameplay behavior.

Checked fields:

- `choices`
- `log`
- `rpgPanelCharacterId`

## Evidence Found

### choices

Current restore behavior:
- `store.choices = save.choices || store.choices`

Relevant normalization logic exists elsewhere:
- `publish/ai.js` provides `normalizeChoices(value, fallback)`

Implication:
- restore currently does not normalize saved choices
- changing restore to normalize choices would be a gameplay-adjacent behavior change, not a pure structural move

### log

Current save behavior:
- `publish/storage.js` snapshots `store.log.slice(-30)` and normalizes each entry's `thinking` through `store.normalizeNovelThinking` when available

Current restore behavior:
- `store.log = save.log || store.log`

Implication:
- restore currently trusts persisted log payloads as-is
- adding restore-time log normalization would change historical log handling and may affect story display compatibility

### rpgPanelCharacterId

Current restore behavior:
- `store.rpgPanelCharacterId = save.rpgPanelCharacterId || store.selectedCharacterId`

Observed initialization behavior:
- `publish/game.js` default is empty string
- `publish/actions.js` new-game flow sets it to `selectedCharacterId`

Implication:
- this field behaves like a simple fallback pointer and appears much safer than `choices` or `log`

## Conclusion

The remaining late-restore fields are not equally safe to extract:

- `choices`: medium risk because a dedicated normalization path exists elsewhere, but restore does not currently use it
- `log`: highest risk because save-time shaping exists, while restore intentionally reuses persisted payloads as-is
- `rpgPanelCharacterId`: lowest risk because current behavior is a simple fallback assignment

## Recommended Next Step

If continuing with the same low-risk structural strategy, prefer:

1. extract only `rpgPanelCharacterId` as a tiny deterministic helper, or
2. leave the final three fields in place until a later focused compatibility audit

Do not automatically bundle `choices` and `log` into a helper unless we first decide whether restore should remain byte-for-byte compatible with existing saved payload shapes.
