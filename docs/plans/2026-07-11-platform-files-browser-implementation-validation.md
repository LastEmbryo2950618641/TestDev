# 2026-07-11 platform files browser implementation validation

## Goal

将 `platform.core.files` 从“只定义骨架”推进为“浏览器/dev 环境下可用的最小实现”，为后续桌面壳与移动壳接管同一组文件接口打基础。

## Scope

- 更新 `publish/platform/files/browser.js`。
- 保留 `platform.core.files` 统一入口。
- 在浏览器环境下实现最小可用的读取、选择、下载能力。
- 不大面积替换当前业务调用。

## Changed Files

- `publish/platform/files/browser.js`

## Validation

1. `publish/platform/files/browser.js`
- `readText(file)`：支持直接读取浏览器 `File.text()`。
- `readJson(file)`：在 `readText()` 基础上解析 JSON。
- `writeText(path, value)`：现在会委托到 `saveFile()`，通过浏览器下载保存文本。
- `writeJson(path, value)`：现在会委托到 `saveFile()`，通过浏览器下载保存 JSON。
- `pickFile(options)`：现在通过隐藏的 `<input type="file">` 提供浏览器文件选择能力。
- `saveFile(options)`：现在通过 `Blob + URL.createObjectURL + <a download>` 提供浏览器下载保存能力。

2. Boundary
- 当前实现仍然是 browser/dev 默认实现，不等于桌面文件系统或移动原生文件读写。
- 但共享核心现在已经有了一组真正可调用的统一文件接口。
- 后续 desktop/mobile 只需要接管同名方法，而不是重新发明文件接口。

## Checks

- `node --check publish/platform/files/browser.js`

## Result

这一步让 `platform.core.files` 从 contract + 占位骨架，提升为浏览器/dev 下可工作的最小实现。对于多端目标来说，这意味着文件能力也开始进入“真实可接壳”的阶段，而不是一直停留在文档层。