const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const workRoot = path.join(root, 'assets', '刀剑神域');
const storyRoot = path.join(workRoot, 'AI设定库', '02_按需加载_剧情');
const sourceIndexPath = path.join(storyRoot, '剧情索引.md');
const sourceTimelinePath = path.join(workRoot, 'AI设定库', '90_检索索引', '时间线索引.md');
const sourceRulePath = path.join(storyRoot, '剧情切块规则.md');
const sourceExplainPath = path.join(storyRoot, '剧情时间推断说明.md');
const sourceReadmePath = path.join(workRoot, 'AI设定库', 'README.md');
const sourceChunkRoot = path.join(storyRoot, '分卷剧情');
const mergedChunkRoot = path.join(storyRoot, '大块剧情');
const workConfig = require(path.join(workRoot, 'index.js'));

const targetBlockSize = 50_000;

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/u, '');
}

function writeText(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function splitTableRow(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return [];
  return trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
}

function isDividerRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function parseMarkdownList(text) {
  const raw = String(text || '').trim();
  if (!raw || raw === '[]') return [];
  const items = raw.match(/\[([^\]]*)\]/u)?.[1] || raw;
  return items
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^["'“”‘’]/u, '').replace(/["'“”‘’]$/u, ''));
}

function parseLineRange(text) {
  const match = String(text || '').match(/(\d+)\s*-\s*(\d+)/u);
  if (!match) return { start: 0, end: 0 };
  return { start: Number(match[1]), end: Number(match[2]) };
}

function collectMarkdownFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(filePath));
    } else if (entry.isFile() && filePath.endsWith('.md')) {
      files.push(filePath);
    }
  }
  return files;
}

function toDate(year, month, day, hour = 0, minute = 0, second = 0) {
  return new Date(year, month - 1, day, hour, minute, second, 0);
}

function formatDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseChineseNumber(value) {
  if (value == null) return NaN;
  const text = String(value).trim().replace(/〇/g, '零');
  if (!text) return NaN;
  if (/^\d+$/.test(text)) return Number(text);
  const digitMap = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  if (Object.prototype.hasOwnProperty.call(digitMap, text)) return digitMap[text];
  if (text === '十') return 10;
  const tenIndex = text.indexOf('十');
  if (tenIndex >= 0) {
    const left = text.slice(0, tenIndex);
    const right = text.slice(tenIndex + 1);
    const tens = left ? digitMap[left] ?? Number(left) : 1;
    const ones = right ? digitMap[right] ?? Number(right) : 0;
    return tens * 10 + ones;
  }
  return Number(text);
}

function parseTimeSuffix(text) {
  const raw = String(text || '').trim();
  if (!raw) return { hour: 0, minute: 0, second: 0 };
  const numbers = raw.match(/(\d{1,2}|[零一二三四五六七八九十两〇]+)/gu) || [];
  let hour = parseChineseNumber(numbers[0] || '0');
  let minute = parseChineseNumber(numbers[1] || '0');
  let second = parseChineseNumber(numbers[2] || '0');
  if (!Number.isFinite(hour)) hour = 0;
  if (!Number.isFinite(minute)) minute = 0;
  if (!Number.isFinite(second)) second = 0;
  if (/(下午|晚上)/u.test(raw) && hour < 12) hour += 12;
  if (/(中午)/u.test(raw) && hour < 11) hour += 12;
  if (/(凌晨)/u.test(raw) && hour === 12) hour = 0;
  return { hour, minute, second };
}

function scoreDateCandidate(text, start, end, specificity) {
  const windowStart = Math.max(0, start - 16);
  const windowEnd = Math.min(text.length, end + 16);
  const window = text.slice(windowStart, windowEnd);
  let score = specificity;
  if (/(今天|现在|接着时间终于来到今天|今天也是|就这样|当天|当日|第二天|现在是|今天是|而现在)/u.test(window)) {
    score += 60;
  }
  if (/(半年前|前年|去年|一年前|两年前|三年前|之前|曾经|回忆|当时|以前|更早|过去)/u.test(window)) {
    score -= 50;
  }
  return score;
}

