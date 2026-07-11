#!/usr/bin/env node
/** 从 agent transcript 提取 slot 导出 JSON 并更新预定义角色卡 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const transcriptPath = process.argv[2] || path.join(
  process.env.USERPROFILE || '',
  '.cursor/projects/f-TestDev-main-TestDev-main/agent-transcripts/9df9dc48-c303-4e1b-954d-afc15d982357/9df9dc48-c303-4e1b-954d-afc15d982357.jsonl',
);
const outPath = path.join(__dirname, '../publish/predefined-role-cards/slot-2-export.json');

const lines = fs.readFileSync(transcriptPath, 'utf8').split(/\r?\n/).filter(Boolean);
let raw = '';
for (const line of lines) {
  try {
    const row = JSON.parse(line);
    if (row.role !== 'user') continue;
    const text = row.message?.content?.find((c) => c.type === 'text')?.text || '';
    if (!text.includes('"slot": "slot-2"') && !text.includes('"slot":"slot-2"')) continue;
    const match = text.match(/[\u201c\u201d"]?\s*(\{\s*"slot"\s*:\s*"slot-2"[\s\S]*)\s*[\u201c\u201d"]?\s*$/);
    if (match) {
      raw = match[1].trim().replace(/[\u201c\u201d"]\s*$/u, '').trim();
      break;
    }
  } catch {
    // skip malformed lines
  }
}

if (!raw) {
  console.error('Could not find slot-2 export in transcript');
  process.exit(1);
}

// Validate JSON
const data = JSON.parse(raw);
fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Wrote ${outPath} (${data.characters?.length || 0} characters)`);

execSync(`node "${path.join(__dirname, 'update-predefined-from-export.js')}" "${outPath}"`, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});
