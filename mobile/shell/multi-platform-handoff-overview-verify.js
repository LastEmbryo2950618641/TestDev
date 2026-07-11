import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const overviewOutput = execFileSync('node', ['mobile/shell/multi-platform-handoff-overview-report.js'], { encoding: 'utf8' });
const overview = JSON.parse(overviewOutput);
const handoffPath = 'docs/architecture/multi-platform-final-handoff-summary-2026-07-12.md';
const handoff = fs.existsSync(handoffPath) ? fs.readFileSync(handoffPath, 'utf8') : '';

const checks = {
  overviewProduced: overview.runtimeFamily === 'multi-platform-handoff-overview-report',
  readinessReady: overview.readiness?.desktop === true && overview.readiness?.mobile === true && overview.readiness?.browser === true,
  verificationReady: typeof overview.verification?.note === 'string' && overview.verification.note.length > 0,
  mobileBlockersPresent: Array.isArray(overview.platformSummary?.mobile?.blockers),
  handoffReady: handoff.includes('当前全局结论') && handoff.includes('当前真正 blocker'),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'multi-platform-handoff-overview-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    handoffPath,
    blockers: overview.platformSummary?.mobile?.blockers || [],
  },
}, null, 2)}\n`);

