# 2026-07-11 Platform Storage SQLite Slot Source Validation

## Scope
- Introduce `platform.core.storage.sqliteSlotSource` as the browser fallback boundary for SQLite slot persistence.
- Move `publish/sqlite-save.js` localStorage fallback reads/writes/removes onto the new platform storage source.
- Keep `dzmm.kv` behavior unchanged.

## Files checked
- `publish/platform/storage/sqlite-slot-source.js`
- `publish/sqlite-save.js`
- `publish/boot/script-manifest.js`

## Validation
1. New platform source exists:
   - `window.GameModules.platform.storage.sqliteSlotSource`
   - `window.GameModules.platform.core.storage.sqliteSlotSource`
2. Script manifest now loads `publish/platform/storage/sqlite-slot-source.js` before `sqlite-save.js` consumers rely on it.
3. `publish/sqlite-save.js` no longer directly calls browser `localStorage` in fallback slot persistence paths:
   - `readRaw(slot)` delegates to `platform.core.storage.sqliteSlotSource.read(key)`
   - `writeRaw(slot, value)` delegates to `platform.core.storage.sqliteSlotSource.write(key, value)`
   - `deleteSlot(slot)` delegates to `platform.core.storage.sqliteSlotSource.remove(key)`
4. `dzmm.kv` branch remains unchanged and still has priority when available.
5. Syntax checks passed:
   - `node --check publish/platform/storage/sqlite-slot-source.js`
   - `node --check publish/sqlite-save.js`

## Result
- Browser fallback persistence for SQLite slot storage is now routed through a dedicated `platform.core.storage` boundary.
- Save-system behavior remains unchanged while platform-specific storage details are further isolated for later desktop/mobile shell implementations.
