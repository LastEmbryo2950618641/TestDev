# 2026-07-11 Mobile Runtime Entry Verification

## Scope
- Verify the mobile runtime entry optional real-call path with and without a runtime-like object.
- Keep verification shell-local and free of mobile SDK package dependencies.

## Files checked
- `mobile/shell/runtime-entry.js`
- `mobile/shell/runtime-entry-verify.js`

## Verification command
- `node mobile/shell/runtime-entry-verify.js`

## Expected behavior
1. Without a runtime-like object exposing both `attachWebView` and `loadRenderer`:
   - `canInvoke` should be `false`
   - invoking should return a descriptive non-invoked result
2. With a runtime-like object exposing `attachWebView(windowConfig)` and `loadRenderer(entry)`:
   - `canInvoke` should be `true`
   - invoking should return an invoked result
   - recorded calls should include window config and renderer entry

## Result
- The verification entry executed successfully.
- The mobile runtime entry now has an exercised baseline for both safe fallback and runtime-like invocation paths.
- This provides a low-risk stepping stone before any real mobile shell package integration.
