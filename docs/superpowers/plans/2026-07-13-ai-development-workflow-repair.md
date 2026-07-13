# AI Development Workflow Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the unreadable AI development workflow document and make it the stable handoff guide for future AI coding sessions.

**Architecture:** Keep the workflow as a long-lived architecture document under `docs/architecture/`. Do not create a parallel rule system; align the repaired file with `README.md`, `docs/README.md`, `ai-directory-landing-rules.md`, and `encoding-collaboration-rules.md`.

**Tech Stack:** Markdown documentation, UTF-8 text, existing npm verification scripts.

---

### Task 1: Repair AI Workflow Document

**Files:**
- Modify: `docs/architecture/ai-development-workflow.md`

- [ ] **Step 1: Replace unreadable mojibake text with a clean UTF-8 workflow**

Write a readable Chinese workflow document with these sections:

```markdown
# AI 开发工作流

## 目的

本文件定义后续 AI 在本项目中处理需求、写计划、改代码、验证和提交时的默认流程。
```

- [ ] **Step 2: Include required workflow gates**

The document must include:

```markdown
- 需求分级
- 文档落点
- 目录落点
- 编码安全
- 多端同步
- 验证与提交
- 停手条件
```

- [ ] **Step 3: Verify text readability**

Run:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('docs/architecture/ai-development-workflow.md','utf8'); console.log((s.match(/\\uFFFD/g)||[]).length); console.log((s.match(/[\\u4e00-\\u9fff]/g)||[]).length);"
```

Expected: first number is `0`; second number shows the file contains readable Chinese content.

- [ ] **Step 4: Verify repository hygiene**

Run:

```bash
git diff --check
npm run verify:repo-boundaries
```

Expected: both commands exit successfully.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/ai-development-workflow.md docs/superpowers/plans/2026-07-13-ai-development-workflow-repair.md
git commit -m "docs: repair ai development workflow"
git push origin dev-refactor
```
