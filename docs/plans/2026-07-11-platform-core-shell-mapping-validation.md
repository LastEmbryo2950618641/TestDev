# 2026-07-11 Platform Core Shell Mapping Validation

## Scope
- Create desktop/mobile-specific platform core mapping documents.
- Connect shared `platform.core` contract, shell strategy, and per-shell mapping docs into one usable index.
- Keep current runtime entry unchanged.

## Files checked
- `desktop/docs/platform-core-mapping.md`
- `mobile/docs/platform-core-mapping.md`
- `docs/architecture/platform-core-shell-mapping-index-2026-07-11.md`

## Validation
1. `desktop/docs/platform-core-mapping.md` now defines recommended desktop responsibilities and landing locations for:
   - `platform.core.host`
   - `platform.core.files`
   - `platform.core.storage`
   - `platform.core.assets`
   - `platform.core.keys`
2. `mobile/docs/platform-core-mapping.md` now defines recommended mobile responsibilities and landing locations for the same core domains.
3. `docs/architecture/platform-core-shell-mapping-index-2026-07-11.md` links:
   - shared `platform.core` contract
   - multi-platform host strategy
   - desktop/mobile mapping docs
4. Both shell mappings keep the same rule:
   - shared gameplay modules continue to depend on `platform.core.*`
   - shell-specific adapters belong inside shell directories
5. Current runtime remains unchanged:
   - `publish/index.html` is still the only real running entry.
   - No gameplay module was moved into shell mapping docs or shell bridge paths.

## Result
- Future desktop/mobile shell implementation now has explicit per-domain mapping guidance.
- `platform.core` has progressed from shared contract to concrete shell-side implementation guidance.
- This reduces future implementation ambiguity while preserving the current gameplay runtime path.
