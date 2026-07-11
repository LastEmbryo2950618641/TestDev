import { createAndroidLocalPropertiesDraft } from './android-local-properties-draft.js';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    throw new Error(`${command} ${args.join(' ')} returned empty output`);
  }
  return JSON.parse(cleaned);
}

const buildPrep = runJson('node', ['mobile/shell/android-webview-build-prep-report.js']);
const buildEnv = runJson('node', ['mobile/shell/android-webview-build-env-report.js']);
const localDraft = createAndroidLocalPropertiesDraft();
const attemptRecordText = fs.existsSync('mobile/android-webview-shell/.last-build-attempt.json')
  ? fs.readFileSync('mobile/android-webview-shell/.last-build-attempt.json', 'utf8').replace(/^\uFEFF/, '').trim()
  : '';
const attemptRecord = attemptRecordText ? JSON.parse(attemptRecordText) : null;

const summary = {
  runtimeFamily: 'android-webview-toolchain-overview-report',
  stage: 'android-webview-toolchain-overview-report',
  hostKind: 'mobile',
  shell: 'android-webview-shell',
  readiness: {
    buildPrepOk: buildPrep.ok === true,
    buildEnvOk: buildEnv.ok === true,
    localDraftReady: localDraft.ready === true,
    buildAttemptRecordReady: !!attemptRecord,
  },
  blockers: [
    !buildEnv.checks?.localPropertiesPresent ? 'missing-local-properties' : null,
    !buildEnv.checks?.localPropertiesConfigured ? 'missing-sdk-dir' : null,
    buildEnv.checks?.placeholderWrapperOnly ? 'placeholder-wrapper' : null,
  ].filter(Boolean),
  reports: {
    buildPrep,
    buildEnv,
    localDraft,
    attemptRecord,
  },
  recommendedNextActions: buildEnv.nextActions || [],
};

summary.ok = summary.readiness.buildPrepOk
  && summary.readiness.buildAttemptRecordReady
  && summary.blockers.length === 0;

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
