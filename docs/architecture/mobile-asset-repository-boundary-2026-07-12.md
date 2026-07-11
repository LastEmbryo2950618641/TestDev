# Mobile Asset Repository Boundary (2026-07-12)

This note records which Android asset copies are suitable for the first source milestone commit and which should be treated as generated/runtime residue.

## Decision
- Keep source-worthy static Android shell assets in the repository.
- Do not exclude curated generated assets merely because their filenames are hashed.
- Exclude obvious runtime-generated, player-generated, or temporary payloads from the first architecture milestone commit whenever they are not required as canonical source assets.

## Safe To Review For Commit
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`
- canonical static assets under:
  - `mobile/android-webview-shell/app/src/main/assets/publish/assets/body-silhouettes/`
  - `mobile/android-webview-shell/app/src/main/assets/publish/assets/data/`
  - `mobile/android-webview-shell/app/src/main/assets/publish/assets/generated/`
- curated body-figure packs that are part of the shared source asset set
- Android Java/Kotlin source, manifest, and resource scaffolding

## Hold / Review Before Commit
These paths look generated at runtime, player-specific, or temporary and should not be staged blindly.

- `mobile/android-webview-shell/app/src/main/assets/publish/assets/all`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/tmp.txt`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/tmp2.txt`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/tmp3`
- dynamic body-figure directories such as:
  - `player-self-*`
  - `rel-ai-*`

## Staging Rule
- Do not stage the entire `app/src/main/assets/publish/assets/` tree as a single unit.
- Stage reviewed static subtrees.
- Treat dynamic or temporary asset copies as cleanup candidates after the canonical source location is confirmed.

## Follow-Up
- Confirm whether Android should consume curated assets directly from a canonical shared source directory in future cleanup work.
- If yes, retire duplicated dynamic asset copies from the shell tree after compatibility verification.
