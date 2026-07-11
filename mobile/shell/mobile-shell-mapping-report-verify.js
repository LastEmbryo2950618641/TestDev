import { createMobileShellMappingReport } from './mobile-shell-mapping-report.js';

const report = createMobileShellMappingReport();
process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'mobile-shell-mapping-report-verify',
  ok: Array.isArray(report.shells) && report.shells.length === 2 && report.recommendation?.currentPreferredShell === 'android-webview-shell',
  recommendation: report.recommendation,
  artifactChecks: report.artifactChecks,
  shells: report.shells.map((item) => ({
    shell: item.shell,
    fit: item.fit,
    rendererEntry: item.runtime?.rendererEntry || '',
    loadStrategy: item.runtime?.loadStrategy || '',
    hostPathReady: item.storage?.hostPathReady === true,
  })),
}, null, 2)}\n`);
