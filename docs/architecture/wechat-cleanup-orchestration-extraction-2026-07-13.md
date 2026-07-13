# WeChat Cleanup Orchestration Extraction - 2026-07-13

## Goal

Move WeChat cleanup logic out of the top-level legacy action entry while keeping the existing public `$store.game` methods stable.

## Boundary

- `publish/app/wechat/cleanup-orchestration.js` owns cleanup version gating, worldline cleanup, memory cleanup, and cleanup state persistence.
- `publish/wechat-cleanup.js` remains the public compatibility facade.

## Public Methods Preserved

- `run(store)`
- `isOldWechatText(text)`
- `cleanWorldline(store)`
- `cleanMemories(save)`
- `cleanMemoryObject(memory)`

## Compatibility Rule

Do not delete `publish/wechat-cleanup.js` yet. It is still called from `publish/app/storage/restore-post-flow.js`.

## Verification

Runtime dependency verification now requires `app/wechat/cleanup-orchestration.js` to load before `wechat-cleanup.js` in Web and Android manifests.
