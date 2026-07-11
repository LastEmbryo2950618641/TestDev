import { execFileSync } from 'node:child_process';

const output = execFileSync('node', ['mobile/shell/android-webview-build-prep-report.js'], { encoding: 'utf8' });
const report = JSON.parse(output);
const checks = {
  reportOk: report.ok === true,
  filesReady: report.checks?.filesReady === true,
  sdkReady: report.checks?.sdkReady === true,
  settingsIncludeReady: report.checks?.settingsIncludeReady === true,
  nextInputsReady: Array.isArray(report.nextBuildInputs) && report.nextBuildInputs.length >= 4,
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-build-prep-report-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    nextBuildInputs: report.nextBuildInputs,
  },
}, null, 2)}\n`);
