import fs from 'node:fs';
import path from 'node:path';

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
  if (!raw) return null;
  return JSON.parse(raw);
}

const recordPath = path.resolve(process.cwd(), 'mobile', 'android-webview-shell', '.last-build-attempt.json');
const record = readJson(recordPath);
const output = String(record?.output || record?.error || '');
const normalizedOutput = output.replace(/ac\\r?\\ncess/gi, 'access').replace(/\\s+/g, ' ');
const wrapperLockBlocked = /Timeout of 120000 reached waiting for exclusive access to file:/i.test(normalizedOutput) && /gradle-8\\.7-bin\\.zip/i.test(normalizedOutput);

const normalizedStatus = wrapperLockBlocked
  ? 'tasks-blocked-by-wrapper-download-lock'
  : (record?.status || 'missing-record');

const report = {
  runtimeFamily: 'android-build-attempt-normalized-report',
  stage: 'android-build-attempt-normalized-report',
  recordPath,
  recordPresent: !!record,
  rawStatus: record?.status || null,
  normalizedStatus,
  wrapperDownloadLockBlocked: wrapperLockBlocked,
  outputPreview: output.slice(0, 500),
  ok: !!record,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
