import fs from 'node:fs';

const recordPath = 'mobile/android-webview-shell/.last-build-attempt.json';
const record = fs.existsSync(recordPath)
  ? JSON.parse(fs.readFileSync(recordPath, 'utf8').replace(/^\uFEFF/, ''))
  : null;

const checks = {
  recordPresent: record !== null,
  statusPresent: typeof record?.status === 'string' && record.status.length > 0,
  wrapperPathPresent: typeof record?.wrapperBat === 'string' && record.wrapperBat.length > 0,
  runTasksFlagPresent: record?.runTasksRequested === true || record?.runTasksRequested === false,
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-build-attempt-record-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: record,
}, null, 2)}\n`);

