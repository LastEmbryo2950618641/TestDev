#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', 'publish');
const skill = fs.readFileSync(path.join(root, 'skill-docs-inline.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'inference-prompts-runtime.js'), 'utf8');

function extractFromSkill(skillKey) {
  const marker = `"${skillKey}":`;
  const idx = skill.indexOf(marker);
  if (idx < 0) return null;
  const chunk = skill.slice(idx);
  const m = chunk.match(/## 模板源码\\n\\n````md\\n([\s\S]*?)\\n````/);
  if (!m) return null;
  return m[1]
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function extractFromRuntime(id, fileComment) {
  const esc = fileComment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`// ${esc}[\\s\\S]*?inline\\["${id}"\\] = "([\\s\\S]*?)";`);
  const m = runtime.match(re);
  if (!m) return null;
  return JSON.parse(`"${m[1]}"`);
}

const skillTargets = [
  ['prompts/character-profile-csv-fix.md', 'prompts/character/character-profile-csv-fix/SKILL.md'],
  ['prompts/character-profile-missing-fields.md', 'prompts/character/character-profile-missing-fields/SKILL.md'],
  ['prompts/real-world-map-surround-unlock.md', 'prompts/real-world/real-world-map-surround-unlock/SKILL.md'],
  ['prompts/worldline-plot-summary.md', 'prompts/world/worldline-plot-summary/SKILL.md'],
  ['prompts/wechat-history-decision.md', 'prompts/wechat/wechat-history-decision/SKILL.md'],
  ['prompts/real-world-final-style-polish.md', 'prompts/world/real-world-final-style-polish/SKILL.md'],
  ['prompts/taobao-product-generate.md', 'prompts/淘宝/taobao-product-generate/SKILL.md'],
  ['prompts/推演引擎/stage5-profile-gate.md', 'prompts/inference/inference-stage5-profile-gate/SKILL.md'],
  ['prompts/推演引擎/stage5-dressed-profile-patch.md', 'prompts/inference/inference-stage5-dressed-profile-patch/SKILL.md'],
];

const runtimeTargets = [
  ['inference-update-territory-control', 'prompts/推演引擎/update/territory-control-update-prompt.md', 'prompts/推演引擎/update/territory-control-update-prompt.js'],
  ['inference-update-org-capability-entry', 'prompts/推演引擎/update/org-capability-entry-update-prompt.md', 'prompts/推演引擎/update/org-capability-entry-update-prompt.js'],
  ['inference-update-membership', 'prompts/推演引擎/update/membership-update-prompt.md', 'prompts/推演引擎/update/membership-update-prompt.js'],
  ['inference-update-org-status', 'prompts/推演引擎/update/org-status-update-prompt.md', 'prompts/推演引擎/update/org-status-update-prompt.js'],
];

const fail = [];
let ok = 0;

for (const [out, skillKey] of skillTargets) {
  const text = extractFromSkill(skillKey);
  if (!text) {
    fail.push(`${out}: skill extract failed`);
    continue;
  }
  const fp = path.join(root, out);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, text, 'utf8');
  ok += 1;
  console.log('WROTE', out, text.length);
}

for (const [id, out, comment] of runtimeTargets) {
  const text = extractFromRuntime(id, comment);
  if (!text) {
    fail.push(`${out}: runtime extract failed`);
    continue;
  }
  const fp = path.join(root, out);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, text, 'utf8');
  ok += 1;
  console.log('WROTE', out, text.length);
}

console.log(`OK ${ok} FAIL ${fail.length}`);
if (fail.length) {
  console.error(fail.join('\n'));
  process.exit(1);
}