function matchDateText(text) {
  const raw = String(text || '');
  const candidates = [];

  const patterns = [
    { re: /(20\d{2})年([0-9零一二三四五六七八九十两〇]{1,3})月([0-9零一二三四五六七八九十两〇]{1,3})日/u, specificity: 100 },
    { re: /(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/u, specificity: 100 },
    { re: /(20\d{2})年([0-9零一二三四五六七八九十两〇]{1,3})月(上旬|中旬|下旬)/u, specificity: 85 },
    { re: /(20\d{2})年([0-9零一二三四五六七八九十两〇]{1,3})月/u, specificity: 70 },
    { re: /(20\d{2})年/u, specificity: 30 },
  ];

  for (const { re, specificity } of patterns) {
    const regex = new RegExp(re.source, 'gu');
    let match;
    while ((match = regex.exec(raw))) {
      const [full, yearText, monthText, dayOrQuarter] = match;
      const year = Number(yearText);
      let month = 1;
      let day = 1;
      if (monthText) month = parseChineseNumber(monthText);
      if (dayOrQuarter) {
        if (/(上旬|中旬|下旬)/u.test(dayOrQuarter)) {
          day = { 上旬: 5, 中旬: 15, 下旬: 25 }[dayOrQuarter] || 1;
        } else {
          day = parseChineseNumber(dayOrQuarter);
        }
      }
      if (!Number.isFinite(month) || month < 1 || month > 12) continue;
      if (!Number.isFinite(day) || day < 1 || day > 31) day = 1;
      const tail = raw.slice(regex.lastIndex, regex.lastIndex + 20);
      const timeMatch = tail.match(/(?:凌晨|上午|早上|中午|下午|晚上)?\s*([0-9零一二三四五六七八九十两〇]{1,3})(?:[:：时点]([0-9零一二三四五六七八九十两〇]{1,3}))?(?:[:：分]([0-9零一二三四五六七八九十两〇]{1,3}))?/u);
      const time = timeMatch ? parseTimeSuffix(timeMatch[0]) : { hour: 0, minute: 0, second: 0 };
      candidates.push({
        text: full + (timeMatch ? timeMatch[0] : ''),
        start: match.index,
        specificity,
        score: scoreDateCandidate(raw, match.index, match.index + full.length, specificity),
        date: toDate(year, month, day, time.hour, time.minute, time.second),
      });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((left, right) => right.score - left.score || right.specificity - left.specificity || right.text.length - left.text.length);
  return candidates[0];
}

function extractBody(fileText) {
  const match = String(fileText || '').match(/\r?\n\r?\n([\s\S]*)/u);
  if (!match) return '';
  return match[1].trim();
}

function parseIndexFile(filePath) {
  const lines = readText(filePath).split(/\r?\n/u);
  const rows = [];
  let headers = null;

  for (const line of lines) {
    const cells = splitTableRow(line);
    if (!cells.length) {
      if (headers && rows.length) break;
      continue;
    }
    if (!headers) {
      if (cells.includes('编号') && cells.includes('标题') && cells.includes('文件')) headers = cells;
      continue;
    }
    if (isDividerRow(cells)) continue;
    if (cells.length < headers.length) continue;
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
    if (!row['编号'] || !row['文件']) continue;
    rows.push({
      id: row['编号'],
      title: row['标题'],
      time: row['时间'],
      intro: row['介绍'],
      characters: parseMarkdownList(row['涉及人物']),
      tags: parseMarkdownList(row['涉及设定']),
      file: row['文件'],
      lineRange: parseLineRange(row['行数']),
      wordCount: Number(row['字数']) || 0,
      spoiler: row['剧透等级'] || '',
      exception: row['长度例外'] || '',
      raw: row,
    });
  }

  return rows;
}

function parseTimeString(text) {
  const match = String(text || '').match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/u);
  if (!match) return null;
  return toDate(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]));
}

