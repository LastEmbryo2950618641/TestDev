import fs from 'node:fs';
import path from 'node:path';

function exists(targetPath) {
  return fs.existsSync(targetPath);
}

function statOrNull(targetPath) {
  try {
    const stat = fs.statSync(targetPath);
    return {
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

const shellRoot = path.resolve(process.cwd(), 'desktop', 'shell');
const minimalExe = path.resolve(shellRoot, 'dist-minimal', 'win-unpacked', 'GamefyMinimal.exe');
const mainExe = path.resolve(shellRoot, 'dist', 'win-unpacked', 'Gamefy.exe');
const minimalYaml = path.resolve(shellRoot, 'dist-minimal', 'builder-debug.yml');
const mainYaml = path.resolve(shellRoot, 'dist', 'builder-debug.yml');

const report = {
  runtimeFamily: 'desktop-exe-output-state-report',
  stage: 'desktop-exe-output-state-report',
  outputs: {
    minimalExe: {
      path: minimalExe,
      present: exists(minimalExe),
      ...statOrNull(minimalExe),
    },
    mainExe: {
      path: mainExe,
      present: exists(mainExe),
      ...statOrNull(mainExe),
    },
    minimalBuilderDebug: {
      path: minimalYaml,
      present: exists(minimalYaml),
      ...statOrNull(minimalYaml),
    },
    mainBuilderDebug: {
      path: mainYaml,
      present: exists(mainYaml),
      ...statOrNull(mainYaml),
    },
  },
};

report.summary = {
  minimalExeReady: report.outputs.minimalExe.present,
  mainExeReady: report.outputs.mainExe.present,
  anyDesktopExeReady: report.outputs.minimalExe.present || report.outputs.mainExe.present,
};

report.blockers = [
  !report.summary.anyDesktopExeReady ? 'no-desktop-exe-artifact' : null,
].filter(Boolean);

report.ok = report.summary.anyDesktopExeReady;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
