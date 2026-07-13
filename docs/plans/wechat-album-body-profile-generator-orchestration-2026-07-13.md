# WeChat Album Body Profile Generator Orchestration Plan (2026-07-13)

## Goal

Move `openBodyProfileImageGenerator()` out of the legacy album action facade
while preserving target resolution, body-figure context, prompt-dialog state,
and prompt-editor invocation.

## Boundary

- New owner: `publish/app/wechat/album-body-profile-generator-orchestration.js`.
- Compatibility owner: `publish/wechat-album-actions.js` keeps the public
  method and forwards the original context and arguments.
- Existing body-figure helpers continue to own kind and target-state lookup.
- Existing body-figure-context helper continues to own context object shape.
- Existing prompt-editor orchestration continues to own profile preparation and
  draft setup.

## Preserved Sequence

1. Resolve image kind from the section.
2. Resolve the target state from the section.
3. Resolve the contact using target state ID, identity target ID, then
   `player-self` fallback.
4. Set the selected contact to the resolved contact ID.
5. Create and store body-figure context from section, contact, and kind.
6. Open the prompt dialog and clear prompt-editor error state.
7. Await the existing prompt-editor opener with the resolved kind.

## Verification

- Facade test proves context and section arguments are forwarded.
- Player-target flow verifies all lookups and state assignments.
- Fallback flow verifies `player-self` is used when no target state exists.
- Existing body-figure target integration test remains unchanged as regression
  evidence.

## Stop Point

Do not move body-profile kind/target helper logic, prompt-editor preparation,
image generation, asset persistence, avatar capture, or game save behavior in
this slice.
