# Desktop Safe Consumer Handshake Index

## 目标
为桌面 safe-consumer handshake 提供一个统一入口，把当前模板、已验证消费者样例、架构说明与验证记录串起来，方便后续会话直接继续推进。

## 当前模式总览
当前桌面 safe-consumer handshake 固定遵循：
1. 先检查桌面 `host` bridge 是否 ready
2. 再检查目标域 bridge 是否 ready
3. ready 则优先走桌面宿主能力
4. 否则回退到共享浏览器/dev `platform.core.*` 实现
5. 不在 safe-consumer 阶段碰高耦合玩法主链

## 模板文档
- `desktop/docs/desktop-safe-consumer-handshake-template-2026-07-11.md`
- `docs/architecture/safe-consumer-handshake-pattern-2026-07-11.md`

## 当前已验证的 safe-consumer 样例
### 1. Settings Local Read
- 示例：`desktop/shell/settings-local-read-example.js`
- 草图说明：`desktop/docs/desktop-settings-local-read-handshake-draft-2026-07-11.md`
- 验证：`docs/plans/2026-07-11-desktop-settings-local-read-handshake-validation.md`

### 2. Role-Card JSON Export
- 示例：`desktop/shell/role-card-json-export-example.js`
- 草图说明：`desktop/docs/desktop-role-card-json-export-handshake-draft-2026-07-11.md`
- 验证：`docs/plans/2026-07-11-desktop-role-card-json-export-handshake-validation.md`

### 3. Role-Card JSON Import Preview
- 示例：`desktop/shell/role-card-json-import-preview-example.js`
- 草图说明：`desktop/docs/desktop-role-card-json-import-preview-handshake-draft-2026-07-11.md`
- 验证：`docs/plans/2026-07-11-desktop-role-card-json-import-preview-handshake-validation.md`

## 推荐后续顺序
1. 若继续扩展 safe-consumer：
   - 优先复用模板，不重新设计接入规则
2. 若要更靠近真实桌面宿主：
   - 让这三条示例在桌面入口中形成更接近真实的组合演练
3. 若要进入更高风险阶段：
   - 必须先明确不会动剧情主链 / 现实推演主链 / 微信主链

## 当前安全线
- `publish/index.html` 仍然是唯一真实运行入口
- 共享玩法逻辑未切换到桌面桥接
- 桌面 safe-consumer 仍然只是受控试点，不是全局接管