function parseChunkFile(filePath, id) {
  const text = readText(filePath);
  const lines = text.split(/\r?\n/u);
  const metadata = {};
  let bodyStart = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      bodyStart = index + 1;
      break;
    }
    const match = line.match(/^-\\?\s*([^\s:：]+)[:：]\s*(.*)$/u);
    if (!match) continue;
    const key = match[1];
    const value = match[2];
    metadata[key] = value;
  }

  const fileRel = path.relative(path.join(workRoot, 'AI设定库'), filePath).replace(/\\/g, '/');
  return {
    id: String(id).padStart(4, '0'),
    title: metadata['标题'] || path.basename(filePath, '.md'),
    time: metadata['时间'] || '',
    intro: metadata['介绍'] || '',
    characters: parseMarkdownList(metadata['涉及人物']),
    tags: parseMarkdownList(metadata['涉及设定']),
    file: fileRel,
    lineRange: parseLineRange(metadata['行数']),
    wordCount: Number(metadata['字数']) || 0,
    spoiler: metadata['剧透等级'] || '',
    exception: metadata['长度例外'] || '',
    raw: metadata,
    body: lines.slice(bodyStart).join('\n').trim(),
    sourcePath: filePath,
  };
}

function buildSourceRows() {
  const files = collectMarkdownFiles(sourceChunkRoot)
    .filter((filePath) => !filePath.includes(`${path.sep}大块剧情${path.sep}`))
    .sort((left, right) => path.relative(sourceChunkRoot, left).localeCompare(path.relative(sourceChunkRoot, right), 'zh-CN', { numeric: true, sensitivity: 'base' }));
  return files.map((filePath, index) => parseChunkFile(filePath, index + 1));
}

function selectTimelineAnchors(rows) {
  return rows
    .map((row) => {
      const sourceTime = parseTimeString(row.time);
      if (!sourceTime) return null;
      return { row, sourceTime };
    })
    .filter(Boolean);
}

function interpolateTimes(rows, anchors) {
  const actualTimes = new Array(rows.length);
  if (!anchors.length) return actualTimes;

  const storyStart = toDate(
    workConfig.storyStart.year,
    workConfig.storyStart.month,
    workConfig.storyStart.day,
    workConfig.storyStart.hour || 0,
    workConfig.storyStart.minute || 0,
    workConfig.storyStart.second || 0,
  );
  const baseStart = new Date(anchors[0].sourceTime);
  const offset = storyStart.getTime() - baseStart.getTime();

  for (const anchor of anchors) {
    const index = Number(anchor.row.id) - 1;
    actualTimes[index] = new Date(anchor.sourceTime.getTime() + offset);
  }

  for (let index = 0; index < actualTimes.length; index += 1) {
    if (actualTimes[index]) continue;
    const previous = actualTimes[index - 1];
    actualTimes[index] = previous ? new Date(previous.getTime() + 7 * 60 * 1000) : new Date(storyStart);
  }

  return actualTimes;
}

function commonPrefixBySpace(left, right) {
  const leftParts = String(left || '').split(/\s+/u).filter(Boolean);
  const rightParts = String(right || '').split(/\s+/u).filter(Boolean);
  const parts = [];
  const count = Math.min(leftParts.length, rightParts.length);
  for (let i = 0; i < count; i++) {
    if (leftParts[i] !== rightParts[i]) break;
    parts.push(leftParts[i]);
  }
  return parts.join(' ');
}

function shorten(text, limit) {
  const raw = String(text || '').replace(/\s+/gu, ' ').trim();
  if (raw.length <= limit) return raw;
  return raw.slice(0, Math.max(0, limit - 1)).trimEnd() + '…';
}

function maxSpoiler(left, right) {
  const order = { 低: 1, 中: 2, 高: 3 };
  const reverse = ['低', '中', '高'];
  return reverse[Math.max(order[left] || 0, order[right] || 0)] || left || right || '中';
}

function renderList(values) {
  const items = [...new Set(values.filter(Boolean))];
  return `[${items.join(', ')}]`;
}

function buildGroups(rows, actualTimes) {
  const groups = [];
  let current = [];
  let sum = 0;

  rows.forEach((row, index) => {
    current.push({ row, actualTime: actualTimes[index] });
    sum += row.wordCount || 0;
    if (sum >= targetBlockSize && current.length) {
      groups.push(current);
      current = [];
      sum = 0;
    }
  });

  if (current.length) groups.push(current);
  return groups;
}

