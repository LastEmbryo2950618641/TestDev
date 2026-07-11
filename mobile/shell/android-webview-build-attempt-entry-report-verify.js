import { execFileSync } from 'node:child_process';

const output = execFileSync('node', ['mobile/shell/android-webview-build-attempt-entry-report.js'], { encoding: 'utf8' });
const report = JSON.parse(output);
const checks = {
  reportOk: report.ok === true,
  wrapperDocReady: report.checks?.wrapperDocReady === true,
  buildAttemptScriptReady: report.checks?.buildAttemptScriptReady === true,
  runTasksGuardReady: report.checks?.runTasksGuardReady === true,
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-build-attempt-entry-report-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: report.files,
}, null, 2)}\n`);
