import re
from pathlib import Path

MATERIAL_ROOT = Path(__file__).resolve().parent.parent / "同人素材"
ROOT = MATERIAL_ROOT / "Fate"
PUBLISH_DIR = Path(__file__).resolve().parent.parent / "publish"
MAX_CHARS = 300

TIMELINE_HINTS = {
    "Fate Zero": [
        ("第四次圣杯战争前传", "1986年01月01日00时00分00秒", "序章以“八年前”回溯切嗣的理想与过往，为第四次圣杯战争的动机奠基。"),
        ("第四次圣杯战争召集", "1994年11月01日18时00分00秒", "冬木第四次圣杯战争前夕，各阵营御主、从者与魔术师势力陆续集结。"),
        ("第四次圣杯战争展开", "1994年11月02日00时00分00秒", "圣杯战争正式进入夜间交锋，御主与英灵围绕冬木展开侦察、结盟、暗杀与正面对抗。"),
        ("第四次圣杯战争终局", "1994年11月08日03时00分00秒", "战争走向终局，圣杯真相、御主愿望与冬木灾厄集中爆发。"),
    ],
    "Fate Stay Night": [
        ("第五次圣杯战争前夕", "2004年02月01日06时00分00秒", "卫宫士郎的日常与冬木异常逐渐交错，第五次圣杯战争临近。"),
        ("第五次圣杯战争开幕", "2004年02月02日22时00分00秒", "士郎卷入战斗并召唤 Saber，各阵营围绕圣杯开始行动。"),
        ("三线分歧展开", "2004年02月03日00时00分00秒", "Fate、UBW、HF 等路线围绕不同选择展开，人物关系和圣杯真相逐步显露。"),
    ],
}

TIME_PATTERNS = [
    re.compile(r"(\d{3,4})\s*年\s*(\d{1,2})?\s*月?\s*(\d{1,2})?\s*日?"),
    re.compile(r"(\d+)\s*年前"),
    re.compile(r"第[一二三四五六七八九十]+次圣杯战争"),
]


def read_text(path):
    data = path.read_bytes()
    for enc in ("utf-8-sig", "utf-16", "utf-16-le", "utf-16-be", "gb18030"):
        try:
            text = data.decode(enc)
            if text.count("\x00") < max(1, len(text) // 100):
                return text
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


def normalize_text(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def split_long_line(line):
    if len(line) <= MAX_CHARS * 2:
        return [line]
    parts = re.split(r"(?<=[。！？；])", line)
    out, buf = [], ""
    for part in parts:
        if not part:
            continue
        if len(buf) >= MAX_CHARS and len(buf) + len(part) > MAX_CHARS:
            out.append(buf.strip())
            buf = part
        else:
            buf += part
    if buf.strip():
        out.append(buf.strip())
    return out or [line]


def paragraph_units(text):
    units = []
    for block in re.split(r"\n\s*\n", text):
        block = re.sub(r"[ \t]+", " ", block.strip())
        if not block:
            continue
        units.extend(split_long_line(block))
    return units


def build_index(text):
    units = paragraph_units(text)
    entries, buf, start_line = [], [], 1
    line_no = 1
    for unit in units:
        if not buf:
            start_line = line_no
        buf.append(unit)
        line_no += unit.count("\n") + 1
        if sum(len(x) for x in buf) >= MAX_CHARS:
            entries.append((start_line, line_no - 1, "\n".join(buf)))
            buf = []
    if buf:
        entries.append((start_line, line_no - 1, "\n".join(buf)))
    lines = []
    for i, (start, end, content) in enumerate(entries, 1):
        title = make_title(content, i)
        lines += [f"开始-{title}", f"行数 {start}-{end}", f"时间 {infer_time(content)}", f"每段剧情 {summarize(content)}", f"结束-{title}", ""]
    return "\n".join(lines)


def make_title(text, index):
    first = re.sub(r"\s+", "", text)[:24]
    return first or f"剧情段落{index:04d}"


def infer_time(text):
    for pat in TIME_PATTERNS:
        m = pat.search(text)
        if m:
            if len(m.groups()) >= 3 and m.group(1).isdigit():
                month = int(m.group(2) or 1)
                day = int(m.group(3) or 1)
                return f"{int(m.group(1)):04d}年{month:02d}月{day:02d}日00时00分00秒"
            return f"近似：{m.group(0)}"
    return "时间未明，按上下文近似"


def summarize(text):
    clean = re.sub(r"\s+", " ", text).strip()
    return clean[:180]


def timeline_for(work, text):
    items = TIMELINE_HINTS.get(work, [])
    if not items:
        snippets = []
        for unit in paragraph_units(text)[:20]:
            if any(p.search(unit) for p in TIME_PATTERNS):
                snippets.append((make_title(unit, len(snippets) + 1), infer_time(unit), summarize(unit)))
            if len(snippets) >= 6:
                break
        items = snippets or [("剧情起点", "时间未明，按作品上下文近似", summarize(text))]
    lines = []
    for title, time, summary in items:
        lines += [f"标题：{title}", f"时间：{time}", f"剧情梗概：{summary}", ""]
    return "\n".join(lines).strip() + "\n"


def display_work_name(work_dir):
    name = work_dir.name
    return name if name.startswith("Fate") else f"Fate {name}"


def normalize_dir(work_dir):
    work = display_work_name(work_dir)
    txts = sorted(p for p in work_dir.glob("*.txt") if p.name not in {"正文.txt", "时间线梗概.txt", "正文索引.txt"})
    if not txts:
        body = work_dir / "正文.txt"
    else:
        body = work_dir / "正文.txt"
        merged = "\n\n".join(read_text(p) for p in txts)
        body.write_text(normalize_text(merged), encoding="utf-8")
        for p in txts:
            p.unlink()
    text = normalize_text(read_text(body))
    body.write_text(text, encoding="utf-8")
    (work_dir / "时间线梗概.txt").write_text(timeline_for(work, text), encoding="utf-8")
    (work_dir / "正文索引.txt").write_text(build_index(text), encoding="utf-8")
    return work


def adopt_top_level_fate_dirs():
    ROOT.mkdir(exist_ok=True)
    for path in sorted(MATERIAL_ROOT.iterdir()):
        if path == ROOT or not path.is_dir() or not path.name.startswith("Fate"):
            continue
        target = ROOT / path.name
        target.mkdir(exist_ok=True)
        for item in path.iterdir():
            item.rename(target / item.name)
        path.rmdir()


def export_timeline_data(work_dirs):
    data = {display_work_name(p): parse_timeline(p / "时间线梗概.txt") for p in work_dirs}
    payload = __import__("json").dumps(data, ensure_ascii=False, separators=(",", ":"))
    (PUBLISH_DIR / "timeline-data.js").write_text(f"window.GameData = window.GameData || {{}};\nwindow.GameData.timelines = {payload};\n", encoding="utf-8")


def parse_timeline(path):
    if not path.exists():
        return []
    rows, item = [], {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("标题："):
            item = {"title": line[3:].strip()}
        elif line.startswith("时间："):
            item["time"] = line[3:].strip()
        elif line.startswith("剧情梗概："):
            item["summary"] = line[5:].strip()
            rows.append(item)
    return rows


def main():
    adopt_top_level_fate_dirs()
    work_dirs = [p for p in sorted(ROOT.iterdir()) if p.is_dir()]
    works = [normalize_dir(p) for p in work_dirs]
    export_timeline_data(work_dirs)
    print(f"已规范化 {len(works)} 个 Fate 素材目录")


if __name__ == "__main__":
    main()
