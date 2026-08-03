const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const actionsPath = path.join(root, 'publish', 'real-world-actions.js');
const source = fs.readFileSync(actionsPath, 'utf8');

[
  'applyStage44SettlementRecords',
  'applyPostStageTimeAndNews',
  'applyPostStageCommunicationAndDrive',
  'applyPostStageMapAndLocation',
].forEach((name) => {
  assert(
    new RegExp(`async\\s+${name}\\s*\\(|${name}\\s*\\(`).test(source),
    `missing helper: ${name}`,
  );
});

assert(
  source.includes('await this.applyStage44SettlementRecords?.(result, legacyResult, settlement, id)'),
  'applyRealWorldResult should call Stage4-4 settlement records helper',
);
assert(
  source.includes('const timing = this.applyPostStageTimeAndNews?.(result, settlement, id)'),
  'applyRealWorldResult should call time/news helper',
);
assert(
  source.includes('await this.applyPostStageCommunicationAndDrive?.(result, settlement, id, timing)'),
  'applyRealWorldResult should call communication/drive helper',
);
assert(
  source.includes('await this.applyPostStageMapAndLocation?.(result, settlement, id, state)'),
  'applyRealWorldResult should call map/location helper',
);
assert(
  !source.includes('if (false) {'),
  'applyRealWorldResult should not keep disabled legacy inline stage blocks',
);

console.log('real-world stage split structure ok');
