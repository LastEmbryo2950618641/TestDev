const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'publish', 'real-world-agent-loop.js'), 'utf8');

assert.ok(source.includes("const normalizedPhase = this.normalizeReasoningPhase(config.reasoningPhase || (streamToUi ? 'stage3' : 'unknown'));"));
assert.ok(source.includes("const defaultTimeoutMs = normalizedPhase === 'stage3'"));
assert.ok(source.includes("? (streamToUi ? 480000 : 180000)"));
assert.ok(source.includes(": (streamToUi ? 240000 : 90000);"));
console.log('PASS stage3 timeout config uses extended defaults');
