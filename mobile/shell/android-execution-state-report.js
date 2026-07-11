import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return '';
  }
}

const projectRoot = path.resolve(process.cwd(), 'mobile', 'android-webview-shell');
const wrapperBat = path.resolve(projectRoot, 'gradlew.bat');
const localProperties = path.resolve(projectRoot, 'local.properties');
const localDraftPath = path.resolve(projectRoot, 'local.properties.generated');
const recordPath = path.resolve(projectRoot, '.last-build-attempt.json');

const overview = runJson('node', ['mobile/shell/android-webview-toolchain-overview-report.js']);
const localDraft = runJson('node', ['mobile/shell/android-local-properties-draft.js']);
const attemptRecord = fs.existsSync(recordPath)
  ? JSON.parse(readText(recordPath).trim() || '{}')
  : null;

const wrapperText = readText(wrapperBat);
const draftText = readText(localDraftPath);
const localPropertiesText = readText(localProperties);

const report = {
  runtimeFamily: 'android-execution-state-report',
  stage: 'android-execution-state-report',
  readiness: {
    buildPrepOk: overview.readiness?.buildPrepOk === true,
    buildEnvOk: overview.readiness?.buildEnvOk === true,
    localDraftReady: localDraft.ready === true,
    localPropertiesPresent: fs.existsSync(localProperties),
    localPropertiesConfigured: /sdk\.dir\s*=\s*.+/.test(localPropertiesText),
    wrapperPresent: fs.existsSync(wrapperBat),
    wrapperPlaceholderOnly: /placeholder/i.test(wrapperText),
    attemptRecordReady: !!attemptRecord,
  },
  evidence: {
    overview,
    localDraft,
    attemptRecord,
    wrapper: {
      path: wrapperBat,
      present: fs.existsSync(wrapperBat),
      placeholderOnly: /placeholder/i.test(wrapperText),
      preview: wrapperText.slice(0, 160),
    },
    localDraftFile: {
      path: localDraftPath,
      present: fs.existsSync(localDraftPath),
      preview: draftText.slice(0, 160),
    },
    localPropertiesFile: {
      path: localProperties,
      present: fs.existsSync(localProperties),
      preview: localPropertiesText.slice(0, 160),
    },
  },
  recommendedCommands: [
    'node mobile/shell/android-local-properties-draft.js',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/materialize-android-local-properties.ps1 -SdkDir "<真实SDK路径>"',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1 -RunTasks'
  ],
};

report.blockers = [
  !report.readiness.localPropertiesPresent ? 'missing-local-properties' : null,
  !report.readiness.localPropertiesConfigured ? 'missing-sdk-dir' : null,
  report.readiness.wrapperPlaceholderOnly ? 'placeholder-wrapper' : null,
].filter(Boolean);

report.ok = report.readiness.buildPrepOk === true
  && report.readiness.attemptRecordReady === true
  && report.blockers.length === 0;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
