import fs from 'node:fs';

const snapshotPath = 'docs/architecture/android-toolchain-status-snapshot-2026-07-12.md';
const handoffPath = 'docs/architecture/android-toolchain-handoff-2026-07-12.md';
const snapshot = fs.existsSync(snapshotPath) ? fs.readFileSync(snapshotPath, 'utf8') : '';
const handoff = fs.existsSync(handoffPath) ? fs.readFileSync(handoffPath, 'utf8') : '';

const checks = {
  snapshotReady: snapshot.includes('当前真正阻塞 Android shell 进入真实 Gradle 构建的点是'),
  handoffReady: handoff.includes('当前真正要做的事'),
  snapshotMentionsAttemptRecord: snapshot.includes('.last-build-attempt.json'),
  handoffMentionsSdkAndWrapper: handoff.includes('Android SDK') && handoff.includes('Gradle wrapper'),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-toolchain-docs-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  files: {
    snapshotPath,
    handoffPath,
  },
}, null, 2)}\n`);
