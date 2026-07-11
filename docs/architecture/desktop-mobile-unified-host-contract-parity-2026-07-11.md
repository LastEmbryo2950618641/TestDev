# 2026-07-11 Desktop Mobile Unified Host Contract Parity Addendum

## New parity milestone
Desktop and mobile now both expose a shell-local unified host contract layer.

### Desktop
- `desktop/shell/unified-host-contract.js`
- `desktop/shell/unified-host-contract-verify.js`

### Mobile
- `mobile/shell/unified-host-contract.js`
- `mobile/shell/unified-host-contract-verify.js`

## Shared structural meaning
Both platforms now have one shell-local authority that aggregates:
- host manifest or bootstrap shape
- runtime binding output
- runtime adapter output
- runner or execution sequencing
- host behavior mapper

## Why this is important
This moves the project from “matching layered drafts” to “matching single host authority contracts”.
That is a stronger foundation for later extracting a shared runtime contract without forcing Electron and WebView semantics into the same file today.

## Constraint preserved
- No gameplay module in `publish/*` was rewritten for this milestone.
- Platform-specific behavior is still contained inside `desktop/shell/*` and `mobile/shell/*`.
