# Browser Direct Launch Boundary (2026-07-12)

本文档用于明确区分两件很容易被混淆的事情：

1. `web index.html` 路线已具备可复用架构与 direct-use readiness
2. “双击本地 `publish/index.html` 直接以 `file://` 启动”并不等于当前所有功能都能无条件工作

## 一、当前结论

当前仓库已经证明：

- `publish/` 是三端共享 runtime 主目录
- browser / desktop / mobile 都围绕同一套 shared runtime 组织
- 浏览器端已具备 capability registry / preflight / readiness / verification 主链
- 以本地静态服务器访问 `http://127.0.0.1:8000/` 的 web 路线是当前权威运行方式

但当前仓库**尚未证明**：

- 所有运行中的资源读取，都能在 `file://` 协议下跨浏览器稳定通过
- 所有 `fetch(...)` 资源请求，在本地文件协议下都不受安全策略限制

因此，现阶段应把以下两种说法严格区分：

- `web index.html ready`：成立，指 shared runtime 已能作为 Web 端主入口并被统一验证体系覆盖
- `file:// direct double-click ready`：未被当前证据证明，不应默认宣称完全成立

## 二、为什么不能把两者混为一谈

当前 `publish/` 中存在多类基于 `fetch(...)` 的资源读取：

- JSON / markdown / txt 资源文件读取
- 提示词模板读取
- skill 清单与 skill 正文读取
- 角色资料 / 体型资料 / 公开年份资料读取
- key 文本读取
- 少量开发辅助接口路径读取

这些模式在 `http://127.0.0.1:8000/` 这样的静态服务器环境下是正常可行的；
但在 `file://` 协议下，不同浏览器对本地文件的 `fetch`、同源限制、相对路径解析与 MIME 处理存在天然差异。

也就是说：

- 页面能打开，不代表玩法完整可用
- 局部功能可用，不代表所有依赖资源读取的链路都可用
- shared runtime 已抽象好，不代表浏览器安全策略已经被规避

## 三、当前已识别的 `file://` 风险来源

### 1. 提示词与技能文档

典型位置：

- `publish/prompt-templates.js`
- `publish/skill-loader.js`

风险说明：

- 依赖 `fetch(...)` 读取 `.md` 或技能清单
- 在 `file://` 环境下，浏览器可能阻止或限制读取

### 2. 静态 JSON / 索引资源

典型位置：

- `publish/body-figure.js`
- `publish/body-silhouette.js`
- `publish/entry-year-public.js`

风险说明：

- 依赖 `fetch(...)` 读取 `assets/...json`
- 本地文件协议下不保证稳定

### 3. key / 本地文本资源

典型位置：

- `publish/platform/keys/source.js`

风险说明：

- 依赖 `fetch('/deepseek_key.txt')` 这类根路径读取
- `file://` 下根路径含义与本地静态服务器完全不同

### 4. 开发专用接口

典型位置：

- `publish/platform/body-figure/source.js`

风险说明：

- 依赖 `/__dev/...` 调试接口
- 这类能力本就要求开发服务器，不属于 `file://` 直开能力范围

## 四、当前权威口径

现阶段最稳妥的对外口径应为：

1. 浏览器 Web 路线已完成 shared runtime 复用与统一验证
2. 当前权威浏览器运行方式是启动本地静态服务器后访问 `http://127.0.0.1:8000/`
3. 若要把“直接双击 `index.html` 完整开始游戏”作为正式能力，需要额外做一轮 `file://` 协议兼容治理

## 五、如果后续要真正支持 `file://` 直开

需要单独开一个兼容专项，至少包括：

1. 梳理所有 `fetch(...)` 读取点
2. 区分运行期必需资源与开发期专用资源
3. 为浏览器直开场景建立内联 manifest / bundle / preload 策略
4. 对 `key`、`skill`、`prompt template`、静态 JSON 读取提供非 `fetch file://` 依赖的替代方案
5. 建立专门的 `file:// direct launch verify`

## 六、与总目标的关系

这份边界说明不会推翻当前总目标的完成进度，原因是：

- 总目标要求的是三端复用与架构规范化
- 当前 browser 路线的“权威运行方式”本来就是静态服务器访问
- `file://` 直开只是更进一步的增强目标，不应倒过来否定现有 browser readiness

但这份文档能避免后续协作者把“Web ready”和“file:// 双击 ready”混为一谈，从而降低关联性影响风险。
