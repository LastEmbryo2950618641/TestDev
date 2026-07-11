import fs from 'node:fs';

const path = 'docs/architecture/QUICK-NAVIGATION-2026-07-12.md';
const content = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const checks = {
  overviewReady: content.includes('multi-platform-handoff-overview-report.js'),
  verificationReady: content.includes('unified-platform-verification-suite.js'),
  blockerReady: content.includes('missing-sdk-dir') && content.includes('placeholder-wrapper'),
  riskReady: content.includes('publish/index.html') && content.includes('publish/boot/script-manifest.js'),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'quick-navigation-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: { path },
}, null, 2)}\n`);
