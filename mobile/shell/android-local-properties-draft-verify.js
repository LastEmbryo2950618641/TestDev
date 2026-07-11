import fs from 'node:fs';
import { createAndroidLocalPropertiesDraft } from './android-local-properties-draft.js';

const report = createAndroidLocalPropertiesDraft();
const draftText = fs.existsSync(report.draftPath) ? fs.readFileSync(report.draftPath, 'utf8') : '';

const checks = {
  draftFileReady: fs.existsSync(report.draftPath),
  candidatesReady: Array.isArray(report.candidates) && report.candidates.length >= 1,
  sdkLineReady: draftText.includes('sdk.dir='),
  readyFlagPresent: report.ready === true || report.ready === false,
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-local-properties-draft-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    draftPath: report.draftPath,
    preferred: report.preferred,
    ready: report.ready,
  },
}, null, 2)}\n`);
