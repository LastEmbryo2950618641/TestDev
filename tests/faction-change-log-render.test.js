const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'publish', 'index.html'), 'utf8');
const changeLogFallback = '\u5df2\u8bb0\u5f55\u8c03\u6574\u3002';

assert.ok(
  html.includes("x-for=\"(log, index) in ($store.game.selectedFaction()?.changeLog || []).filter(Boolean).slice(0, 12)\""),
  'faction change log should filter empty entries before rendering',
);

assert.ok(
  html.includes(":key=\"`${index}-${log.at || 'unknown'}-${log.field || 'field'}-${log.action || 'change'}`\""),
  'faction change log should include index in x-for key to avoid duplicate-key Alpine crashes',
);

assert.ok(
  html.includes("log.action || 'change'") && html.includes(`log.reason || '${changeLogFallback}'`),
  'faction change log should render safe fallback text for partial log records',
);

console.log('PASS faction change log rendering is stable for duplicate or partial records');
