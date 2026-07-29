const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const loop = fs.readFileSync(path.join(root, 'publish/real-world-agent-loop.js'), 'utf8');
const intro = fs.readFileSync(path.join(root, 'publish/inference/intro-card-stage-update.js'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'publish/real-world-profile-stage5.js'), 'utf8');
const faction = fs.readFileSync(path.join(root, 'publish/inference/faction-stage-update.js'), 'utf8');
const life = fs.readFileSync(path.join(root, 'publish/inference/life-energy-stage.js'), 'utf8');
const news = fs.readFileSync(path.join(root, 'publish/inference/news-driver-stage-update.js'), 'utf8');
const work = fs.readFileSync(path.join(root, 'publish/inference/work-performance-stage-update.js'), 'utf8');

assert.ok(loop.includes("if (config.reasoningPhase) return this.normalizeReasoningPhase(config.reasoningPhase);"));
assert.ok(loop.includes("if (/^stage(?:[2-9]|1[0-3])$/u.test(phase)) {"));
assert.ok(loop.includes("return /^(stage(?:[4-9]|1[0-3]))$/u.test(phase);"));
assert.ok(loop.includes("match(/^Stage\\s*(1[0-3]|[1-9])"));
assert.ok(!loop.includes('深度思考中…'));

assert.ok(intro.includes('completeCachedJsonPrompt(store, {'));
assert.ok(profile.includes('completeCachedJsonPrompt(store, {'));
assert.ok(faction.includes('completeCachedJsonPrompt(store, {'));
assert.ok(life.includes('completeCachedJsonPrompt(store, {'));
assert.ok(news.includes('completeCachedJsonPrompt(store, {'));
assert.ok(work.includes('completeCachedJsonPrompt(store, {'));

assert.ok(faction.includes("reasoningPhase: 'stage9'"));
assert.ok(life.includes("promptId: 'inference-stage10-life-energy-exp'"));
assert.ok(life.includes("reasoningPhase: 'stage11'"));
assert.ok(news.includes("reasoningPhase: 'stage12'"));
assert.ok(work.includes("promptId: 'inference-stage13-work-performance-update'"));
assert.ok(work.includes("reasoningPhase: 'stage13'"));
assert.ok(loop.includes('Stage13 工作与绩效'));

console.log('stage5-13 settlement thinking wiring verified');
