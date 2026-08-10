const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const assetsDir = path.join(root, 'assets');
const publishDir = path.join(root, 'publish');

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/u, '');
}

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//u, '');
}

function splitTableRow(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return [];
  return trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
}

function isDividerRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function parseCharacterIndex(markdown, config) {
  const lines = String(markdown || '').split(/\r?\n/u);
  let headers = null;
  const rows = [];

  for (const line of lines) {
    const cells = splitTableRow(line);
    if (!cells.length) {
      if (headers && rows.length) break;
      continue;
    }
    if (!headers) {
      if (cells.includes('人物') && cells.includes('详细文件')) headers = cells;
      continue;
    }
    if (isDividerRow(cells)) continue;
    if (cells.length < headers.length) continue;

    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
    const name = row['人物'];
    const detailFile = normalizePath(cells.length > headers.length
      ? cells[cells.length - 1]
      : row['详细文件']);
    if (!name || !detailFile.endsWith('.md')) continue;

    const role = row['身份/定位'] || row['身份定位'] || '';
    const personality = row['标签'] || role || '作品人物';
    const profilePath = normalizePath(path.posix.join(config.lore.characterRoot, detailFile));
    rows.push({
      id: `char-${crypto.createHash('sha1').update(`${config.name}:${name}`).digest('hex').slice(0, 12)}`,
      name,
      mark: name.toUpperCase().replace(/[^A-Z0-9]/gu, '')
        ? name.toUpperCase().replace(/[^A-Z0-9]/gu, '').slice(0, 3)
        : name.slice(0, 2),
      role,
      work: config.name,
      personality,
      detail: [row['性别'], row['年龄'], role].filter(Boolean).join('｜'),
      stats: { will: 60, sense: 60, charm: 60, combat: 60 },
      skills: [],
      aliases: [name],
      profilePath,
    });
  }

  return rows;
}

function loadWorkConfigs() {
  return fs.readdirSync(assetsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const configPath = path.join(assetsDir, entry.name, 'index.js');
      if (!fs.existsSync(configPath)) return null;
      delete require.cache[require.resolve(configPath)];
      const config = require(configPath);
      if (!config || config.enabled === false) return null;
      if (!config.name || !config.lore?.characterIndex || !config.lore?.characterRoot || !config.lore?.cache) {
        throw new Error(`作品配置缺少必要字段: ${path.relative(root, configPath)}`);
      }
      if (config.name !== entry.name) {
        throw new Error(`作品配置 name 必须与目录名一致: ${entry.name} !== ${config.name}`);
      }
      return { ...config, directory: entry.name, configPath };
    })
    .filter(Boolean)
    .sort((left, right) => (Number(left.order) || Number.MAX_SAFE_INTEGER) - (Number(right.order) || Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name, 'zh-CN'));
}

function runtimeId(config) {
  return path.basename(config.lore.cache, path.extname(config.lore.cache));
}

function metadataFiles(config, work) {
  const source = `assets/${config.directory}/metadata`;
  const loreSource = {
    name: config.name,
    base: `assets/${config.directory}/${config.lore.directory}`,
    aliases: Array.isArray(config.aliases) && config.aliases.length ? config.aliases : [config.name],
    cache: `lore-cache/${config.lore.cache}`,
  };
  const catalog = {
    version: 'work-metadata-v1',
    source,
    work,
  };
  return {
    'character-catalog.json': `${JSON.stringify(catalog)}\n`,
    'character-catalog-data.js': [
      `// GENERATED FROM ${source}; DO NOT EDIT.`,
      '(function registerWorkCatalog() {',
      '  window.GameData = window.GameData || {};',
      "  window.GameData.characterCatalog = window.GameData.characterCatalog || { version: 'work-metadata-v1', source: 'assets/*/metadata', works: [] };",
      `  const work = ${JSON.stringify(work)};`,
      '  const works = window.GameData.characterCatalog.works;',
      '  const index = works.findIndex((item) => item.name === work.name);',
      '  if (index >= 0) works[index] = work; else works.push(work);',
      '})();',
      '',
    ].join('\n'),
    'lore-sources.js': [
      `// GENERATED FROM ${source}; DO NOT EDIT.`,
      '(function registerWorkLoreSource() {',
      '  window.GameData = window.GameData || {};',
      '  window.GameData.loreSources = window.GameData.loreSources || [];',
      `  const source = ${JSON.stringify(loreSource)};`,
      '  const sources = window.GameData.loreSources;',
      '  const index = sources.findIndex((item) => item.name === source.name);',
      '  if (index >= 0) sources[index] = source; else sources.push(source);',
      '})();',
      '',
    ].join('\n'),
    'story-start-data.js': [
      `// GENERATED FROM ${source}; DO NOT EDIT.`,
      '(function registerWorkStoryStart() {',
      '  window.GameData = window.GameData || {};',
      '  window.GameData.storyStarts = window.GameData.storyStarts || {};',
      `  window.GameData.storyStarts[${JSON.stringify(config.name)}] = ${JSON.stringify(config.storyStart)};`,
      '})();',
      '',
    ].join('\n'),
  };
}

