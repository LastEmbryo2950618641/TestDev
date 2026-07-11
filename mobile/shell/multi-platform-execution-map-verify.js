const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'docs', 'architecture', 'multi-platform-execution-map-2026-07-12.md');
const text = fs.readFileSync(target, 'utf8');

const requiredPhrases = [
  'publish/',
  'desktop/',
  'mobile/',
  'node mobile/shell/multi-platform-handoff-overview-report.js',
  'node publish/platform/unified-platform-verification-suite.js',
  'desktop/README.md',
  'desktop/shell/desktop-packaging-toolchain-preflight.cli.js',
  'desktop/shell/desktop-packaging-dry-run-plan.cli.js',
  'mobile/android-webview-shell/BUILD-LAUNCH-CHECKLIST.md',
  'node mobile/shell/android-webview-toolchain-overview-report.js',
  'browser-direct-launch-boundary-2026-07-12.md',
  'http://127.0.0.1:8000/',
  'missing-sdk-dir',
  'placeholder-wrapper'
];

const missing = requiredPhrases.filter((item) => !text.includes(item));

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'multi-platform-execution-map-doc',
  stage: 'multi-platform-execution-map-doc-verify',
  ok: missing.length === 0,
  file: 'docs/architecture/multi-platform-execution-map-2026-07-12.md',
  missing,
}, null, 2)}\n`);
