# Encoding Stability Follow-up (2026-07-12)

This note records a small encoding-stability repair slice applied after repeated malformed display strings started blocking safe helper-first refactors.

## Why this follow-up was needed
- several UI helper files contained legacy mojibake / broken Chinese literals
- in at least one case (`publish/worldline-actions.js`), malformed strings had already broken syntax verification
- leaving these issues in place would slow future refactors and make verification less trustworthy

## Files repaired in this slice
- `publish/ui/calendar/view-helpers.js`
- `publish/ui/loading/progress-view.js`

## Repair scope
- fix malformed Chinese display literals only
- keep runtime behavior and data flow unchanged
- avoid expanding the pass into gameplay, persistence, or platform logic

## Examples of repaired literals
- calendar weekday labels and panel copy
- calendar fallback text such as `未命名日程` and `时间待确认`
- loading stage status text such as `等待中` / `加载中` / `完成` / `失败`
- role-card-loading summary labels such as `身份补全` / `玩家卡` / `角色卡`

## Verification performed
- `node --check publish/ui/calendar/view-helpers.js`
- `node --check publish/ui/loading/progress-view.js`

## Practical implication
Encoding-stability work should continue as a narrow maintenance slice when malformed literals actively reduce readability or break verification, but it should remain separate from broader gameplay or platform refactors.
