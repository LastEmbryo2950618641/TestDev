# 2026-07-11 Platform Storage Local Settings Source Validation

## Scope
- Introduce `platform.core.storage.localSettingsSource` as the storage boundary for local settings.
- Move `publish/local-settings.js` read/write access onto the platform storage source.
- Move `publish/ui-theme-actions.js` bootstrap theme read onto the same platform storage source.
- Keep behavior unchanged while reducing direct browser storage coupling.

## Files checked
- `publish/platform/storage/local-settings-source.js`
- `publish/local-settings.js`
- `publish/ui-theme-actions.js`
- `publish/boot/script-manifest.js`

## Validation
1. New platform source exists:
   - `window.GameModules.platform.storage.localSettingsSource`
   - `window.GameModules.platform.core.storage.localSettingsSource`
2. Script manifest now loads `publish/platform/storage/local-settings-source.js` before consumers.
3. `publish/local-settings.js` no longer reads/writes `localStorage` directly for stored settings data; it delegates to `platform.core.storage.localSettingsSource`.
4. `publish/ui-theme-actions.js` bootstrap no longer reads `localStorage` directly; it delegates to `platform.core.storage.localSettingsSource`.
5. Syntax checks passed:
   - `node --check publish/platform/storage/local-settings-source.js`
   - `node --check publish/local-settings.js`
   - `node --check publish/ui-theme-actions.js`

## Result
- Local settings storage now has a dedicated `platform.core` entry.
- Browser-specific persistence details are pushed one layer deeper, improving compatibility for later desktop/mobile shells.
- Existing UI theme and activation/settings behavior remain unchanged at the call-site level.
