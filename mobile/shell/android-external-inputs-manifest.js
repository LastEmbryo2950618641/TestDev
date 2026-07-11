import { execFileSync } from 'node:child_process';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

const finalHandoff = runJson('node', ['mobile/shell/android-final-handoff-overview-report.js']);
const checklist = runJson('node', ['mobile/shell/android-next-step-checklist-report.js']);
const matrix = runJson('node', ['mobile/shell/android-blocker-matrix-report.js']);

const manifest = {
  runtimeFamily: 'android-external-inputs-manifest',
  stage: 'android-external-inputs-manifest',
  inputs: [
    {
      id: 'android-sdk-path',
      required: true,
      provided: false,
      source: 'developer-machine',
      purpose: '用于生成正式 local.properties 并提供 sdk.dir',
      unblocks: ['missing-sdk-dir', 'missing-local-properties'],
    },
    {
      id: 'real-local-properties',
      required: true,
      provided: false,
      source: 'generated-from-sdk-path',
      purpose: '让 Android 工具链进入可执行状态',
      unblocks: ['missing-local-properties', 'missing-sdk-dir'],
    },
    {
      id: 'real-gradle-wrapper',
      required: true,
      provided: false,
      source: 'android-toolchain-bootstrap',
      purpose: '替换 placeholder gradlew / gradlew.bat',
      unblocks: ['placeholder-wrapper'],
    },
    {
      id: 'real-gradle-command-run',
      required: true,
      provided: false,
      source: 'local-machine-execution',
      purpose: '执行至少一次 gradlew.bat tasks 并更新 attempt record',
      unblocks: ['final-runtime-proof'],
    },
  ],
  blockers: finalHandoff.blockers || [],
  checklist: checklist.steps || [],
  matrix: matrix.blockers || {},
  recommendedCommands: [
    'powershell -ExecutionPolicy Bypass -File mobile/shell/materialize-android-local-properties.ps1 -SdkDir "<真实SDK路径>"',
    'Replace mobile/android-webview-shell/gradlew and gradlew.bat with a real Gradle wrapper bootstrap',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1 -RunTasks'
  ],
};

manifest.ok = manifest.inputs.every((item) => item.provided === true);

process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
