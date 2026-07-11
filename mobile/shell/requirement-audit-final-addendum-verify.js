const fs = require('fs');
const path = require('path');

const file = path.resolve(process.cwd(), 'docs', 'architecture', 'requirement-audit-final-addendum-2026-07-12.md');
const text = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  '低耦合',
  '代码复用性',
  '功能玩法不变',
  '可调整架构',
  '降低关联性影响风险',
  '代码架构与目录规范化',
  'Windows exe',
  'Web index.html',
  'Android apk',
  '真实 Android SDK 路径',
  'local.properties',
  'Gradle wrapper'
];
const missing = requiredPhrases.filter((item) => !text.includes(item));

process.stdout.write(JSON.stringify({
  runtimeFamily: 'requirement-audit-final-addendum-verify',
  stage: 'requirement-audit-final-addendum-verify',
  ok: missing.length === 0,
  file: 'docs/architecture/requirement-audit-final-addendum-2026-07-12.md',
  missing,
}, null, 2) + '\n');
