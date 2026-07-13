# Desktop Electron Builder First Real Dry-Run Result

本文档记录当前第一次真实 `electron-builder --dir` dry-run 的实际执行结果。

## 一、执行命令

实际使用的命令：

```bash
node .\node_modules\electron-builder\cli.js --dir --config .\electron-builder.config.js
```

后续为稳定获取日志，改为通过 `.bin` shim 并将输出落到：

- `desktop/shell/.artifacts/builder-rerun/stdout.log`
- `desktop/shell/.artifacts/builder-rerun/stderr.log`

## 二、已确认跨过的阶段

### 1. builder 已安装

当前已确认：

- `hasElectronBuilder = true`
- `builderInstalled = true`

### 2. 配置可被加载

日志已明确出现：

- `loaded configuration`

说明：

- `electron-builder.config.js` 可读
- 绑定到 `desktop-packaging-config.js` 的基本链路可用

### 3. metadata 问题已收口

在第一次真实 dry-run 中，曾暴露：

- BOM/编码问题
- `package.json` 缺少 `version`
- 缺少 `description`
- 缺少 `author`

上述问题已处理后，builder 已能继续进入 packaging 阶段。

## 三、当前停留位置

当前日志停在：

- `executing @electron/rebuild`
- `installing native dependencies`
- `completed installing native dependencies`
- `packaging platform=win32 arch=x64 electron=37.10.3 appOutDir=dist\win-unpacked`

同时：

- `stderr` 当前为空
- `dist/` 当前尚未落地

## 四、当前结论

当前不能宣称第一次真实 dry-run 成功，因为：

- `dist/win-unpacked` 尚未生成
- builder 也未给出干净的成功结束证据

但也不能再把问题归类为“准备不足”，因为：

- 已经跨过安装、配置、metadata 与 rebuild 阶段
- 当前阻塞已进入真实 packaging 执行层

## 五、下一步建议

1. 继续以日志化方式复跑 builder
2. 若仍停在同一位置，进一步排查：
   - packaging 阶段内部挂起
   - Windows 子进程等待
   - builder 对当前 `appDirectory` / `files` 组合的行为
3. 当前优先目标是拿到：
   - 最终退出码
   - 成功产物 `dist/win-unpacked`
   - 或者第一条稳定可复现的最终错误
