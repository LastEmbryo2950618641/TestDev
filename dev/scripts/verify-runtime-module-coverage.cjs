const fs = require('fs');
const path = require('path');
const {
  collectManifestFiles,
  readScriptManifest,
} = require('./manifest-utils.cjs');

const moduleRoots = [
  'publish/app',
  'publish/domain',
  'publish/ui',
];

const runtimeLists = [
  { path: 'publish/boot/script-manifest.js', type: 'script-manifest' },
  { path: 'publish/boot/scripts.json', type: 'scripts-json' },
  { path: 'mobile/android-webview-shell/app/src/main/assets/publish/boot/script-manifest.js', type: 'script-manifest' },
  { path: 'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json', type: 'scripts-json' },
];

function normalizePath(file) {
  return file.replace(/\\/g, '/');
}

function collectRuntimeModules() {
  const files = [];
  for (const root of moduleRoots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          stack.push(abs);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          files.push(normalizePath(path.relative('publish', abs)));
        }
      }
    }
  }
  return files.sort();
}

function readRuntimeList(entry) {
  if (entry.type === 'script-manifest') {
    return collectManifestFiles(readScriptManifest(entry.path)).map((row) => normalizePath(row.file));
  }
  if (entry.type === 'scripts-json') {
    return JSON.parse(fs.readFileSync(entry.path, 'utf8')).map(normalizePath);
  }
  throw new Error(`Unsupported runtime list type: ${entry.type}`);
}

const runtimeModules = collectRuntimeModules();
const violations = [];

for (const entry of runtimeLists) {
  const listed = new Set(readRuntimeList(entry));
  for (const file of runtimeModules) {
    if (!listed.has(file)) {
      violations.push({ runtimeList: entry.path, file });
    }
  }
}

const summary = {
  moduleRoots,
  runtimeModules: runtimeModules.length,
  runtimeLists: runtimeLists.length,
  violations: violations.length,
};

console.log(JSON.stringify(summary, null, 2));

if (violations.length) {
  console.error('[runtime-coverage] Runtime module coverage violations:');
  for (const violation of violations) {
    console.error(`- ${violation.runtimeList}: missing ${violation.file}`);
  }
  process.exit(1);
}
