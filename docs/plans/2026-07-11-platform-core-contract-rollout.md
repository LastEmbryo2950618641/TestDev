# 2026-07-11 platform core contract rollout

## Goal

在 keys 与 storage 已经完成第一批 `platform.core` 落地后，补一份统一接口清单文档，明确后续 `assets / files / host` 的目标形态与迁移约束。

## New Document

- `docs/architecture/platform-core-contract-2026-07-11.md`

## Why This Document Matters

- 当前已经有真实 `platform.core.keys` 与 `platform.core.storage`，需要把它们上升成统一规则。
- 如果没有统一 contract，后续抽 `assets/files/host` 时容易出现接口风格不一致。
- 多端壳层最终依赖的是稳定平台抽象，而不是某几个零散收口文件。

## Coverage

文档明确了：

- 当前已落地的 core 入口
- `keys` contract
- `storage` contract
- `assets` contract 目标形态
- `files` contract 目标形态
- `host` contract 目标形态
- 兼容迁移模式
- 与多端拆壳的关系
- 下一阶段推荐顺序

## Outcome

这份文档把近期平台边界工作从“两个局部样板”提升成了统一路线。后续如果继续做 body-figure、文件读写、宿主能力抽象，都可以直接按这份 contract 执行。