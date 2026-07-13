# 2026-07-11 Mobile Runtime Like Integration Verification

## Scope
- Verify mobile runtime entry optional real-call behavior together with the mobile host runner against the same runtime-like object.
- Keep verification shell-local and free of mobile SDK package dependencies.

## Files checked
- `mobile/shell/runtime-entry.js`
- `mobile/shell/host-runner.js`
- `mobile/shell/runtime-like-integration-verify.js`

## Verification command
- `node mobile/shell/runtime-like-integration-verify.js`

## Expected behavior
1. The same runtime-like object should support:
   - `attachWebView(windowConfig)`
   - `loadRenderer(entry)`
2. Mobile runtime entry optional real-call should:
   - report `canInvoke = true`
   - invoke `attachWebView(...)`
   - invoke `loadRenderer(...)`
3. Mobile host runner should still expose:
   - runtime
   - readiness
   - expose namespace
   - renderer entry
4. The recorded calls should show that mobile runtime entry and host runner can cooperate with the same runtime-like integration surface.

## Result
- The verification entry executed successfully.
- Mobile runtime entry and host runner now have a shared runtime-like verification baseline.
- This is the first step beyond isolated mobile entry validation toward a more realistic mobile host integration path.
