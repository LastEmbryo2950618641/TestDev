# Legacy Runtime Migration Readiness Checklist (2026-07-12)

This checklist captures the current preconditions for future cleanup of legacy runtime entry files without breaking gameplay, compatibility, or multi-platform reuse.

## Why this checklist is needed
The project now has clearer structure under:
- `publish/platform/`
- `publish/ui/`
- `publish/domain/`
- `desktop/`
- `mobile/`

However, the root `publish/` tree still contains many historically active top-level entry files.
These files cannot be treated as dead code simply because newer structure exists.
A safe cleanup pass needs explicit readiness checks first.

## Current evidence
### 1. compatibility-first guidance already exists
Current plans and validations repeatedly rely on:
- compat entry retention
- facade-based rollout
- thin forwarding while callers migrate

### 2. root publish still contains many active top-level files
The current `publish/` root still includes many action, state, bootstrap, and app files that may continue to serve as compatibility surfaces.

### 3. host/platform work has advanced faster than legacy runtime cleanup
Desktop/mobile/platform governance has progressed, but that does not by itself prove the old top-level runtime surfaces are fully unreferenced.

## Required readiness checks before future legacy cleanup
### A. caller migration proof
Before deleting or hard-collapsing a legacy top-level file, confirm:
1. its live consumers are known
2. those consumers have been redirected to the newer structured surface
3. any remaining old entry only acts as a thin compat facade

### B. gameplay safety proof
Confirm the target file is not still a hidden runtime hinge for:
- gameplay actions
- save/load flow
- worldline flow
- real-world map flow
- wechat flow
- platform bootstrap expectations

### C. multi-platform safety proof
Confirm cleanup does not break assumptions used by:
- browser runtime entry
- desktop shell packaging/runtime assembly
- Android mirrored runtime assembly

### D. verification proof
Before removal or deep collapse, prepare at least one of:
- targeted caller search evidence
- compat facade validation
- module-level verification note
- runtime smoke validation covering the affected surface

## Safe cleanup order
1. identify legacy top-level files that already behave like facades
2. confirm caller migration or forwarding behavior
3. thin them further if needed
4. only then consider deletion or deeper consolidation

## What should not happen
1. do not delete top-level `publish/` files merely because a newer folder exists
2. do not mix legacy cleanup with broad gameplay changes
3. do not treat platform governance progress as proof that runtime callers are gone
4. do not clean by file-name aesthetics alone

## Recommended next step
The safest next move is not deletion.
The safest next move is to build a small legacy-runtime candidate list of files that already appear closest to facade status, then verify them one by one.
