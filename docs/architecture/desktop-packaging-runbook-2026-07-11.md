# Desktop Packaging Runbook

本文档用于统一记录当前 Windows `exe` 方向从 readiness、config、toolchain preflight 到真实 builder dry-run 的执行顺序。

目标：

- 让后续 AI / 人工协作者不必反复翻找多个脚本
- 在不改变玩法逻辑前提下，把桌面打包推进路径固定下来
- 在高脏工作区环境下，尽量降低误操作与误判风险
- 固化当前 Windows 环境下 `electron-builder` 的稳定绕过方案，避免再次卡死在默认 Electron 解包阶段

## 一、当前阶段判断

当前 desktop 已完成：

- Electron smoke run 成功
- multi-platform readiness 汇总
- packaging config 骨架
- packaging toolchain preflight
- packaging tool recommendation
- packaging dry-run plan
- electron-builder binding / dry-run entry
- install impact audit
- 最小 `dir` 配置在正式配置下打包成功
- 主配置已推进到 `win-unpacked/Gamefy.exe` 产出

当前未完全收口：

1. `portable` 目标最终产物的完整落盘验证
2. 桌面图标、签名、asar 策略等生产级细节收口
3. 与后续 Android / shared runtime 拆层联动的规范继续沉淀

## 二、关键结论

当前 Windows 环境下，`electron-builder` 默认的 Electron 发行包解包步骤会卡在：

- `packaging platform=win32 ...`
- `no custom electronDist provided, unpacking default Electron distribution`

为避免该静默卡死，桌面打包配置需要显式注入本地 Electron 分发目录：

- 来源：`desktop/shell/node_modules/electron/dist`
- 接入位置：`desktop-packaging-config.js` 与 `desktop-minimal-packaging-config.js`
- 统一解析模块：`desktop/shell/desktop-packaging-paths.js`

验证入口：

```bash
node desktop/shell/desktop-packaging-electron-dist-state.cli.js
```

当 `main.hasElectronDist` 与 `minimal.hasElectronDist` 均为 `true` 时，表示正式配置已接入稳定绕过方案。

## 三、执行入口总表

### 1. readiness

```bash
npm run verify:multi-platform-readiness
```

用途：

- 确认 shared / desktop / mobile 的 readiness 汇总状态

### 2. packaging config

```bash
npm run verify:packaging-config
```

用途：

- 确认当前桌面包结构骨架是否成立

### 3. electron dist state

```bash
node desktop/shell/desktop-packaging-electron-dist-state.cli.js
```

用途：

- 确认主配置与最小配置是否都指向本地 `electronDist`
- 避免后续会话回到默认解包链并再次卡死

### 4. toolchain preflight

```bash
npm run verify:packaging-toolchain
```

用途：

- 确认是否已安装 builder/forge
- 判断当前是否已经 ready for tool install

### 5. tool recommendation

```bash
npm run verify:packaging-tool
```

用途：

- 固化当前建议使用的桌面打包工具

### 6. dry-run plan

```bash
npm run verify:packaging-dry-run-plan
```

用途：

- 明确 dry-run 是否已经可执行
- 明确下一步是安装 tool 还是直接 dry-run

### 7. builder dry-run entry

```bash
npm run verify:builder-dry-run-entry
```

用途：

- 确认 `electron-builder.config.js` 是否存在
- 输出未来真实 dry-run 将执行的 builder 命令

## 四、当前推荐路径

### 路径 A：继续推进 Windows 桌面壳打包

适合情况：

- 当前目标是尽快稳定 `exe` 路线
- 接受 `dist/`、`package-lock.json`、`node_modules/` 继续变化

执行顺序：

1. 先确认正式配置已接入本地 Electron 分发目录：

```bash
node desktop/shell/desktop-packaging-electron-dist-state.cli.js
```

2. 最小配置验证：

```bash
cd desktop/shell
.\node_modules\.bin\electron-builder.cmd --win dir --config .\electron-builder.minimal.config.js
```

3. 主配置验证：

```bash
cd desktop/shell
.\node_modules\.bin\electron-builder.cmd --win portable --config .\electron-builder.config.js
```

### 路径 B：先推进共享运行时与多端拆层，再回头收桌面生产细节

适合情况：

- 当前更优先的是低耦合、目录规范、shared runtime 复用
- 可以接受桌面打包先停在“基础链可用”而非“生产级收口”

执行顺序：

1. 保持当前 `electronDist` 修复不动
2. 继续拆 shared / desktop / mobile 的职责边界
3. 在共享层稳定后，再统一处理图标、签名、asar、portable 最终收口

## 五、当前验证证据

已确认：

- `electron-builder 26.15.3 + electron 36.9.5` 在显式 `electronDist` 情况下可通过 `packaging` 卡点
- 正式最小配置产出：`desktop/shell/dist-minimal/win-unpacked/GamefyMinimal.exe`
- 正式主配置产出：`desktop/shell/dist/win-unpacked/Gamefy.exe`

关键日志：

- `desktop/shell/.artifacts/builder-rerun/stdout-dir-canonical.log`
- `desktop/shell/.artifacts/builder-rerun/stdout-portable-canonical.log`

## 六、当前结论

从桌面打包底座看，当前已经不是“是否能开始做 exe”，而是：

- Windows 桌面壳基础链已经可用
- 下一步更值得投入的是把它与 shared runtime / mobile 目录治理串起来，持续降低耦合
