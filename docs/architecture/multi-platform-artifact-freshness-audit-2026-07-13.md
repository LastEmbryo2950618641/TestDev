# Multi-Platform Artifact Freshness Audit (2026-07-13)

## Scope

This audit verifies that the current shared runtime is consumable by Web,
Android, and Windows packaging paths. It distinguishes source/runtime evidence
from the existence of an older binary.

The audit base was commit `734ec310` on `dev-refactor`, followed by the
packaging fixes recorded in this change set.

## Shared Runtime

- `publish/` remains the single gameplay runtime source.
- Web loads it directly.
- Android mirrors only the managed runtime inputs into
  `mobile/android-webview-shell/app/src/main/assets/publish/`.
- Electron Builder copies it into
  `desktop/shell/dist/win-unpacked/resources/app/publish/`.
- Stage5 prompt registrations are bundled into the ASCII-safe
  `inference-prompts-runtime.js` runtime file.
- The editable prompt sources remain under `publish/prompts/推演引擎/`.

## Android Evidence

Commands:

```text
npm run android:sync-assets
npm run android:assemble-debug
npm run verify:android:apk-assets
```

Evidence from the rebuilt debug APK:

- Gradle `:app:assembleDebug` completed successfully.
- The APK contains every managed local runtime file.
- Missing runtime paths: `0`.
- Duplicate runtime paths: `0`.
- Non-ASCII packaged runtime paths: `0`.
- Missing Stage5 prompt registrations: `0`.

The ASCII-path gate is required because the Windows Android packaging toolchain
did not set the ZIP UTF-8 filename flag for the former Chinese runtime paths.
Keeping editable Chinese prompt sources while bundling their registrations into
an ASCII runtime file avoids changing prompt ownership or behavior.

This slice proves build and package integrity. It does not claim a new physical
device or emulator playthrough.

## Windows Evidence

Commands:

```text
npm run desktop:build:dir
npm run verify:desktop:package
```

Evidence from the rebuilt unpacked package:

- Electron Builder `26.15.3` packaged Electron `36.9.5` successfully.
- `738` source files under `publish/` matched the packaged copies by SHA-256.
- Missing packaged files: `0`.
- Mismatched packaged files: `0`.
- The packaged `Gamefy.exe` was launched with the controlled validation flag.
- Window creation, preload exposure, storage attachment, and renderer loading
  all reported `true`.
- The renderer entry resolved to the packaged
  `resources/app/publish/index.html`, not the workspace source tree.

The desktop package intentionally uses `asar: false`, so the authoritative
resource target is `resources/app/`, not `resources/app.asar`.

The `--dir` build is an unpacked executable tree. It proves the packaged Windows
runtime; it is not yet an installer or signed release artifact.

## Web Evidence

Commands:

```text
npm run validate:control:file
npm run validate:control:http
```

Both modes completed the controlled browser flow with:

- runtime start and online state available;
- active control target shared across the expected state surfaces;
- story loop and memory flow available;
- save, settings, company, and WeChat APIs available;
- no page errors, bad responses, or unexpected issues.

The validation intentionally runs without a DeepSeek API key. Authentication
warnings are counted as expected offline behavior and do not prove live AI
provider connectivity.

## Repeatable Root Commands

```text
npm run build:multi-platform
npm run verify:multi-platform
```

`build:multi-platform` synchronizes Android assets, builds the debug APK, and
builds the unpacked Windows package. `verify:multi-platform` runs shared gates,
both Web launch modes, APK package checks, and the packaged EXE launch check.

## Remaining Distribution Boundaries

- Android still needs a fresh emulator or physical-device smoke run for final
  distribution confidence.
- Windows still needs a portable/installer release build, icon, signing, and
  release-channel checks if it is to be distributed outside development.
- Build outputs remain local generated artifacts unless repository policy is
  explicitly changed; source and reproducible build gates are the tracked
  deliverables.
