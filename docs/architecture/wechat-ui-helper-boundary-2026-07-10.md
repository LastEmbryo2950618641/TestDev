# WeChat UI Helper Boundary（2026-07-10）

本文档记录微信模块第一批低风险结构化拆分的边界，用于指导后续继续拆分时保持低耦合与低回归风险。

## 本次已落地

真实实现新增：

- `publish/ui/wechat/view-helpers.js`
- `publish/ui/wechat/README.md`

兼容入口保留：

- `publish/wechat-view-actions.js`

清单已登记：

- `publish/boot/script-manifest.js`

## 本次已迁移的 helper

已迁移到 `publish/ui/wechat/view-helpers.js` 的只读展示 helper：

- `wechatContacts`
- `wechatThreads`
- `wechatSelected`

这些函数的共同特点：

- 主要输出用于界面展示的联系人或线程派生数据
- 不直接写入消息状态
- 不直接触发记忆系统或平台能力
- 不承担消息发送、接收与同步主链

## 当前仍保留在旧入口的逻辑

当前仍留在 `publish/wechat-view-actions.js` 的逻辑包括：

- `setWechatTab`

保留原因：

- 它属于轻交互状态切换，不是纯展示 helper。
- 这一轮优先先把联系人 / 线程 / 选中态的只读逻辑拆干净。

## 当前结论

微信模块已经完成第一批 UI helper 起步，但目前还只是第二个样板模块的起点。

现阶段更适合继续按以下顺序推进：

1. 继续拆更多只读展示 helper
2. 再判断是否有纯规则 helper 适合进入 `domain/wechat`
3. 最后再考虑消息主链、记忆链与状态写回的装配边界

## 第二批已落地（change panel UI）

本批继续追加到 `publish/ui/wechat/view-helpers.js` 的只读展示 helper：

- `wechatHasChangeReasons`
- `wechatChangeGroups`
- `usefulMetricText`
- `metricProfileItem`
- `wechatMetricReasonItems`
- `wechatWearingReasonItems`

这些函数的共同特点：

- 负责“变化原因面板”的展示派生
- 依赖消息上的变更数据和角色状态快照
- 不直接修改消息状态
- 不直接触发记忆系统、发送流程或平台能力

当前已不再由 `publish/wechat-change-panel-actions.js` 直接拥有真实实现。

现有归属：

- `toggleWechatChangePanel` 已迁入 `publish/app/wechat/change-panel-orchestration.js`
- `wechatMetricState` 已迁入 `publish/domain/wechat/change-panel-helpers.js`

`publish/wechat-change-panel-actions.js` 继续作为兼容 facade，保留原有 `$store.game` public method names。

这意味着微信模块目前已经形成两批 UI helper 收敛，但仍然没有进入消息主链和记忆链的高风险区域。

## 第三批已落地（domain 起步）

真实实现新增：

- `publish/domain/wechat/change-panel-helpers.js`
- `publish/domain/wechat/README.md`

本批迁移到 `domain/wechat` 的 helper：

- `wechatMetricState`

选择它作为第一批 domain helper 的原因：

- 它是只读状态访问入口
- 被变化原因面板展示派生复用
- 不直接修改消息、记忆或平台状态
- 可以作为后续更多轻规则 helper 的共同基础

这意味着微信模块已经从“只有 UI helper”进入到“UI + 轻量 domain 起步”阶段，但仍未进入消息主链与记忆链的高风险区域。

## 第四批已落地（domain 扩展）

本批继续追加到 `publish/domain/wechat/change-panel-helpers.js` 的 helper：

- `usefulMetricText`
- `metricProfileItem`

这些函数的共同特点：

- 属于只读状态/轻规则辅助
- 会被变化原因面板展示派生复用
- 不直接触发消息流程、记忆写回或平台能力

这一步之后，`wechat` 的 domain 层不再只有单一状态入口，而开始承接真正可复用的只读规则辅助。

## 当前阶段判断

基于当前 `wechat` 模块的拆分结果，可以得出一个更稳的阶段结论：

- `ui/wechat` 已经承接两批展示 helper
- `domain/wechat` 已经承接只读状态入口与轻规则辅助
- 但当前尚未出现足够清晰、低风险的 `app/wechat` 流程切面

原因：

- 现阶段仍以展示派生和只读状态访问为主
- 真实高风险点集中在消息主链、记忆链、状态写回
- 如果过早抽 `app` 层，容易把高风险流程和结构治理绑在同一轮里

因此更推荐的顺序是：

1. 继续仅在 `wechat` 中做低风险 UI / domain 收敛
2. 等消息主链边界更清晰时，再决定是否进入 `app/wechat`
3. 若短期要继续推进整体样板速度，可优先回到 `taobao` 或其它更清晰的模块

## 当前成熟度总结

截至当前阶段，`wechat` 已经是项目中的第二样板模块，但其成熟度与 `taobao` 不同：

- `ui/wechat`：承接联系人、线程、变化原因面板等只读展示 helper
- `domain/wechat`：承接只读状态入口与轻规则辅助
- 旧入口文件：保留兼容壳与少量交互动作

