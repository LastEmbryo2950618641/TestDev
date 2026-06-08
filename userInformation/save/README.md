# Save Directory

这里是游戏存档目录模板。

运行中的网页游戏无法直接写入服务器文件系统，因此实际玩家存档会使用 SQLite 数据库序列化后保存到 `dzmm.kv`，并在非平台环境下降级保存到 localStorage。

每个 slot 对应一个独立 SQLite 存档：

- `slot-1`
- `slot-2`
- `slot-3`

每个存档内会固化：

- 当前世界标签
- 该世界的 RPG 状态 schema
- 已出现角色的 RPG 状态
- 当前剧情状态
- 玩家选择与控制权状态
