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
const draft = runJson('node', ['mobile/shell/android-local-properties-draft.js']);
const targetPath = path.resolve(projectRoot, 'local.properties');
const generatedPath = path.resolve(projectRoot, 'local.properties.generated');
const localPropertiesText = readText(targetPath);
const generatedText = readText(generatedPath);

const report = {
  runtimeFamily: 'android-local-properties-materialization-report',
  stage: 'android-local-properties-materialization-report',
  draft,
  target: {
    path: targetPath,
    present: fs.existsSync(targetPath),
    configured: /sdk\.dir\s*=\s*.+/.test(localPropertiesText),
    preview: localPropertiesText.slice(0, 160),
  },
  generated: {
    path: generatedPath,
    present: fs.existsSync(generatedPath),
    configured: /sdk\.dir\s*=\s*.+/.test(generatedText),
    preview: generatedText.slice(0, 160),
  },
  recommendedCommands: [
    'node mobile/shell/android-local-properties-draft.js',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/materialize-android-local-properties.ps1 -SdkDir "<真实SDK路径>"'
  ],
};

report.blockers = [
  !report.generated.present ? 'missing-generated-draft' : null,
  !report.target.present ? 'missing-local-properties' : null,
  !report.target.configured ? 'missing-sdk-dir' : null,
].filter(Boolean);

report.ok = draft.runtimeFamily === 'android-local-properties-draft'
  && report.target.present === true
  && report.target.configured === true;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
