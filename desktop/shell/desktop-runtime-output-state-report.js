import fs from 'node:fs';
import path from 'node:path';

function readJson(targetPath) {
  try {
    const raw = fs.readFileSync(targetPath, 'utf8').replace(/^\uFEFF/, '').trim();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const shellRoot = path.resolve(process.cwd(), 'desktop', 'shell');
const attemptPath = path.resolve(shellRoot, '.artifacts', 'attempt-launch-result.json');
const attempt = readJson(attemptPath);

const report = {
  runtimeFamily: 'desktop-runtime-output-state-report',
  stage: 'desktop-runtime-output-state-report',
  attemptPath,
  present: !!attempt,
  checks: attempt?.checks || {},
  evidence: attempt?.evidence || {},
  summary: {
    liveWindowReady: attempt?.checks?.windowCreated === true,
    preloadReady: attempt?.checks?.preloadExposed === true,
    storageReady: attempt?.checks?.storageAttached === true,
    rendererReady: attempt?.checks?.rendererLoaded === true,
  },
};

report.blockers = [
  !report.present ? 'missing-desktop-launch-attempt-record' : null,
  report.present && report.summary.liveWindowReady !== true ? 'desktop-window-not-created' : null,
  report.present && report.summary.preloadReady !== true ? 'desktop-preload-not-exposed' : null,
  report.present && report.summary.storageReady !== true ? 'desktop-storage-not-attached' : null,
  report.present && report.summary.rendererReady !== true ? 'desktop-renderer-not-loaded' : null,
].filter(Boolean);

report.ok = report.present && report.blockers.length === 0;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