当前仍未进入 `app/wechat` 的原因不是缺少目录，而是：

- 当前尚未识别出足够清晰、低风险的消息流程装配切面
- 高风险复杂度主要集中在消息主链、记忆链、状态写回
- 继续深拆的收益目前低于保持边界稳定的收益

这意味着 `wechat` 当前已经足够作为“UI + 轻量 domain”样板使用，但不应为了追求与 `taobao` 一样的层数而过早进入高风险流程层。

## 第五批已落地（联系人列表展示）

本批继续追加到 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- wechatContactRows
- wechatContactEmptyText

兼容入口追加到：

- publish/wechat-view-actions.js

本批模板消费落点：

- publish/index.html 联系人页列表区域

这些函数的共同特点：

- 只负责联系人列表展示派生
- 输出模板直接消费的行对象与空态文本
- 不修改联系人状态
- 不进入消息发送、记忆写回或同步链路

这一步的意义是：

- 让联系人页模板从“内联 filter + 直接拼头像字段”转为“消费 UI helper 行数据”
- 继续验证 wechat 模块适合按“旧入口兼容壳 + ui helper 真正实现”的低风险模式推进
- 仍然停留在纯展示层，不触碰消息主链

## 第六批已落地（线程列表展示）

本批继续追加到 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- wechatThreadRows

兼容入口追加到：

- publish/wechat-view-actions.js

本批模板消费落点：

- publish/index.html 聊天列表页线程区域

这些函数的共同特点：

- 只负责聊天线程列表展示派生
- 输出模板直接消费的行对象
- 不改变选中逻辑，不修改消息数据
- 不进入发送、同步、记忆写回链路

这一步的意义是：

- 让聊天列表模板从“直接依赖 thread 原始结构 + 模板内联头像派生”转为“消费 UI helper 行数据”
- 保持 wechatThreads 作为兼容语义入口继续存在
- 继续验证 wechat 模块可按相邻展示切面逐块收敛，而不必一次性深拆主链

## 第七批已落地（资料卡展示）

本批继续追加到 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- wechatProfileCard

兼容入口追加到：

- publish/wechat-view-actions.js

本批模板消费落点：

- publish/index.html 联系人资料页卡片区域

这些函数的共同特点：

- 只负责资料卡展示派生
- 把头像、姓名、副标题整理为模板直接消费的数据结构
- 不改变选中联系人来源，不修改资料状态
- 不进入消息、同步、记忆写回链路

这一步的意义是：

- 让资料页模板不再重复调用 wechatProfileContact() 和头像派生函数
- 继续把 wechat 模块里相邻的展示切面收敛到 ui/wechat
- 为后续把个人资料页拆出独立视图组件提供更稳定的数据边界

## 第八批已落地（资料页标题展示）

本批继续追加到 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- wechatProfileHeaderTitle

兼容入口追加到：

- publish/wechat-view-actions.js

本批模板消费落点：

- publish/index.html 资料页顶部标题区域

这些函数的共同特点：

- 只负责资料页标题展示派生
- 根据当前资料页模式返回标题文本
- 不改变视图切换逻辑，不修改联系人状态
- 不进入消息、同步、记忆写回链路

这一步的意义是：

- 让 profile 页面顶部标题与资料卡开始共享同一展示边界
- 避免模板直接混合相册模式判断与联系人名称读取
- 继续为后续拆分独立资料页视图组件做准备

## 第九批已落地（我的页卡片展示）

本批继续追加到 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- wechatMeCard

兼容入口追加到：

- publish/wechat-view-actions.js

本批模板消费落点：

- publish/index.html 我的页卡片区域

这些函数的共同特点：

- 只负责“我的页”卡片展示派生
- 把昵称、头像文案、微信号文案整理为模板直接消费的数据结构
- 不修改玩家角色状态，不改变账号生成逻辑
- 不进入消息、同步、记忆写回链路

这一步的意义是：

- 让“我的页”卡片与“联系人资料页”卡片形成同类展示边界
- 继续减少模板对底层角色对象和拼接逻辑的直接依赖
- 为后续把卡片类展示抽成可复用视图组件提供更稳定的数据输入

## 第十批已落地（卡片入口行展示）

本批继续追加到 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- wechatMeEntryRows
- wechatProfileEntryRows

兼容入口追加到：

- publish/wechat-view-actions.js

本批模板消费落点：

- publish/index.html 我的页卡片下方入口行
- publish/index.html 资料页卡片下方入口行

这些函数的共同特点：

- 只负责入口行展示派生
- 输出模板直接消费的标题与右侧文案
- 不改变按钮行为，不修改资料或玩家状态
- 不进入消息、同步、记忆写回链路

这一步的意义是：

- 让卡片页下方的入口按钮也开始复用统一的行数据结构
- 继续减少模板中散落的中文文案和固定展示值
- 为后续抽出通用 entry-row 视图组件提供稳定输入

## 第十一批已落地（相册空态与列表展示）

本批继续追加到 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- wechatAlbumPhotoRows
- wechatAlbumEmptyState

兼容入口追加到：

- publish/wechat-view-actions.js

本批模板消费落点：

