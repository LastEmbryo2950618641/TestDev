# Legacy Cleanup Triage

This document classifies current cleanup candidates without deleting any files.

## Goal
- Preserve the shared runtime in `publish/`
- Avoid deleting any file that still participates in browser, desktop, or Android execution
- Separate safe cleanup candidates from legacy-but-still-useful compatibility layers

## Class A: Must Keep Now
These are active runtime or evidence-carrying paths and should not be cleaned during the current multi-platform stabilization phase.

- `publish/`
  - authoritative shared gameplay/runtime chain
  - still loaded by browser, desktop, and Android hosts
- `desktop/shell/dist/`
- `desktop/shell/dist-minimal/`
  - real desktop packaging artifacts
- `desktop/shell/.artifacts/`
  - current desktop execution and packaging evidence
- `mobile/android-webview-shell/app/build/`
  - current Android APK output and build evidence
- `mobile/android-webview-shell/.artifacts/`
  - current Android shell evidence
- `mobile/android-webview-shell/local.properties`
- `mobile/android-webview-shell/local.properties.generated`
  - current Android SDK/materialization evidence

## Class B: Keep But Mark As Legacy / Compatibility
These should not be deleted immediately, but new work should avoid expanding them unless needed for compatibility.

- old compatibility entry files under `publish/` that still bridge callers into newer structure
- `publish/*_bak` directories:
  - `publish/predefined-role-cards_bak`
  - `publish/predefined-templete_bak`
  - `publish/prompts_bak`
  - `publish/prompts_bak2`
- compatibility mentions already visible in runtime docs and manifests, for example:
  - `publish/update/generic-update-compat.js`
  - compatibility-oriented aggregator entry notes inside `publish/ui/...`

## Class C: Cleanup Candidates Requiring Reference Check
These look removable eventually, but should be reference-checked before deletion.

- backup directories under `publish/` that may still serve as manual rollback material
- old compatibility shells whose callers have not yet been fully migrated
- generated logs or snapshot evidence that might still be referenced by current reports

## Class D: First-Batch Safe Delete Candidates
These are the best initial cleanup targets after an explicit cleanup pass is approved.

Root-level temporary scripts:
- `tmp_fix_event_prompt_literals.js`
- `tmp_fix_event_quote.js`
- `tmp_fix_faction_membership_literals.js`
- `tmp_fix_faction_node_name.js`
- `tmp_fix_faction_quote_lines.js`
- `tmp_fix_faction_rolecard_reasons.js`
- `tmp_fix_faction_role_literals.js`
- `tmp_fix_faction_stub_init.js`
- `tmp_fix_faction_sync_literals.js`
- `tmp_fix_index_encoding.js`
- `tmp_fix_map_summary.js`
- `tmp_fix_realworld_block.js`
- `tmp_insert_local_settings_source_manifest.js`
- `tmp_insert_sqlite_slot_source_manifest.js`
- `tmp_patch_event_detail.js`
- `tmp_patch_event_panel_template.js`
- `tmp_patch_event_panel_view.js`
- `tmp_patch_faction_changelog_section.js`
- `tmp_patch_faction_changelog_template.js`
- `tmp_patch_faction_overview_helper.js`
- `tmp_patch_faction_relation_section.js`
- `tmp_patch_faction_relation_template.js`
- `tmp_patch_index_bootstrap_local_settings_source.js`
- `tmp_patch_index_strings.js`
- `tmp_patch_local_settings_storage_source.js`
- `tmp_patch_map_panel_view.js`
- `tmp_patch_readme_shell_dirs.js`
- `tmp_patch_realworld_blocks.js`
- `tmp_patch_settings_providers.js`
- `tmp_patch_settings_sections.js`
- `tmp_patch_sqlite_save_storage_source.js`
- `tmp_patch_ui_theme_bootstrap.js`
- `tmp_repair_settings_model_provider_block.js`
- `tmp_restore_index_raw.js`
- `tmp_rewrite_event_detail.js`
- `tmp_rewrite_faction_overview.js`
- `tmp_rewrite_realworld_ranges.js`
- `tmp_update_interior_panel.js`
- `tmp_update_map_shell.js`

## Recommended Cleanup Order
1. Do not delete runtime/evidence directories while Android device install validation is still pending.
2. First cleanup pass should target only Class D temporary root scripts.
3. Second cleanup pass should review Class B and C with explicit reference checks.
4. Final cleanup pass can happen after multi-platform validation is considered stable enough to retire compatibility leftovers.
