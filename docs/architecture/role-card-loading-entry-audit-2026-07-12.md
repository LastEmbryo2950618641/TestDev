# Role Card Loading Entry Audit (2026-07-12)

This note classifies `publish/role-card-loading-actions.js` as the next likely thin-entry cleanup candidate after the settings legacy-block cleanup.

## Why this file is a strong next candidate
`publish/role-card-loading-actions.js` still owns a real state machine, so it is not deletable.
However, unlike many large gameplay files, it also contains a cluster of clearly presentation-shaped helpers mixed into the same top-level entry.

That makes it similar to earlier low-risk cleanup targets such as:
- `publish/loading-actions.js`
- `publish/save-actions.js`
- parts of `publish/settings-actions.js`

## Current responsibility split
### Keep in top-level entry for now
These still belong close to runtime mutation/orchestration:
- batch start / ensure / add card
- retry queue ownership
- per-card and per-step state mutation
- finish / error / close lifecycle
- source tracking and retry execution

### Likely presentation/helper candidates
These are strong candidates for helper-first extraction or explicit forwarding to a view helper surface:
- `roleCardLoadingSummary()`
- `roleCardLoadingProgressText()`
- `roleCardLoadingCardProgress(card)`
- `roleCardLoadingStepProgress(step)`
- `roleCardLoadingStatusText(status)`

## Existing helper foothold
A loading view helper surface already exists at:
- `publish/ui/loading/progress-view.js`

It already owns related loading presentation logic such as:
- duration formatting
- stage elapsed labels
- loading progress text
- role-card loading progress percent

This means the project already has an accepted destination for loading-related presentation helpers.

## Safer next-step path
1. Keep the role-card loading state machine in `publish/role-card-loading-actions.js`.
2. First move or forward only the pure presentation helpers.
3. Reuse `publish/ui/loading/progress-view.js` if the semantics stay aligned.
4. Avoid touching retry/orchestration/state ownership in the same pass.

## Practical recommendation
Treat `publish/role-card-loading-actions.js` as the best next cleanup line if the goal is to continue:
- low-coupling refactor
- helper-first extraction
- small, provable cleanup slices
- no gameplay-rule changes