- publish/index.html 相册页空态卡片
- publish/index.html 相册页照片列表区域

这些函数的共同特点：

- 只负责相册页空态与照片列表展示派生
- 输出模板直接消费的空态对象与照片行对象
- 不改变刷新、生成、删除、裁剪、预览行为
- 不进入消息、同步、记忆写回链路

这一步的意义是：

- 让 album 页面开始摆脱对原始照片对象结构和空态判断的直接依赖
- 继续把 wechat 的展示层样板从卡片页扩展到列表页
- 为后续抽出可复用的图片网格视图数据结构提供稳定边界

## 第十二批已落地（相册工具栏展示）

本批继续追加到 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- wechatAlbumToolbarState

兼容入口追加到：

- publish/wechat-view-actions.js

本批模板消费落点：

- publish/index.html 相册页工具栏区域

这些函数的共同特点：

- 只负责相册页工具栏按钮的展示文案与禁用态派生
- 不改变刷新、打开新增图片流程等行为逻辑
- 不进入消息、同步、记忆写回链路

这一步的意义是：

- 让 album 页面工具栏和空态、列表一样开始消费展示 helper
- 继续减少模板里散落的条件文案判断
- 顺手修正了相册页一处遗留的多余闭合标签，降低模板结构风险

## 第十三批已落地（相册删除确认展示）

本批继续追加到 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- wechatAlbumDeleteConfirmView

兼容入口追加到：

- publish/wechat-view-actions.js

本批模板消费落点：

- publish/index.html 相册删除确认弹窗

这些函数的共同特点：

- 只负责删除确认弹窗的标题、说明与按钮文案展示
- 不改变弹窗开关逻辑，不改变删除确认执行逻辑
- 不进入消息、同步、记忆写回链路

这一步的意义是：

- 让 album 页面的小型弹窗展示岛也进入 helper 边界
- 继续减少模板里硬编码文案的分散度
- 为后续抽出通用 confirm-dialog 视图数据结构提供一个稳定样板

## 第十四批已落地（相册卡片按钮文案展示）

本批继续扩展 publish/ui/wechat/view-helpers.js 中的相册照片行对象：

- cropTitle
- zoomTitle
- deleteLabel
- 已有 lt / previewTitle 继续由照片行对象统一承接

本批模板消费落点：

- publish/index.html 相册照片卡片按钮与图片说明字段

这些字段的共同特点：

- 只负责图片卡片上的标题文案与说明文本展示
- 不改变裁剪、预览、删除等行为逻辑
- 不进入消息、同步、记忆写回链路

这一步的意义是：

- 让相册图片卡片更接近完整的展示对象模型
- 继续减少模板中的硬编码标题文案
- 为后续抽出通用图片卡片视图提供更稳定的输入结构

## 第十五批已落地（头像裁剪弹窗展示）

本批继续追加到 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- wechatAvatarCropView

兼容入口追加到：

- publish/wechat-view-actions.js

本批模板消费落点：

- publish/index.html 头像裁剪弹窗

这些函数的共同特点：

- 只负责头像裁剪弹窗的标题、预览说明、滑杆标签与按钮文案展示
- 不改变裁剪状态绑定，不改变保存和关闭逻辑
- 不进入消息、同步、记忆写回链路

这一步的意义是：

- 让相册页后续关联弹窗继续进入 helper 边界
- 继续减少模板中的硬编码文案
- 为后续抽出通用 crop-dialog 视图结构提供稳定样板

## 第十六批已落地（弹窗 detail view object 复制验证）

本批继续扩展 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- `wechatAlbumDeleteConfirmDetailView`
- `wechatAvatarCropDetailView`

兼容入口追加到：

- `publish/wechat-view-actions.js`

本批模板消费落点：

- publish/index.html 相册删除确认弹窗
- publish/index.html 头像裁剪弹窗

这些 helper 的共同特点：

- 不改变弹窗开关、删除确认、裁剪保存等行为逻辑
- 只把原本分散重复调用的弹窗展示对象，提升为稳定的 detail view object 消费入口
- 继续减少模板对局部 helper 的重复散读

这一步的意义是：

- 让 `real-world` / `faction` 已验证过的 detail view object 使用方式，继续复制到 `wechat`
- 说明 detail view object 模式不只适用于面板头部或 room detail，也适用于小型确认弹窗与裁剪弹窗

## 第十七批已落地（资料页 header section view object 复制验证）

本批继续扩展 publish/ui/wechat/view-helpers.js 的只读展示 helper：

- `wechatProfileHeaderView`

兼容入口追加到：

- `publish/wechat-view-actions.js`

本批模板消费落点：

- publish/index.html 资料页 header 区

这些 helper 的共同特点：

- 不改变返回行为，不改变相册模式切换逻辑
- 只把原本分散的标题与返回按钮文案收口为稳定的 section view object
- 继续减少模板对局部散字段与硬编码按钮文案的直接依赖

这一步的意义是：

- 让 `faction` 已验证过的 section view object 模式继续复制到 `wechat`
- 说明 section view object 不只适用于组织类面板头部，也适用于聊天/资料类页面头部
