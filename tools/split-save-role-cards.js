#!/usr/bin/env node
/**
 * 将存档导出的角色卡大 JSON 拆成多张小 JSON。
 *
 * 用法：
 *   node tools/split-save-role-cards.js <save-export.json> [out-dir] [--overwrite]
 *
 * 输入必须是存档导出格式：
 *   { "slot": "...", "characters": [ { ...完整角色卡... } ] }
 *
 * 输出只写每个 characters[i] 的原始对象，不读取 profile 子字段、不改结构、不丢字段。
 */
const fs = require('fs');
const path = require('path');

function stripBom(text = '') {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

function readJson(file) {
  return JSON.parse(stripBom(fs.readFileSync(file, 'utf8')));
}

function assertSaveExport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('输入必须是对象格式的存档导出 JSON。');
  }
  if (!Array.isArray(data.characters)) {
    throw new Error('存档导出 JSON 必须包含 characters 数组。');
  }
  return data.characters;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeFilePart(value, fallback) {
  const text = String(value || fallback || '').trim();
  const safe = text
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safe || String(fallback);
}

function outputFileName(character, index) {
  const order = String(index + 1).padStart(2, '0');
  const name = safeFilePart(character?.name || character?.profile?.name, `role-${order}`);
  const id = safeFilePart(character?.id || character?.profile?.id, '');
  return id ? `${order}-${name}-${id}.json` : `${order}-${name}.json`;
}

function splitSaveRoleCards(inputPath, options = {}) {
  const resolvedInput = path.resolve(inputPath);
  const data = readJson(resolvedInput);
  const characters = assertSaveExport(data);
  const outDir = path.resolve(options.outDir || path.join(path.dirname(resolvedInput), 'split-role-cards'));
  const overwrite = Boolean(options.overwrite);
  fs.mkdirSync(outDir, { recursive: true });

  const written = [];
  characters.forEach((character, index) => {
    if (!character || typeof character !== 'object' || Array.isArray(character)) {
      throw new Error(`characters[${index}] 必须是角色卡对象。`);
    }
    const file = path.join(outDir, outputFileName(character, index));
    if (!overwrite && fs.existsSync(file)) {
      throw new Error(`输出文件已存在：${file}。如需覆盖请加 --overwrite。`);
    }
    fs.writeFileSync(file, `${JSON.stringify(clone(character), null, 2)}\n`, 'utf8');
    written.push(file);
  });
  return written;
}

function parseArgs(argv = process.argv.slice(2)) {
  const positional = [];
  let overwrite = false;
  for (const arg of argv) {
    if (arg === '--overwrite') {
      overwrite = true;
    } else {
      positional.push(arg);
    }
  }
  return { inputPath: positional[0], outDir: positional[1], overwrite };
}

function main(argv = process.argv.slice(2)) {
  const { inputPath, outDir, overwrite } = parseArgs(argv);
  if (!inputPath || inputPath === '-h' || inputPath === '--help') {
    console.log('用法: node tools/split-save-role-cards.js <save-export.json> [out-dir] [--overwrite]');
    return;
  }
  const written = splitSaveRoleCards(inputPath, { outDir, overwrite });
  written.forEach((file) => console.log(`写入 ${file}`));
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err?.message || err);
    process.exit(1);
  }
}

module.exports = {
  assertSaveExport,
  outputFileName,
  parseArgs,
  safeFilePart,
  splitSaveRoleCards,
};
