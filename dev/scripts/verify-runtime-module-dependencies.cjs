const fs = require('fs');
const path = require('path');
const vm = require('vm');

const runtimeLists = [
  { path: 'publish/boot/scripts.json', type: 'scripts-json' },
  { path: 'publish/boot/script-manifest.js', type: 'script-manifest' },
  { path: 'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json', type: 'scripts-json' },
  { path: 'mobile/android-webview-shell/app/src/main/assets/publish/boot/script-manifest.js', type: 'script-manifest' },
];

const orderedGroups = [
  {
    label: 'worldline ui helper dependencies',
    before: 'ui/worldline/view-helpers.js',
    required: [
      'ui/worldline/lore-view-helpers.js',
      'ui/worldline/timeline-view-helpers.js',
      'ui/worldline/plot-view-helpers.js',
      'ui/worldline/timeline-panel-view-helpers.js',
      'ui/worldline/real-plot-summary-view-helpers.js',
    ],
  },
];

function normalizePath(file) {
  return file.replace(/\\/g, '/');
}

function readScriptsJson(manifestPath) {
  return JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8')).map(normalizePath);
}

function readScriptManifest(manifestPath) {
  const abs = path.resolve(manifestPath);
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: abs });
  const chunks = sandbox.window.GameScriptManifest?.chunks || {};
  return Object.values(chunks).flat().map(normalizePath);
}

function readList(entry) {
  if (entry.type === 'scripts-json') return readScriptsJson(entry.path);
  if (entry.type === 'script-manifest') return readScriptManifest(entry.path);
  throw new Error(`Unsupported runtime list type: ${entry.type}`);
}

const violations = [];

for (const entry of runtimeLists) {
  const list = readList(entry);
  for (const group of orderedGroups) {
    const beforeIndex = list.indexOf(group.before);
    if (beforeIndex === -1) {
      violations.push({ manifest: entry.path, group: group.label, issue: 'missing-before', file: group.before });
      continue;
    }
    for (const required of group.required) {
      const requiredIndex = list.indexOf(required);
      if (requiredIndex === -1) {
        violations.push({ manifest: entry.path, group: group.label, issue: 'missing-required', file: required });
      } else if (requiredIndex > beforeIndex) {
        violations.push({ manifest: entry.path, group: group.label, issue: 'loaded-after-facade', file: required, before: group.before });
      }
    }
  }
}

const summary = {
  runtimeLists: runtimeLists.length,
  groups: orderedGroups.length,
  violations: violations.length,
};

console.log(JSON.stringify(summary, null, 2));

if (violations.length) {
  console.error('[runtime-deps] Runtime module dependency order violations:');
  for (const violation of violations) {
    const suffix = violation.before ? ` before ${violation.before}` : '';
    console.error(`- ${violation.manifest}: ${violation.issue} ${violation.file}${suffix} (${violation.group})`);
  }
  process.exit(1);
}
