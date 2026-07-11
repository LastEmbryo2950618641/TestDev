import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const overviewOutput = execFileSync('node', ['mobile/shell/android-webview-toolchain-overview-report.js'], { encoding: 'utf8' });
const overview = JSON.parse(overviewOutput);
const handoffPath = 'docs/architecture/android-final-handoff-summary-2026-07-12.md';
const handoff = fs.existsSync(handoffPath) ? fs.readFileSync(handoffPath, 'utf8') : '';

const checks = {
  overviewProduced: overview.runtimeFamily === 'android-webview-toolchain-overview-report',
  blockersPresent: Array.isArray(overview.blockers),
  nextActionsPresent: Array.isArray(overview.recommendedNextActions) && overview.recommendedNextActions.length >= 1,
  handoffReady: handoff.includes('当前统一总览入口') && handoff.includes('当前真实 blocker'),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-toolchain-overview-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    blockers: overview.blockers,
    handoffPath,
  },
}, null, 2)}\n`);
