# Stage B Handshake Notes

## 目标
记录 `Stage B: Desktop shared runtime handshake` 的当前最小接入策略。

## 关键点
- Handshake 不是“替换共享主链”，而是“在桌面宿主中显式挂接 shell bridge”。
- 第一步只验证接线能力，不扩大到高耦合玩法链路。
- 仍然保留浏览器/dev 回退路径。

## 当前最小示例
- `desktop/shell/handshake-example.js`
- `desktop/docs/desktop-handshake-draft-2026-07-11.md`

## 当前建议的第一批安全消费者
- 角色卡 JSON 导入预览
- 角色卡 JSON 导出
- 本地设置读取
