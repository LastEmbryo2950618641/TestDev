---
name: md-inline-generate
description: 当用户说更新了 publish/config 或其他目录下的 MD，需要用脚本同步/重新生成对应同名 JS、更新 MD 快照/缓存，或要求不要读取 MD 内容时使用。必须优先调用项目脚本按路径生成同名 JS，禁止读取 MD 正文。
---

# MD 同名内联 JS 生成

## 触发场景

用户提出以下任一需求时使用：

- 项目需要加载 MD 文档作为配置、资料、设定、提示词或默认数据源。
- 用户修改 MD 后要求重新生成、同步生成 JS、更新缓存或加载最新 MD。
- 用户要求避免浏览器运行时 `fetch()` MD，改为 JS 快照加载。
- 用户要求把 MD 作为编辑源，并在同目录生成同名运行时 JS。

## 强制规则

1. 禁止读取目标 MD 正文。
   - 不要用 Read 打开目标 MD。
   - 不要用 cat/head/tail/sed/awk/grep 查看目标 MD 正文。
   - 不要手动复制、改写、搬运 MD 文本到 JS。

2. 必须只把 MD 路径传给生成脚本。
   - 默认脚本路径：`tools/md-to-inline-js.js`
   - 调用格式：
     ```bash
     node tools/md-to-inline-js.js publish/config/example.md
     ```
   - 脚本会读取该 MD，并在同目录强制覆盖生成同名 JS。

3. 如果用户要求某个目录下的 MD 都生成，只用 Glob 枚举 `.md` 路径，然后逐个传给脚本。
   - 可以读取路径列表。
   - 不读取 MD 正文。

4. 生成后不做 `node --check` 语法检查。
   - 该 JS 由脚本生成，默认信任脚本输出。
   - 如需检查，只做发布路径命名检查。

5. 保存前仍按项目要求检查 `publish/` 路径命名：
   ```bash
   find publish \( -type f -o -type d \) 2>/dev/null | LC_ALL=C grep -nP '[^\x00-\x7f]| ' || echo "✓ 全部合规"
   ```

6. 有文件变更后调用 git save。

## 推荐流程

1. 用用户给出的 MD 路径，或用 Glob 枚举目标目录下的 `.md` 文件。
2. 直接执行：
   ```bash
   node tools/md-to-inline-js.js "目标.md"
   ```
3. 不读取 MD 正文，不检查生成 JS 语法。
4. 执行 `publish/` 路径命名检查。
5. 如果有文件变更，调用 git save。
6. 告诉用户已按路径调用脚本生成，并提醒刷新 Preview。