function mergeBodies(group) {
  return group.map(({ row }) => {
    const sourceFile = path.join(workRoot, 'AI设定库', row.file);
    const text = readText(sourceFile);
    return extractBody(text);
  }).filter(Boolean).join('\n\n');
}

function buildMergedRow(group, index) {
  const first = group[0].row;
  const last = group[group.length - 1].row;
  const startTime = formatDate(group[0].actualTime);
  const endTime = formatDate(group[group.length - 1].actualTime);
  const common = commonPrefixBySpace(
    String(first.title || '').replace(/_\d+$/u, ''),
    String(last.title || '').replace(/_\d+$/u, ''),
  );
  const title = `${common || 'SAO剧情'} 超级块_${String(index + 1).padStart(3, '0')}`;
  const intro = shorten(
    `合并原始剧情块 ${first.id}-${last.id}；前段：${first.intro}；后段：${last.intro}`,
    220,
  );
  const chars = group.flatMap(({ row }) => row.characters);
  const tags = group.flatMap(({ row }) => row.tags);
  const sourceStart = group[0].row.lineRange.start;
  const sourceEnd = group[group.length - 1].row.lineRange.end;
  const wordCount = group.reduce((total, { row }) => total + (row.wordCount || 0), 0);
  const spoiler = group.reduce((current, { row }) => maxSpoiler(current, row.spoiler), '');
  const exception = group.some(({ row }) => row.exception) ? '合并大块' : '';
  const fileName = `${String(index + 1).padStart(4, '0')}_${title.replace(/[\\/:*?"<>|]/gu, '_')}.md`;
  const filePath = path.join(mergedChunkRoot, fileName);
  const body = mergeBodies(group);
  const mergedContent = [
    '- \\开始',
    `- 标题: ${title}`,
    `- 时间: ${startTime} - ${endTime}`,
    '- 来源: 小说.md',
    `- 原始块: ${first.id}-${last.id}`,
    `- 行数: ${sourceStart}-${sourceEnd}`,
    `- 字数: ${wordCount}`,
    `- 涉及人物: ${renderList(chars)}`,
    `- 涉及设定: ${renderList(tags)}`,
    `- 剧透等级: ${spoiler || '中'}`,
    `- 长度例外: ${exception}`,
    '',
    body,
    '',
  ].join('\n');

  return {
    title,
    intro,
    filePath,
    fileRel: path.posix.join('02_按需加载_剧情', '大块剧情', fileName),
    startTime,
    endTime,
    sourceStart,
    sourceEnd,
    wordCount,
    chars: [...new Set(chars)],
    tags: [...new Set(tags)],
    spoiler: spoiler || '中',
    exception,
    mergedContent,
  };
}

function buildTimelineRows(groups) {
  return groups.map((group, index) => {
    const first = group[0].row;
    const last = group[group.length - 1].row;
    const merged = buildMergedRow(group, index);
    const stage = merged.title.replace(/\s*超级块_\d+$/u, '');
    const event = shorten(`${first.title} / ${last.title}`, 80);
    const people = renderList(merged.chars.slice(0, 10));
    const file = merged.fileRel;
    return {
      time: `${merged.startTime} - ${merged.endTime}`,
      stage,
      event,
      people,
      file,
      intro: merged.intro,
    };
  });
}

function renderIndex(groups) {
  const rows = groups.map((group, index) => {
    const merged = buildMergedRow(group, index);
    return [
      `| ${String(index + 1).padStart(4, '0')} | ${merged.title} | ${merged.startTime} - ${merged.endTime} | ${merged.intro} | ${renderList(merged.chars.slice(0, 12))} | ${renderList(merged.tags.slice(0, 12))} | ${merged.fileRel} | ${merged.sourceStart}-${merged.sourceEnd} | ${merged.wordCount} | ${merged.spoiler} | ${merged.exception} |`,
      merged,
    ];
  });

  const renderedRows = rows.map(([line]) => line).join('\n');
  return { renderedRows, mergedRows: rows.map(([, merged]) => merged) };
}

