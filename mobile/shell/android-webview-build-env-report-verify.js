import { execFileSync } from 'node:child_process';

const output = execFileSync('node', ['mobile/shell/android-webview-build-env-report.js'], { encoding: 'utf8' });
const report = JSON.parse(output);
const checks = {
  reportProduced: !!report.runtimeFamily,
  javaCheckPresent: report.checks?.javaReady === true || report.checks?.javaReady === false,
  localPropertiesCheckPresent: report.checks?.localPropertiesPresent === true || report.checks?.localPropertiesPresent === false,
  wrapperCheckPresent: report.checks?.wrapperPropertiesReady === true || report.checks?.wrapperPropertiesReady === false,
  nextActionsReady: Array.isArray(report.nextActions) && report.nextActions.length >= 4,
  runtimeEntryCheckPresent: report.checks?.runtimeEntryReady === true || report.checks?.runtimeEntryReady === false,
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-build-env-report-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    ok: report.ok,
    nextActions: report.nextActions,
  },
}, null, 2)}\n`);
