# Desktop Builder Pre-Install Checklist

本文档用于在执行真实 `npm install -D electron-builder` 前，对当前 `desktop/shell` builder 准备批次做最后一次对照检查。

## 一、必须存在的配置文件

- `desktop/shell/desktop-packaging-config.js`
- `desktop/shell/electron-builder.config.js`
- `desktop/shell/electron-builder-dry-run-entry.js`

## 二、必须可执行的验证命令

以下命令当前应能直接输出 JSON：

```bash
npm run verify:packaging-config
npm run verify:packaging-toolchain
npm run verify:packaging-tool
npm run verify:packaging-dry-run-plan
npm run verify:builder-dry-run-entry
```

## 三、当前应满足的状态

### 1. packaging config

应满足：

- `main = electron-main-bootstrap.cjs`
- 包含 `publish/` 打包映射
- `win.target` 包含 `portable`

### 2. toolchain preflight

应满足：

- `readyForToolInstall = true`
- 允许当前尚未安装 `electron-builder`

### 3. tool recommendation

应满足：

- `recommended = electron-builder`

### 4. builder dry-run entry

应满足：

- `builderConfigPresent = true`
- `readyForBuilderInstall = true`
- `builderInstalled = false` 也可接受（安装前状态）

## 四、安装后优先观察的文件

- `desktop/shell/package.json`
- `desktop/shell/package-lock.json`
- `desktop/shell/node_modules/`
- `desktop/shell/dist/`

## 五、当前结论

如果以上检查全部成立，则说明：

- 当前 desktop builder 前置准备已经完整
- 下一步进入真实 `electron-builder` 安装具备可解释、可比对的最小边界
