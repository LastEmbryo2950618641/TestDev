import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

function readTextEvidence(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return {
      path: filePath,
      present: true,
      preview: text.slice(0, 200),
      length: text.length,
    };
  } catch {
    return {
      path: filePath,
      present: false,
      preview: '',
      length: 0,
    };
  }
}

const root = process.cwd();
const shellRoot = path.resolve(root, 'mobile', 'android-webview-shell');
const archiveDir = path.resolve(shellRoot, '.artifacts', 'android-toolchain-evidence-archive');
fs.mkdirSync(archiveDir, { recursive: true });

const overview = runJson('node', ['mobile/shell/android-webview-toolchain-overview-report.js']);
const executionState = runJson('node', ['mobile/shell/android-execution-state-report.js']);
const finalHandoff = runJson('node', ['mobile/shell/android-final-handoff-overview-report.js']);

const snapshot = {
  runtimeFamily: 'android-toolchain-evidence-archive',
  stage: 'android-toolchain-evidence-archive',
  generatedAt: new Date().toISOString(),
  overview,
  executionState,
  finalHandoff,
  files: {
    buildChecklist: readTextEvidence(path.resolve(shellRoot, 'BUILD-LAUNCH-CHECKLIST.md')),
    wrapperHandoff: readTextEvidence(path.resolve(shellRoot, 'WRAPPER-HANDOFF.md')),
    wrapperReplacementGuide: readTextEvidence(path.resolve(shellRoot, 'WRAPPER-REPLACEMENT-GUIDE.md')),
    toolchainFlow: readTextEvidence(path.resolve(shellRoot, 'TOOLCHAIN-FLOW.md')),
    attemptRecord: readTextEvidence(path.resolve(shellRoot, '.last-build-attempt.json')),
    localDraft: readTextEvidence(path.resolve(shellRoot, 'local.properties.generated')),
    localExample: readTextEvidence(path.resolve(shellRoot, 'local.properties.example')),
    summaryDoc: readTextEvidence(path.resolve(root, 'docs', 'architecture', 'android-final-handoff-summary-2026-07-12.md')),
    handoffDoc: readTextEvidence(path.resolve(root, 'docs', 'architecture', 'android-toolchain-handoff-2026-07-12.md')),
    snapshotDoc: readTextEvidence(path.resolve(root, 'docs', 'architecture', 'android-toolchain-status-snapshot-2026-07-12.md')),
  },
};

const snapshotPath = path.resolve(archiveDir, 'latest-android-toolchain-evidence.json');
fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

const presentCount = Object.values(snapshot.files).filter((item) => item.present).length;

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-toolchain-evidence-archive',
  stage: 'android-toolchain-evidence-archive',
  ok: overview.readiness?.buildPrepOk === true && executionState.readiness?.attemptRecordReady === true,
  archiveDir,
  snapshotPath,
  fileEvidenceCount: presentCount,
  blockers: finalHandoff.blockers || [],
}, null, 2)}\n`);
