# Text AI Provider Abstraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple text-model requests from the dzmm runtime so the app can run without dzmm and switch text providers between dzmm and DeepSeek from app settings.

**Architecture:** Introduce a provider layer under `window.GameModules` that normalizes `listModels` and `complete` for text requests. Keep existing game/business modules calling `window.GameModules.aiRequest.complete(...)`, but make `aiRequest` delegate to the selected provider. Persist provider choice and provider credentials/settings in the existing save/settings state, while leaving image generation paths untouched for now.

**Tech Stack:** Plain browser JavaScript, Alpine store state, existing static app architecture, OpenAI-compatible DeepSeek HTTP API.

---

## File Map

- Modify: `C:/Users/liuqi/Documents/TestDev/publish/config.js`
  - Add default text provider configuration and default model IDs for provider-aware selection.
- Create: `C:/Users/liuqi/Documents/TestDev/publish/ai-provider.js`
  - Provider registry, provider resolution, request helpers, shared error normalization.
- Create: `C:/Users/liuqi/Documents/TestDev/publish/ai-provider-dzmm.js`
  - Adapter for dzmm text model listing and completions.
- Create: `C:/Users/liuqi/Documents/TestDev/publish/ai-provider-deepseek.js`
  - Adapter for DeepSeek model listing and OpenAI-compatible chat completions.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/index.html`
  - Load provider modules before `ai-request.js`; update settings UI for provider selection and DeepSeek API key/base URL/model guidance.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/game.js`
  - Extend `settingsState` with provider and DeepSeek text settings.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/storage.js`
  - Persist/restore provider selection and provider-specific text settings.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/settings-actions.js`
  - Load text models through provider layer; support provider switching and provider-aware fallback models.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/ai-request.js`
  - Replace direct `window.dzmm.completions` dependency with provider dispatch.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/catalog-actions.js`
  - Load player name and text model list conditionally based on active provider.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/system-test-actions.js`
  - Make system test use provider-agnostic text completion path for text-only verification.
- Create: `C:/Users/liuqi/Documents/TestDev/tests/ai-provider.test.js`
  - Cover provider selection, request normalization, and DeepSeek payload transformation.
- Create: `C:/Users/liuqi/Documents/TestDev/tests/ai-request-provider.test.js`
  - Cover `aiRequest.complete` delegation, provider errors, and fallback model selection.
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/real-world-utility-actions.js`
  - Optionally replace dzmm-only toast calls with safe optional wrapper if needed during implementation.

## Functional Scope

- Text-only provider abstraction in scope.
- DeepSeek models: support current recommended text models first; draw/image is out of scope.
- Existing dzmm text flow must continue to work when provider is `dzmm`.
- Running without dzmm should still allow non-AI app surfaces, local storage, static asset loading, and DeepSeek-backed text requests when configured.
- Existing draw model UI can remain visible but should clearly reflect that draw provider is still dzmm-only/fallback for now.

## Expected Runtime Behavior After Change

- Without dzmm:
  - Works: static UI load, catalog/assets loading, local save fallback, non-AI browsing, DeepSeek text requests if configured.
  - Limited/broken by design: dzmm user info, dzmm KV sync, draw/image generation, dzmm-specific test panels.
- With dzmm provider selected:
  - Existing text request behavior remains available.
- With DeepSeek provider selected:
  - Text model list comes from DeepSeek `/models` when API key is set.
  - Text completions go through DeepSeek chat completions endpoint.

## Implementation Tasks

### Task 1: Add provider-aware config defaults

