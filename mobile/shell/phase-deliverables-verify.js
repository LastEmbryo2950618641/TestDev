import fs from 'node:fs';

const path = 'docs/architecture/PHASE-DELIVERABLES-2026-07-12.md';
const content = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const checks = {
  unifiedReady: content.includes('三端统一主干') && content.includes('unified-platform-verification-suite.js'),
  androidReady: content.includes('Android / Mobile 侧成果') && content.includes('run-android-webview-toolchain-flow.ps1'),
  auditReady: content.includes('全局交接与审计层') && content.includes('requirement-audit-2026-07-12.md'),
  blockerReady: content.includes('missing-sdk-dir') && content.includes('placeholder-wrapper'),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'phase-deliverables-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: { path },
}, null, 2)}\n`);
