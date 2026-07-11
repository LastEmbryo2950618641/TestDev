import fs from 'node:fs';

const wrapperGuide = 'mobile/android-webview-shell/WRAPPER-REPLACEMENT-GUIDE.md';
const materializeScript = 'mobile/shell/materialize-android-local-properties.ps1';
const wrapperGuideText = fs.existsSync(wrapperGuide) ? fs.readFileSync(wrapperGuide, 'utf8') : '';
const materializeScriptText = fs.existsSync(materializeScript) ? fs.readFileSync(materializeScript, 'utf8') : '';

const checks = {
  wrapperGuideReady: wrapperGuideText.includes('Replacement steps') && wrapperGuideText.includes('Files that must change'),
  materializeScriptReady: materializeScriptText.includes('missing-sdk-dir') && materializeScriptText.includes('local-properties-written'),
  materializeScriptWritesTarget: materializeScriptText.includes("Set-Content $targetPath"),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-wrapper-materialization-tools-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  files: {
    wrapperGuide,
    materializeScript,
  },
}, null, 2)}\n`);
