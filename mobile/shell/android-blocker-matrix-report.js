import { execFileSync } from 'node:child_process';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

const toolchain = runJson('node', ['mobile/shell/android-webview-toolchain-overview-report.js']);
const execution = runJson('node', ['mobile/shell/android-execution-state-report.js']);
const localProps = runJson('node', ['mobile/shell/android-local-properties-materialization-report.js']);
const wrapper = runJson('node', ['mobile/shell/android-wrapper-state-report.js']);
const finalHandoff = runJson('node', ['mobile/shell/android-final-handoff-overview-report.js']);

const matrix = {
  runtimeFamily: 'android-blocker-matrix-report',
  stage: 'android-blocker-matrix-report',
  blockers: {
    missingLocalProperties: {
      active: finalHandoff.blockers?.includes('missing-local-properties') === true,
      toolchain: toolchain.blockers?.includes('missing-local-properties') === true,
      execution: execution.blockers?.includes('missing-local-properties') === true,
      localProperties: localProps.blockers?.includes('missing-local-properties') === true,
      wrapper: wrapper.blockers?.includes('missing-local-properties') === true,
    },
    missingSdkDir: {
      active: finalHandoff.blockers?.includes('missing-sdk-dir') === true,
      toolchain: toolchain.blockers?.includes('missing-sdk-dir') === true,
      execution: execution.blockers?.includes('missing-sdk-dir') === true,
      localProperties: localProps.blockers?.includes('missing-sdk-dir') === true,
      wrapper: wrapper.blockers?.includes('missing-sdk-dir') === true,
    },
    placeholderWrapper: {
      active: finalHandoff.blockers?.includes('placeholder-wrapper') === true,
      toolchain: toolchain.blockers?.includes('placeholder-wrapper') === true,
      execution: execution.blockers?.includes('placeholder-wrapper') === true,
      localProperties: localProps.blockers?.includes('placeholder-wrapper') === true,
      wrapper: wrapper.blockers?.includes('placeholder-wrapper') === true,
    },
  },
  reports: {
    toolchain,
    execution,
    localProperties: localProps,
    wrapper,
    finalHandoff,
  },
  recommendedCommands: [
    'node mobile/shell/android-final-handoff-overview-report.js',
    'node mobile/shell/android-local-properties-materialization-report.js',
    'node mobile/shell/android-wrapper-state-report.js',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/materialize-android-local-properties.ps1 -SdkDir "<真实SDK路径>"',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1 -RunTasks'
  ],
};

matrix.ok = Object.values(matrix.blockers).every((item) => item.active === false);

process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
