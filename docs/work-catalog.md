# 作品目录配置

每个作品在 `assets/<作品目录>/index.js` 中维护基础配置。配置只描述作品和设定库入口，不重复维护人物数据。

```js
module.exports = {
  version: 1,
  order: 1,
  name: '作品名称',
  aliases: ['作品别名'],
  lore: {
    directory: 'AI设定库',
    characterRoot: '01_按需加载_人物',
    characterIndex: '01_按需加载_人物/人物索引.md',
    cache: '对应的缓存文件.json',
  },
  storyStart: { year: 2011, month: 1, day: 1, hour: 8, minute: 8, second: 0 },
};
```

人物来自 `characterIndex` 指向的 Markdown 表格。表格必须包含 `人物` 和 `详细文件` 表头；`标签`、`性别`、`年龄`、`身份/定位` 用于生成角色预览字段。表格允许在 `详细文件` 前追加首次出现时间、来源状态等列，生成器会取该行最后一个 `.md` 路径作为人物卡路径。

运行 `npm run generate:work-catalog` 会扫描所有作品配置，并在每个 `assets/<作品>/metadata/` 下分别生成 `character-catalog.json`、`character-catalog-data.js`、`lore-sources.js` 和 `story-start-data.js`。

`publish/work-metadata/` 是这些单作品元数据的运行时镜像。`publish/work-metadata-manifest.js` 只保存作品元数据脚本路径，不包含人物、资料源或开场时间业务数据。Android 同步命令会自动先执行生成步骤。
