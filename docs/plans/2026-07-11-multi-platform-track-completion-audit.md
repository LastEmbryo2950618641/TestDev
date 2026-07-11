# Multi-Platform Track Completion Audit (2026-07-11)

## 目标
对当前“多端复用 + 壳层准备 + desktop handshake 试点”主线做一次阶段完成度审计，明确：
- 哪些内容已经正式落地
- 哪些内容仍属于 draft / example / skeleton
- 哪些内容尚未开始

## 一、已正式落地的结构与规范
### 1. 共享结构规范
已落地：
- `publish/app/`
- `publish/domain/`
- `publish/platform/`
- `publish/ui/`
- 多份 README / architecture / plans 文档

判断：已正式落地，可继续复用。

### 2. `platform.core` 浏览器侧真实接入
已落地：
- `platform.core.keys`
- `platform.core.storage.*`
- `platform.core.assets.bodyFigure`
- `platform.core.files`
- `platform.core.host`
- 若干真实上层调用已接入这些 core 入口

判断：已正式落地，但仍在渐进扩展中。

### 3. 浏览器直连点收口
已落地：
- local settings source
- sqlite slot source
- index 首屏主题读取已转为 platform source 思路

判断：已正式落地，且对多端复用有直接价值。

## 二、已正式落地的壳层基础骨架
### 1. 目录与说明
已落地：
- `desktop/`
- `mobile/`
- 各自 README
- `shell/`、`docs/` 子目录

判断：已正式落地。

### 2. 宿主策略与 mapping 文档
已落地：
- host strategy 文档
- desktop/mobile `platform.core` mapping 文档
- mapping index 文档

判断：已正式落地，作为长期参考有效。

### 3. bridge stub 与 assembly example
已落地：
- desktop/mobile 五大域 bridge stub
- desktop/mobile assembly example

判断：已正式落地，但仍属于“结构准备”层，不是运行时真实实现。

## 三、已进入 draft / example 阶段的桌面主线
### 1. Desktop Stage A drafts
已完成 draft：
- `desktop host`
- `desktop files`
- `desktop storage`
- `desktop assets`
- `desktop keys`

判断：已完成第一版宿主草图，但都尚未接真实 Electron / Tauri API。

### 2. Desktop Stage B handshake docs/examples
已完成：
- desktop handshake example
- safe-consumer handshake template
- safe-consumer 索引
- desktop entry integration checklist
- safe-consumer runner example

判断：已完成“受控接入框架”的文档与示例层。

### 3. Desktop safe-consumer examples
已完成示例：
- `settings-local-read`
- `role-card-json-export`
- `role-card-json-import-preview`

判断：已完成受控试点模式验证，但仍然只是示例，不接共享主链。

## 四、仍属于未开始或仅规划状态的部分
### 1. 真实桌面宿主实现
未开始：
- Electron 主入口
- preload / bridge 实际 API 接线
- 真正的桌面文件读写实现
- 真正的桌面存储实现
- 真正的桌面密钥读取实现

判断：未开始。

### 2. 真实移动宿主实现
未开始：
- Capacitor / Android WebView 壳真实工程
- mobile host 真实 bridge
- mobile storage / files / assets / keys 真实实现
- mobile handshake 真实接入

判断：未开始。

### 3. 高耦合玩法主链宿主接入
未开始：
- 剧情主链
- 现实推演主链
- 微信主链
- 其他高耦合状态同步主链

判断：明确未开始，且当前不应直接进入。

## 五、当前真实阶段结论
### 已完成
- 多端主线的“结构准备层”已经非常完整。
- 桌面端的“受控试点框架”已经完整到可直接指导后续实现。

### 未完成
- 真正的 desktop host runtime 仍未接入。
- 真正的 mobile host runtime 仍未接入。
- 任何高耦合玩法链路都还没有切到多端宿主。

## 六、当前建议的真实下一步
1. 若继续低风险推进：
   - 开始第一版 Electron 入口草图
2. 若先做更细审计：
   - 为 desktop Stage A / Stage B 再做一次“ready-to-implement”清单
3. 当前不建议：
   - 直接并行开启 mobile 真宿主实现
   - 直接让高耦合玩法链路消费桌面 bridge
