# Identity Goal System Tab Split Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split identity「人生目标」into「人生取向」+「长期目标」tabs with compact progress cards on the goal tab.

**Architecture:** Reuse `profile.goalSystem` and existing card chrome; separate `profileSections` by `profileGroup` / field roles; dual Alpine views (`lifeOrientation`, `goalSystem`).

**Tech Stack:** Vanilla JS modules, Alpine.js templates in `index.html`, `phone-desktop.css`.

## Global Constraints

- Do not change Stage4 settlement protocol or aspiration wizard step UI.
- Phone-frame goal track is always single column.
- Orientation tab must not show short/medium/long/achievements; goal tab must not show alignment/axes/psych.

---

### Task 1: Lexicon group + section split

**Files:**
- Modify: `publish/character-goal-system.js` (`lexiconFields` profileGroup → `长期目标`)
- Modify: `publish/player-aspiration-actions.js` (drop display row `目标` from lexicon, or keep only for seed sources — prefer remove from returned lexicon)
- Modify: `publish/player-identity-actions.js` (ensure goal lexicon uses group `长期目标`; do not mix into orientation)
- Modify: `publish/rpg-field-ui.js` (`profileSections`, `profileSectionTabMeta`, filter empty views)
- Test: `tests/identity-goal-tab-split.test.js`

- [ ] Split sections: `人生取向` view `lifeOrientation`; `长期目标` view `goalSystem`
- [ ] Tab meta: 取向 / 目标 / 偏好
- [ ] Tests for section titles and field exclusion
- [ ] Commit

### Task 2: Presentation + HTML + CSS

**Files:**
- Modify: `publish/rpg-field-ui.js` (`goalsPresentation` always show 0%/未设期限; add `lifeOrientationPresentation` or slim goals for orientation)
- Modify: `publish/index.html` (both identity surfaces)
- Modify: `publish/phone-desktop.css` (`.goals-panel.goal-system-panel .goals-track { grid-template-columns: 1fr }`)
- Run: existing `tests/character-goal-system.test.js` + new split test

- [ ] Orientation panel: hero + support cards only
- [ ] Goal panel: compact cards + achievements (max 5) + empty state
- [ ] Commit

### Task 3: Verify

- [ ] Run tests
- [ ] Spec checklist against design doc