function buildOutputs() {
  const configs = loadWorkConfigs();
  const outputs = new Map();
  const manifest = [];

  for (const config of configs) {
    const indexPath = path.join(assetsDir, config.directory, config.lore.directory, config.lore.characterIndex);
    if (!fs.existsSync(indexPath)) {
      throw new Error(`人物索引不存在: ${path.relative(root, indexPath)}`);
    }
    const characters = parseCharacterIndex(readText(indexPath), config);
    if (!characters.length) {
      throw new Error(`人物索引未解析出角色: ${path.relative(root, indexPath)}`);
    }
    const work = { name: config.name, characters };
    const id = runtimeId(config);
    const files = metadataFiles(config, work);
    const runtimeBase = `work-metadata/${id}`;
    for (const [name, content] of Object.entries(files)) {
      outputs.set(path.join(assetsDir, config.directory, 'metadata', name), content);
      outputs.set(path.join(publishDir, runtimeBase, name), content);
    }
    manifest.push({
      id,
      name: config.name,
      scripts: [
        `${runtimeBase}/lore-sources.js`,
        `${runtimeBase}/story-start-data.js`,
        `${runtimeBase}/character-catalog-data.js`,
      ],
    });
  }

  outputs.set(path.join(publishDir, 'work-metadata-manifest.js'), [
    '// GENERATED FROM assets/*/index.js; DO NOT EDIT.',
    'window.GameData = window.GameData || {};',
    `window.GameData.workMetadataManifest = ${JSON.stringify(manifest, null, 2)};`,
    '',
  ].join('\n'));
  return outputs;
}

const legacyAggregateFiles = [
  'character-catalog.json',
  'character-catalog-data.js',
  'lore-sources.js',
  'story-start-data.js',
].map((name) => path.join(publishDir, name));

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

function syncOutputs({ check = false } = {}) {
  const outputs = buildOutputs();
  const stale = [];
  for (const [file, content] of outputs) {
    const current = fs.existsSync(file) ? readText(file) : '';
    if (current === content.replace(/^\uFEFF/u, '')) continue;
    stale.push(path.relative(root, file));
    if (!check) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content, 'utf8');
    }
  }

  const expected = new Set(outputs.keys().map((file) => path.resolve(file)));
  const generatedFiles = [
    ...collectFiles(path.join(publishDir, 'work-metadata')),
    ...loadWorkConfigs().flatMap((config) => collectFiles(path.join(assetsDir, config.directory, 'metadata'))),
  ];
  const obsolete = [...legacyAggregateFiles, ...generatedFiles]
    .filter((file) => fs.existsSync(file) && !expected.has(path.resolve(file)));
  for (const file of obsolete) {
    stale.push(path.relative(root, file));
    if (!check) fs.rmSync(file, { force: true });
  }
  if (check && stale.length) {
    throw new Error(`作品目录生成结果已过期:\n${stale.map((file) => `- ${file}`).join('\n')}`);
  }
  return { outputs: outputs.size, stale };
}

if (require.main === module) {
  try {
    const result = syncOutputs({ check: process.argv.includes('--check') });
    console.log(JSON.stringify({ mode: process.argv.includes('--check') ? 'check' : 'write', ...result }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  buildOutputs,
  loadWorkConfigs,
  metadataFiles,
  parseCharacterIndex,
  runtimeId,
  splitTableRow,
  syncOutputs,
};
