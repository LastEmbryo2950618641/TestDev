import fs from 'node:fs';

const auditPath = 'docs/architecture/requirement-audit-2026-07-12.md';
const audit = fs.existsSync(auditPath) ? fs.readFileSync(auditPath, 'utf8') : '';

const checks = {
  lowCouplingReady: audit.includes('### 1. 保证低耦合') && audit.includes('已证明完成'),
  reusabilityReady: audit.includes('### 2. 代码复用性') && audit.includes('shared runtime 仍集中在 `publish/`'),
  androidBlockersReady: audit.includes('missing-local-properties') && audit.includes('placeholder-wrapper'),
  overallConclusionReady: audit.includes('当前总体审计结论') && audit.includes('外部 Android SDK 路径与真实 wrapper 输入'),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'requirement-audit-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    auditPath,
  },
}, null, 2)}\n`);
