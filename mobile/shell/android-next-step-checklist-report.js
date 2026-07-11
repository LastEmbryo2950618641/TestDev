import { execFileSync } from 'node:child_process';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

const matrix = runJson('node', ['mobile/shell/android-blocker-matrix-report.js']);
const finalHandoff = runJson('node', ['mobile/shell/android-final-handoff-overview-report.js']);
const localProps = runJson('node', ['mobile/shell/android-local-properties-materialization-report.js']);
const wrapper = runJson('node', ['mobile/shell/android-wrapper-state-report.js']);

const steps = [
  {
    id: 'materialize-local-properties',
    title: '生成正式 local.properties',
    ready: localProps.generated.present === true,
    done: localProps.target.present === true,
    blockedBy: localProps.blockers?.includes('missing-sdk-dir') ? ['missing-sdk-dir'] : [],
    command: 'powershell -ExecutionPolicy Bypass -File mobile/shell/materialize-android-local-properties.ps1 -SdkDir "<真实SDK路径>"',
  },
  {
    id: 'configure-sdk-dir',
    title: '写入真实 sdk.dir',
    ready: true,
    done: localProps.target.configured === true,
    blockedBy: [],
    command: 'powershell -ExecutionPolicy Bypass -File mobile/shell/materialize-android-local-properties.ps1 -SdkDir "<真实SDK路径>"',
  },
  {
    id: 'replace-wrapper',
    title: '替换 placeholder wrapper',
    ready: wrapper.files.localProperties.present === true,
    done: !wrapper.blockers?.includes('placeholder-wrapper'),
    blockedBy: wrapper.files.localProperties.present ? [] : ['missing-local-properties'],
    command: 'Replace mobile/android-webview-shell/gradlew and gradlew.bat with a real Gradle wrapper bootstrap',
  },
  {
    id: 'run-gradle-tasks',
    title: '执行 gradlew.bat tasks',
    ready: wrapper.files.localProperties.configured === true && !wrapper.blockers?.includes('placeholder-wrapper'),
    done: finalHandoff.blockers.length === 0,
    blockedBy: finalHandoff.blockers || [],
    command: 'powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1 -RunTasks',
  },
];

const report = {
  runtimeFamily: 'android-next-step-checklist-report',
  stage: 'android-next-step-checklist-report',
  blockers: matrix.blockers,
  steps,
  recommendedCommands: [
    'node mobile/shell/android-blocker-matrix-report.js',
    'node mobile/shell/android-local-properties-materialization-report.js',
    'node mobile/shell/android-wrapper-state-report.js',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/materialize-android-local-properties.ps1 -SdkDir "<真实SDK路径>"',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1 -RunTasks'
  ],
};

report.ok = steps.every((step) => step.done === true);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
