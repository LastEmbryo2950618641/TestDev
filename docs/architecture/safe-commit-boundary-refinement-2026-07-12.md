# Safe Commit Boundary Refinement (2026-07-12)

This note refines the first milestone commit boundary into file-pattern rules so staging can be executed safely.

## Primary Decision
- Do not clean legacy files before the first multi-platform milestone commit/push.
- First secure the architecture milestone in Git.
- After push, run cleanup in batches.

## Why Cleanup Must Wait
- Current browser, desktop, and Android flows still rely on a mix of shared runtime files and compatibility bridges.
- Some output/evidence directories are needed to prove the desktop and Android targets were actually reached.
- The current worktree includes temporary scripts, logs, and backup files that should be removed later, but they must not be mixed into the milestone commit.

## Stage-In Scope For First Milestone

### Include
- `desktop/README.md`
- `desktop/docs/`
- `desktop/shell/*.js`
- `desktop/shell/*.json`
- `desktop/shell/*.md`
- `desktop/shell/bridge/`
- `desktop/shell/runtime/` if present
- `desktop/shell/electron/` if present
- `mobile/README.md` if present
- `mobile/docs/` if present
- `mobile/shell/`
- `mobile/android-webview-shell/gradle/`
- `mobile/android-webview-shell/app/src/`
- `mobile/android-webview-shell/app/build.gradle`
- `mobile/android-webview-shell/build.gradle`
- `mobile/android-webview-shell/settings.gradle`
- `mobile/android-webview-shell/gradle.properties`
- `mobile/android-webview-shell/gradlew`
- `mobile/android-webview-shell/gradlew.bat`
- `mobile/android-webview-shell/local.properties.example`
- `publish/platform/`
- `publish/app/`
- `publish/domain/`
- changed shared runtime files under `publish/` that are required by the refactor landing
- architecture docs under `docs/architecture/`
- validation/roadmap docs under `docs/plans/` and `docs/requirements/` that explain the migration rules

### Exclude
- `desktop/shell/.artifacts/`
- `desktop/shell/.verify-storage/`
- `desktop/shell/dist/`
- `desktop/shell/dist-minimal/`
- `desktop/shell/node_modules/`
- `mobile/android-webview-shell/app/build/`
- `mobile/android-webview-shell/.artifacts/`
- `mobile/android-webview-shell/.gradle/`
- `mobile/android-webview-shell/local.properties`
- `mobile/android-webview-shell/local.properties.generated`
- root `logs/`
- root `tmp_*`
- `*.bak`
- any cache, packaged binary, or machine-local verification residue

## Cleanup Sequence After Push
1. Delete root `tmp_*` scripts.
2. Delete root logs and scratch backups.
3. Re-check whether any `.bak` files are still serving as manual rollback references.
4. Audit legacy compatibility layers under `publish/` and only remove paths that are proven unused.
5. Only after compatibility retirement is validated, clean surplus evidence/output directories if the repository should remain source-only.

## Practical Staging Strategy
- Prefer explicit `git add <file-or-dir>` on allowed paths.
- Never `git add desktop mobile` as whole directories.
- Run `git diff --cached --name-status` before commit and verify there are no build outputs or temporary files in the index.
