# WeChat Memory Debug Orchestration Extraction - 2026-07-13

## Goal

Move WeChat memory debug and inspection logic out of the top-level legacy action entry while keeping the existing public `$store.game` methods stable.

## Boundary

- `publish/app/wechat/memory-debug-orchestration.js` owns debug report generation, SQLite memory/archive inspection, and runtime worldline fallback logic.
- `publish/wechat-memory-debug-actions.js` remains the public compatibility facade.

## Public Methods Preserved

- `debugWechatMemory(contact)`
- `sqliteWechatMemory(characterId)`
- `sqliteWechatWorldline()`
- `memoryDebugRuntimeWorldline()`
- `sqliteWechatArchiveCount(characterId)`

## Compatibility Rule

Do not delete `publish/wechat-memory-debug-actions.js` yet. It is still merged into the central game store and is used by the current debug flows.

## Verification

Runtime dependency verification now requires `app/wechat/memory-debug-orchestration.js` to load before `wechat-memory-debug-actions.js` in Web and Android manifests.
