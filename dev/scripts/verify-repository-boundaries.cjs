const { execFileSync } = require('child_process');

const blockedTrackedPatterns = [
  'node_modules/',
  'desktop/shell/dist/',
  'desktop/shell/dist-minimal/',
  'desktop/shell/.electron-dist/',
  'desktop/shell/.artifacts/',
  'desktop/shell/.verify-storage/',
  'publish/platform/.artifacts/',
  'mobile/android-webview-shell/.gradle/',
  'mobile/android-webview-shell/.artifacts/',
  'mobile/android-webview-shell/app/build/',
  'mobile/android-webview-shell/local.properties',
  'mobile/android-webview-shell/local.properties.generated',
  'mobile/shell/.verify-storage/',
  'mobile/shell/.bridge-verify-storage/',
  'mobile/tools/',
  'tools/validation-browser/node_modules/',
  'tools/validation-browser/tmp-*.mjs',
  'temp_status_list.txt',
];

function normalizePath(file) {
  return file.replace(/^"|"$/g, '').replace(/\\/g, '/');
}

function gitLsFiles(pattern) {
  return execFileSync('git', ['ls-files', '--', pattern], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 8 })
    .split(/\r?\n/)
    .map((file) => normalizePath(file.trim()))
    .filter(Boolean);
}

const violations = [];

for (const pattern of blockedTrackedPatterns) {
  for (const file of gitLsFiles(pattern)) {
    violations.push({ file, pattern });
  }
}

const summary = {
  blockedPatterns: blockedTrackedPatterns.length,
  violations: violations.length,
};

console.log(JSON.stringify(summary, null, 2));

if (violations.length) {
  console.error('[repo-boundaries] Generated/local files are tracked by Git:');
  for (const violation of violations.slice(0, 80)) {
    console.error(`- ${violation.file} (matched ${violation.pattern})`);
  }
  if (violations.length > 80) {
    console.error(`...and ${violations.length - 80} more`);
  }
  process.exit(1);
}
