import fs from 'node:fs';

const flowScript = 'mobile/shell/run-android-webview-toolchain-flow.ps1';
const flowDoc = 'mobile/android-webview-shell/TOOLCHAIN-FLOW.md';
const flowScriptText = fs.existsSync(flowScript) ? fs.readFileSync(flowScript, 'utf8') : '';
const flowDocText = fs.existsSync(flowDoc) ? fs.readFileSync(flowDoc, 'utf8') : '';

const checks = {
  flowScriptReady: flowScriptText.includes('step=overview') && flowScriptText.includes('step=build-attempt'),
  materializeOptionReady: flowScriptText.includes('$MaterializeLocalProperties') && flowScriptText.includes('$SdkDir'),
  runTasksOptionReady: flowScriptText.includes('$RunTasks') && flowScriptText.includes('buildAttemptScript -RunTasks'),
  flowDocReady: flowDocText.includes('统一执行入口') && flowDocText.includes('推荐顺序'),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-toolchain-flow-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    flowScript,
    flowDoc,
  },
}, null, 2)}\n`);
