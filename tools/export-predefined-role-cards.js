#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const exporter = require('./predefined-role-card-exporter');

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    slot: 'slot-1',
    out: path.join('publish', 'predefined-role-cards'),
    publish: 'publish',
    dryRun: false,
    rawFile: '',
    printBrowserSnippet: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--slot') args.slot = argv[++i] || args.slot;
    else if (item === '--out') args.out = argv[++i] || args.out;
    else if (item === '--publish') args.publish = argv[++i] || args.publish;
    else if (item === '--raw-file') args.rawFile = argv[++i] || '';
    else if (item === '--dry-run') args.dryRun = true;
    else if (item === '--print-browser-snippet') args.printBrowserSnippet = true;
    else if (item === '-h' || item === '--help') args.help = true;
    else throw new Error(`未知参数：${item}`);
  }

  if (!args.out) args.out = path.join(args.publish, 'predefined-role-cards');
  return args;
}

function usage() {
  return [
    '用法:',
    '  node "tools/export-predefined-role-cards.js" --slot "slot-1"',
    '  node "tools/export-predefined-role-cards.js" --print-browser-snippet --slot "slot-1"',
    '  node "tools/export-predefined-role-cards.js" --raw-file "path/to/raw.txt"',
    '',
    '说明:',
    '  默认主入口是 slot；如果 Node 不能直接读取浏览器存档，先打印浏览器桥接脚本。',
    '  浏览器脚本会尝试从运行时、dzmm.kv 和 localStorage 读取 control-rpg-sqlite-${slot}。',
    '  再将导出的 raw 文件交给 --raw-file 生成 publish/predefined-role-cards/*.json 与 *.js。',
  ].join('\n');
}

function browserSnippet(slot = 'slot-1') {
  return `(async()=>{const slot=${JSON.stringify(slot)};const key=\`control-rpg-sqlite-${'${slot}'}\`;let raw=null;if(window.GameModules?.sqliteSave?.readRaw)raw=await window.GameModules.sqliteSave.readRaw(slot);if(!raw&&window.dzmm?.kv)raw=(await window.dzmm.kv.get(key))?.value||null;if(!raw)try{raw=localStorage.getItem(key)}catch(_){ }if(!raw)throw new Error('未找到存档：'+key);const blob=new Blob([raw],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=key+'.raw';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);console.log('已导出',key,'长度',raw.length);})();`;
}

function statesFromJsonText(text) {
  return exporter.extractCharacterStates(JSON.parse(text));
}

async function statesFromSqliteBase64(raw, sqlJsFactory) {
  const initSqlJs = sqlJsFactory || global.initSqlJs;
  if (!initSqlJs) {
    throw new Error('raw 不是 JSON，且当前环境没有 sql.js；请先用 --print-browser-snippet 导出 raw 文件，或安装 sql.js 解析 SQLite base64。');
  }

  const SQL = await initSqlJs();
  const bytes = Uint8Array.from(Buffer.from(String(raw).trim(), 'base64'));
  const db = new SQL.Database(bytes);
  const rows = [];

  try {
    const tables = ['character_state', 'characterStates', 'states', 'characters'];
    for (const table of tables) {
      let stmt = null;
      try {
        stmt = db.prepare(`SELECT * FROM ${table}`);
        while (stmt.step()) {
          const row = stmt.getAsObject();
          const value = row.state_json || row.value || row.data || row.json || row.character_state || row.characterStates;
          if (typeof value === 'string') {
            rows.push(JSON.parse(value));
          } else if (value && typeof value === 'object') {
            rows.push(value);
          }
        }
        if (rows.length) return rows;
      } catch (_) {
        // Try next table shape.
      } finally {
        if (stmt) stmt.free();
      }
    }

    const fallbackStmt = db.prepare('SELECT name, value FROM sqlite_master');
    try {
      while (fallbackStmt.step()) {
        const row = fallbackStmt.getAsObject();
        if (row && row.name === 'character_state') {
          break;
        }
      }
    } finally {
      fallbackStmt.free();
    }
  } finally {
    db.close();
  }

  throw new Error('SQLite raw 中未找到可解析的角色状态表。');
}

async function statesFromRaw(raw, sqlJsFactory = null) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error('raw 存档为空');

  if (text.startsWith('{') || text.startsWith('[')) {
    return statesFromJsonText(text);
  }

  return statesFromSqliteBase64(text, sqlJsFactory);
}

function slotRawCandidates(slot, publishDir = 'publish') {
  const fileBase = `control-rpg-sqlite-${slot}`;
  const publishPath = path.resolve(publishDir);
  const rootPath = path.dirname(publishPath);
  const dirs = [
    path.join(publishPath, 'save'),
    path.join(publishPath, 'saves'),
    path.join(rootPath, 'userInformation', 'save'),
    path.join(rootPath, 'userInformation', 'saves'),
  ];
  const files = [];
  for (const dir of dirs) {
    files.push(path.join(dir, `${fileBase}.raw`));
    files.push(path.join(dir, `${fileBase}.json`));
  }
  return files;
}

async function readRawBySlot(slot, publishDir = 'publish') {
  for (const file of slotRawCandidates(slot, publishDir)) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  }

  throw new Error(
    `未找到本地 slot raw 文件：control-rpg-sqlite-${slot}.raw/.json。已检查 publish/save、publish/saves、userInformation/save、userInformation/saves。` +
    `如存档仍在浏览器中，请先运行：node "tools/export-predefined-role-cards.js" --print-browser-snippet --slot "${slot}"，` +
    '把输出粘贴到游戏页面控制台下载 raw 文件，再用 --raw-file 导出。'
  );
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    console.log(usage());
    return;
  }

  if (args.printBrowserSnippet) {
    console.log(browserSnippet(args.slot));
    return;
  }

  const raw = args.rawFile ? fs.readFileSync(args.rawFile, 'utf8') : await readRawBySlot(args.slot, args.publish);
  const states = await statesFromRaw(raw);
  const bundle = exporter.buildExportBundle(states);

  if (args.dryRun) {
    console.log(JSON.stringify(bundle.map((item) => ({ slug: item.slug, name: item.name, bytes: item.json.length })), null, 2));
    return;
  }

  const written = exporter.writeExportBundle(bundle, args.out);
  written.forEach((file) => console.log(`写入 ${file}`));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  usage,
  browserSnippet,
  statesFromRaw,
  statesFromSqliteBase64,
  slotRawCandidates,
  readRawBySlot,
  main,
};
