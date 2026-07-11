# Commit Scope Triage (2026-07-12)

This note defines what should be included in the next cleanup-oriented commit and what should stay out of it.

## Safe to include in the cleanup commit
### 1. Confirmed legacy removals
- `publish/predefined-role-cards_bak/`
- `publish/predefined-templete_bak/`
- `publish/prompts_bak/`
- `publish/prompts_bak2/`

### 2. Documentation governance updates
- `docs/README.md`
- `docs/architecture/legacy-cleanup-triage-2026-07-12.md`
- `docs/architecture/documentation-retention-triage-2026-07-12.md`
- `docs/architecture/next-cleanup-candidates-2026-07-12.md`
- `docs/architecture/host-documentation-triage-2026-07-12.md`
- `docs/architecture/validation-retention-split-2026-07-12.md`

### 3. Low-risk doc cleanup deletions
- removed low-value `docs/architecture/*` smoke-run / triage / quick-navigation files
- removed batches of repetitive `docs/plans/*validation*` files
- removed host-side draft docs under `desktop/docs/` and `mobile/docs/`

## Keep out of the cleanup commit for now
### 1. Runtime/build evidence
- `desktop/shell/.artifacts/`
- `desktop/shell/.verify-storage/`
- `desktop/shell/dist/`
- `desktop/shell/dist-minimal/`
- `mobile/android-webview-shell/.artifacts/`
- `mobile/android-webview-shell/.gradle/`
- `mobile/android-webview-shell/app/build/`
- `mobile/shell/.bridge-verify-storage/`
- `mobile/shell/.verify-storage/`

### 2. Environment/materialization files
- `mobile/android-webview-shell/local.properties`
- `mobile/android-webview-shell/local.properties.generated`
- machine-local Android SDK resolution files

### 3. Synced runtime assets and generated payloads
- large mirrored trees under `mobile/android-webview-shell/app/src/main/assets/publish/`
- temporary asset payloads and generated body-figure directories

## Commit strategy recommendation
1. Stage only cleanup docs plus confirmed legacy directory removals.
2. Do not stage evidence directories or generated mobile asset mirrors.
3. If needed, make a later separate commit for platform evidence or packaging outputs, not mixed with cleanup.
