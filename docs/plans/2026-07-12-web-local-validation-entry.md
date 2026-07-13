# Web Local Validation Entry (2026-07-12)

## 目的

固定当前项目用于浏览器侧手工验证的本地运行入口，避免后续手工记录继续停留在“未明确启动方式”的状态。

## 当前已确认的权威入口

1. 开发入口：`dev/scripts/dev-server.cjs`
2. 浏览器主目录：`publish/`
3. 页面入口：`publish/index.html`
4. 默认地址：`http://127.0.0.1:8000/`

以上信息当前可由以下权威来源交叉确认：

- [README.md](C:/Users/liuqi/Documents/TestDev/README.md)
- [dev/scripts/dev-server.cjs](C:/Users/liuqi/Documents/TestDev/dev/scripts/dev-server.cjs)

## 推荐启动方式

在项目根目录执行：

```powershell
node dev/scripts/dev-server.cjs
```

启动后，访问：

```text
http://127.0.0.1:8000/
```

或：

```text
http://127.0.0.1:8000/index.html
```

## 当前入口特点

1. 这不是标准的 Vite / Webpack / npm run dev 工程
2. 当前运行链是自定义本地静态服务
3. `publish/` 是浏览器共享运行主目录
4. 浏览器直接双击 `index.html` 不能视为当前权威开发模式

## 对手工验证记录的影响

后续 `skills`、`prompt`、`knownProfession` 的 Web 手工验证，默认都应以本入口为准。

换句话说：

1. 若未通过 `dev/scripts/dev-server.cjs` 启动
2. 或未在 `127.0.0.1:8000` 链路下执行

则不应把结果直接写成当前权威 Web 验证结论。

## 当前阶段结论

当前 Web 本地验证入口已经足够明确，可以作为后续手工执行记录的统一前提。
