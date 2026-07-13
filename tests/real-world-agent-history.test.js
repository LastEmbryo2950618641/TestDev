const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function run() {
  const rows = [
    { id: 'u1', type: 'user', text: '前往车站' },
    { id: 'a1', type: 'ai', locationName: '成都东站', narration: '列车即将进站。' },
  ];
  const calls = [];
  const context = vm.createContext({
    console,
    Date,
    JSON,
    Math,
    Number,
    Set,
    String,
    window: {
      GameModules: {
        realWorldLogStore: {
          count: () => rows.length,
          list: (page, size) => {
            calls.push([page, size]);
            return rows.slice();
          },
        },
        realWorldAgentContext: {
          limit: (text, size) => String(text).slice(0, size),
          eventsByIds(line, ids) {
            const idSet = new Set(ids);
            return (line.events || []).filter((event) => idSet.has(event.id) || idSet.has(event.eventId));
          },
          eventLine(event) {
            return `${event.id || event.eventId}｜${event.time || ''}｜${event.name || ''}`;
          },
        },
      },
    },
  });
  const source = fs.readFileSync(path.join(root, 'publish', 'real-world-agent-history.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'publish/real-world-agent-history.js' });
  const history = context.window.GameModules.realWorldAgentContext;
  const store = {
    realWorldLog: [],
    realWorldline: () => ({
      events: [{ id: 'e1', time: '2026年7月14日 10:30:00', name: '抵达车站', detail: '到达候车厅' }],
      plots: [],
      pendingPlot: { recordIds: ['e1'] },
    }),
  };

  assert.deepStrictEqual(JSON.parse(JSON.stringify(history.allRealWorldRows(store))), rows);
  assert.deepStrictEqual(calls, [[1, 2]]);
  assert.match(history.history(store, 'searchRealWorldLog', { keyword: '成都' }), /现实：成都东站/);
  assert.match(history.worldlinePending(store), /抵达车站/);
  assert.strictEqual(
    history.parseHistoryTime('2026年7月14日 10:30:00'),
    new Date(2026, 6, 14, 10, 30, 0).getTime(),
  );

  console.log('PASS real-world history uses shared log storage and preserves Chinese history queries');
}

run();
