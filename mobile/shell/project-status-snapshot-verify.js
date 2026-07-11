const fs = require('fs');
const path = require('path');

const file = path.resolve(process.cwd(), 'docs', 'architecture', 'project-status-snapshot-2026-07-12.md');
const text = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'Desktop：准收官态',
  'Web：当前权威运行形态已完成',
  'Android：内部准备链完成，但外部环境闭环未完成',
  '低耦合',
  '代码复用性',
  '功能玩法不变',
  '可调整架构',
  '降低关联性影响风险',
  '代码架构与目录规范化',
  '真实 Android SDK 路径',
  'gradlew.bat tasks'
];
const missing = requiredPhrases.filter((item) => !text.includes(item));

process.stdout.write(JSON.stringify({
  runtimeFamily: 'project-status-snapshot-verify',
  stage: 'project-status-snapshot-verify',
  ok: missing.length === 0,
  file: 'docs/architecture/project-status-snapshot-2026-07-12.md',
  missing,
}, null, 2) + '\n');