**Files:**
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/config.js`

- [ ] Add provider defaults for text AI configuration
- [ ] Keep backward compatibility for existing `defaultModelId` reads while introducing provider-aware defaults
- [ ] Ensure DeepSeek recommended default model does not rely on deprecated aliases

### Task 2: Create provider registry and normalization layer

**Files:**
- Create: `C:/Users/liuqi/Documents/TestDev/publish/ai-provider.js`

- [ ] Implement provider registry with `register`, `get`, `currentProviderId`, `currentProvider`, and config readers from Alpine store/config
- [ ] Add shared helpers for auth header building, fetch JSON, stream text accumulation, and normalized app errors
- [ ] Expose safe helpers to check whether current provider supports model listing, text completion, and user info

### Task 3: Implement dzmm text provider adapter

**Files:**
- Create: `C:/Users/liuqi/Documents/TestDev/publish/ai-provider-dzmm.js`

- [ ] Implement `listTextModels()` using `window.dzmm?.models?.list?.()`
- [ ] Implement `complete()` using existing dzmm callback streaming shape
- [ ] Normalize errors/retryability and preserve current chunk callback behavior
- [ ] Optionally expose `getUserInfo()` for catalog/settings flows

### Task 4: Implement DeepSeek text provider adapter

**Files:**
- Create: `C:/Users/liuqi/Documents/TestDev/publish/ai-provider-deepseek.js`

- [ ] Implement `listTextModels()` using `GET /models`
- [ ] Implement `complete()` using OpenAI-compatible `POST /chat/completions`
- [ ] Support non-streaming completion first unless minimal streaming can be added cleanly
- [ ] Map app `maxTokens` to DeepSeek-compatible `max_tokens`
- [ ] Normalize response text extraction from `choices[0].message.content`
- [ ] Normalize network/auth/rate-limit errors into the app retry semantics

### Task 5: Wire provider modules into page boot order

**Files:**
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/index.html`

- [ ] Load `ai-provider.js`, `ai-provider-dzmm.js`, and `ai-provider-deepseek.js` before `ai-request.js`
- [ ] Add settings controls for text provider selection
- [ ] Add DeepSeek API key/base URL fields in settings with clear local-only wording
- [ ] Mark draw functionality as dzmm-only/not handled yet

### Task 6: Extend store state and persistence

**Files:**
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/game.js`
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/storage.js`

- [ ] Add provider-aware fields to `settingsState`, including `textProvider`, `deepseekApiKey`, `deepseekBaseUrl`, and optional `deepseekModel`
- [ ] Persist and restore those fields without breaking old saves
- [ ] Maintain backward compatibility when old saves only contain `textModelId`

### Task 7: Make settings provider-aware

**Files:**
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/settings-actions.js`
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/catalog-actions.js`

- [ ] Replace direct dzmm model loading with provider `listTextModels()`
- [ ] Add action handlers for switching provider and saving DeepSeek credentials/settings
- [ ] Keep dzmm user info lookup optional and silent when not available
- [ ] Provide provider-specific fallback text models

### Task 8: Refactor aiRequest to use provider dispatch

**Files:**
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/ai-request.js`

- [ ] Replace hardcoded `window.dzmm.completions` requirement with provider capability check
- [ ] Delegate request execution to current provider `complete()` implementation
- [ ] Preserve queueing, retry, logging, `onChunk`, `onDone`, and timeout behavior
- [ ] Make selected model resolution provider-aware

### Task 9: Update system testing and optional dzmm-only surfaces

**Files:**
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/system-test-actions.js`
- Modify: `C:/Users/liuqi/Documents/TestDev/publish/real-world-utility-actions.js`

- [ ] Switch text-only tests to provider-agnostic calls where practical
- [ ] Keep dzmm-specific raw transport diagnostics only when provider is dzmm
- [ ] Ensure UI feedback does not hard-fail when dzmm toast runtime is missing

### Task 10: Add focused tests

**Files:**
- Create: `C:/Users/liuqi/Documents/TestDev/tests/ai-provider.test.js`
- Create: `C:/Users/liuqi/Documents/TestDev/tests/ai-request-provider.test.js`

- [ ] Add tests for provider selection and configuration lookup
- [ ] Add tests for DeepSeek payload/response normalization
- [ ] Add tests for aiRequest delegation and error normalization
- [ ] Run targeted tests and note any existing unrelated failures separately

### Task 11: Verify manually

**Files:**
- Modify only if verification reveals issues

- [ ] Run local static server and verify the app still loads without dzmm
- [ ] Verify dzmm provider path still opens settings and resolves text models when dzmm exists
- [ ] Verify DeepSeek provider path can save settings and attempts text completion with configured key
- [ ] Verify local save/restore keeps provider choice and text model choice
