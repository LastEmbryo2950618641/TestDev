import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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

function readJson(targetPath) {
  try {
    const raw = fs.readFileSync(targetPath, 'utf8').replace(/^\uFEFF/, '').trim();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function runAdbDevices(adbPath) {
  if (!exists(adbPath)) {
    return { present: false, devices: [], raw: '' };
  }
  try {
    const output = execFileSync(adbPath, ['devices'], { encoding: 'utf8' });
    const lines = String(output || '').replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const devices = lines
      .filter((line) => !/^List of devices attached$/i.test(line) && !/^\*/.test(line))
      .map((line) => {
        const [serial, state] = line.split(/\s+/);
        return { serial: serial || '', state: state || '' };
      })
      .filter((entry) => entry.serial);
    return { present: true, devices, raw: String(output || '').trim() };
  } catch (error) {
    return {
      present: true,
      devices: [],
      raw: String(error?.stdout || error?.message || '').trim(),
      error: String(error?.stderr || error?.message || '').trim(),
    };
  }
}

const shellRoot = path.resolve(process.cwd(), 'mobile', 'android-webview-shell');
const apkPath = path.resolve(shellRoot, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const metadataPath = path.resolve(shellRoot, 'app', 'build', 'outputs', 'apk', 'debug', 'output-metadata.json');
const adbPath = path.resolve(process.env.USERPROFILE || '', 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe');

const apkStat = statOrNull(apkPath);
const metadata = readJson(metadataPath);
const adb = runAdbDevices(adbPath);

const report = {
  runtimeFamily: 'android-apk-output-state-report',
  stage: 'android-apk-output-state-report',
  outputs: {
    apk: {
      path: apkPath,
      present: exists(apkPath),
      ...apkStat,
    },
    metadata: {
      path: metadataPath,
      present: exists(metadataPath),
      content: metadata,
    },
  },
  adb: {
    path: adbPath,
    present: adb.present,
    devices: adb.devices,
    hasConnectedDevice: adb.devices.length > 0,
    raw: adb.raw,
    error: adb.error || '',
  },
  summary: {
    debugApkReady: exists(apkPath),
    installReady: exists(apkPath) && adb.present,
    deviceReady: adb.devices.length > 0,
  },
};

report.blockers = [
  !report.outputs.apk.present ? 'missing-debug-apk' : null,
  !report.adb.present ? 'adb-unavailable' : null,
  report.adb.present && !report.adb.hasConnectedDevice ? 'no-connected-android-device' : null,
].filter(Boolean);

report.ok = report.outputs.apk.present && report.adb.present;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
