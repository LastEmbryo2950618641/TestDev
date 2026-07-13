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
  {
    label: 'event ui helper dependencies',
    before: 'ui/event/view-helpers.js',
    required: [
      'ui/event/panel-view-helpers.js',
      'ui/event/label-view-helpers.js',
    ],
  },
  {
    label: 'company ui helper dependencies',
    before: 'ui/company/view-helpers.js',
    required: [
      'ui/company/company-pay-view-helpers.js',
      'ui/company/company-field-view-helpers.js',
      'ui/company/company-attendance-view-helpers.js',
      'ui/company/company-summary-view-helpers.js',
      'ui/company/company-contract-view-helpers.js',
      'ui/company/company-organization-view-helpers.js',
      'ui/company/company-field-section-view-helpers.js',
      'ui/company/company-employment-record-view-helpers.js',
    ],
  },
  {
    label: 'real-world map ui helper dependencies',
    before: 'ui/real-world/map-view-helpers.js',
    required: [
      'ui/real-world/map-shell-view-helpers.js',
      'ui/real-world/map-info-view-helpers.js',
      'ui/real-world/map-control-view-helpers.js',
      'ui/real-world/map-interior-view-helpers.js',
    ],
  },
  {
    label: 'settings action ui helper dependencies',
    before: 'settings-actions.js',
    required: [
      'ui/settings/view-helpers.js',
    ],
  },
  {
    label: 'loading action runtime dependencies',
    before: 'loading-actions.js',
    required: [
      'app/loading/deferred-init-flow.js',
      'app/loading/desktop-module-flow.js',
      'app/loading/startup-warmup.js',
      'ui/loading/progress-view.js',
    ],
  },
  {
    label: 'save action runtime dependencies',
    before: 'save-actions.js',
    required: [
      'app/save/slot-flow.js',
      'app/save/slot-mutation-flow.js',
      'ui/save/slot-view.js',
    ],
  },
  {
    label: 'storage restore helper dependencies',
    before: 'storage.js',
    required: [
      'domain/storage/restore-state-helpers.js',
      'domain/storage/restore-settings-helpers.js',
      'app/storage/restore-post-flow.js',
    ],
  },
  {
    label: 'calendar action ui helper dependencies',
    before: 'calendar-actions.js',
    required: [
      'ui/calendar/view-helpers.js',
    ],
  },
  {
    label: 'faction action ui helper dependencies',
    before: 'faction-actions.js',
    required: [
      'ui/faction/overview-view-helpers.js',
    ],
  },
  {
    label: 'real-world map action ui helper dependencies',
    before: 'real-world-map-actions.js',
    required: [
      'ui/real-world/map-stage-view-helpers.js',
    ],
  },
  {
    label: 'wechat worldline runtime dependencies',
    before: 'wechat-worldline-actions.js',
    required: [
      'domain/worldline/wechat-event-service.js',
      'app/wechat/worldline-orchestration.js',
    ],
  },
  {
    label: 'wechat change panel runtime dependencies',
    before: 'wechat-change-panel-actions.js',
    required: [
      'ui/wechat/view-helpers.js',
      'domain/wechat/change-panel-helpers.js',
      'app/wechat/change-panel-orchestration.js',
    ],
  },
  {
    label: 'critical action game runtime dependencies',
    required: [
      'ui/critical-action/metric-view-helpers.js',
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
    const beforeIndex = group.before ? list.indexOf(group.before) : Number.POSITIVE_INFINITY;
    if (group.before && beforeIndex === -1) {
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
