# 2026-07-11 index-html-encoding-stabilization

## 目标

为 `publish/index.html` 建立稳定的编码处理基线，避免后续在 Windows PowerShell 环境下继续因为输出编码与文件编码不一致而误判文件已损坏，从而降低高频入口文件的误伤风险。

## 结论

本轮确认：

- `publish/index.html` 的终端显示结果不能作为文件真实编码状态的可信依据
- 在当前环境中，PowerShell `Get-Content` 显示中文可能出现乱码假象
- 使用 Node 以 `utf8` 直接读取文件内容时，`<title>` 等关键中文内容可正常解析
- 因此，后续涉及 `publish/index.html` 的稳定化与模板迁移，必须优先使用 Node 读写/校验，而不是依赖 PowerShell 文本显示

## 本轮采取的稳定化策略

1. 放弃继续用 PowerShell 重定向或字符串替换做 `index.html` 编码修复
2. 改用 Node 直接从 git `HEAD:publish/index.html` 读取原始字节并写回工作区
3. 使用 Node `fs.readFileSync(..., 'utf8')` 验证关键中文字段是否可正确解析
4. 将 `publish/ui/real-world/README.md` 恢复为正常中文说明文档，减少后续 helper 层协作误判

## 协作规则

后续若继续修改 `publish/index.html`：

- 优先使用 Node 脚本做精确块替换
- 不要使用 PowerShell `>` 或 `Set-Content` 直接承接含大量中文的整文件回写
- 不要依据 PowerShell 控制台显示结果判断整文件是否乱码
- 修改后使用 Node 读取关键字段做验证，例如：
  - `<title>`
  - 已知中文按钮文案
  - 目标模板块的完整 HTML 结构

## 对整体目标的价值

这次不是单纯修一个乱码问题，而是在高频入口文件上建立可靠工作方式，为后续：

- 继续推进低耦合模板层迁移
- 保持玩法逻辑不变
- 降低关联性影响风险
- 为未来桌面壳 / 移动壳复用前端展示层

提供了更稳的执行基线。