function renderTimeline(groups, mergedRows) {
  const lines = mergedRows.map((merged, index) => {
    const first = groups[index][0].row;
    const last = groups[index][groups[index].length - 1].row;
    const stage = merged.title.replace(/\s*超级块_\d+$/u, '');
    const event = shorten(`${first.title} → ${last.title}`, 90);
    const people = renderList(merged.chars.slice(0, 10));
    return `| ${merged.startTime} - ${merged.endTime} | ${stage} | ${event} | ${people} | ${merged.fileRel} |`;
  });
  return lines.join('\n');
}

function updateDocumentation(groupCount) {
  const explainPath = sourceExplainPath;
  const rulePath = sourceRulePath;
  const readmePath = sourceReadmePath;

  writeText(rulePath, [
    '# 剧情切块规则',
    '',
    '每块约 50000 字；优先按剧情时间范围切块，范围内的正文一次性合并为一个可加载单元。',
    '若单个章节不足目标字数，也可保留独立块，但索引必须写明时间范围。',
    '',
  ].join('\n'));

  writeText(explainPath, [
    '# 剧情时间推断说明',
    '',
    '本设定库时间字段以作品正文里的明确日期、相邻剧情顺序和场景上下文推断为准；不再使用固定的 2011 伪时间轴。',
    `当前剧情索引按时间范围加载，正文大块数量约 ${groupCount} 个。`,
    '',
  ].join('\n'));

  const readme = readText(readmePath)
    .replace('`02_按需加载_剧情/剧情索引.md`、`90_检索索引/时间线索引.md` | 只取时间窗口内命中行，再读剧情块。', '`02_按需加载_剧情/剧情索引.md`、`90_检索索引/时间线索引.md` | 只取时间窗口内命中的时间范围，再读对应大块剧情。')
    .replace('`剧情索引.md` 与 `时间线索引.md` 只作本地检索目录；模型只接收命中行、少量相邻行、事件卡摘要和必要剧情块。', '`剧情索引.md` 与 `时间线索引.md` 只作本地检索目录；模型只接收命中时间范围、少量相邻行、事件卡摘要和必要剧情大块。');
  writeText(readmePath, readme);
}

function main() {
  if (!fs.existsSync(sourceChunkRoot)) {
    throw new Error(`找不到原始剧情块目录：${sourceChunkRoot}`);
  }

  const rows = buildSourceRows();
  if (!rows.length) throw new Error('未解析到任何剧情索引行');

  const anchors = selectTimelineAnchors(rows);
  if (!anchors.length) throw new Error('没有找到可用于推断时间的正文锚点');

  const actualTimes = interpolateTimes(rows, anchors);
  const groups = buildGroups(rows, actualTimes);

  fs.rmSync(mergedChunkRoot, { recursive: true, force: true });
  fs.mkdirSync(mergedChunkRoot, { recursive: true });

  const { renderedRows, mergedRows } = renderIndex(groups);
  const timelineRows = renderTimeline(groups, mergedRows);

  writeText(sourceIndexPath, [
    '# 剧情索引',
    '',
    '本索引用于按需加载正文剧情大块。介绍为剧情摘要，不是正文开头截取。',
    '',
    `总剧情块数：${groups.length}`,
    '',
    '| 编号 | 标题 | 时间 | 介绍 | 涉及人物 | 涉及设定 | 文件 | 行数 | 字数 | 剧透等级 | 长度例外 |',
    '| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |',
    renderedRows,
    '',
  ].join('\n'));

  writeText(sourceTimelinePath, [
    '# 时间线索引',
    '',
    '时间以作品正文可核验时间、剧情顺序与上下文推断为准；加载时优先取命中时间范围和对应的大块剧情。',
    '',
    '| 时间 | 阶段 | 事件 | 相关人物 | 推荐加载 |',
    '| --- | --- | --- | --- | --- |',
    timelineRows,
    '',
  ].join('\n'));

  for (const merged of mergedRows) {
    writeText(merged.filePath, merged.mergedContent);
  }

  updateDocumentation(groups.length);
  console.log(JSON.stringify({
    groups: groups.length,
    anchors: anchors.length,
    outputDir: path.relative(root, mergedChunkRoot),
  }, null, 2));
}

main();
