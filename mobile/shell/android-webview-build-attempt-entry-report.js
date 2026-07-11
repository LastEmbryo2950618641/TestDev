import fs from 'node:fs';

const wrapperDoc = 'mobile/android-webview-shell/WRAPPER-HANDOFF.md';
const buildAttemptScript = 'mobile/shell/run-android-webview-build-attempt.ps1';
const wrapperDocText = fs.existsSync(wrapperDoc) ? fs.readFileSync(wrapperDoc, 'utf8') : '';
const buildAttemptScriptText = fs.existsSync(buildAttemptScript) ? fs.readFileSync(buildAttemptScript, 'utf8') : '';

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-build-attempt-entry-report',
  stage: 'android-webview-build-attempt-entry-report',
  ok: fs.existsSync(wrapperDoc) && fs.existsSync(buildAttemptScript),
  checks: {
    wrapperDocReady: wrapperDocText.includes('Replace these files when toolchain is ready'),
    buildAttemptScriptReady: buildAttemptScriptText.includes('status=placeholder-wrapper') && buildAttemptScriptText.includes('status=ready-for-wrapper-command'),
    runTasksGuardReady: buildAttemptScriptText.includes('[switch]$RunTasks') && buildAttemptScriptText.includes('& $wrapperBat tasks'),
  },
  files: {
    wrapperDoc,
    buildAttemptScript,
  },
}, null, 2)}\n`);
