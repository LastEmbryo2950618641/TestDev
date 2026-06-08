import json
import re
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fate_vectors.sqlite3"
OUT_PATH = BASE_DIR.parent / "publish" / "rag-index.json"
MAX_ITEMS = 1200
SNIPPET_SIZE = 520

KEYWORDS = [
    "圣杯战争", "英灵", "从者", "御主", "魔术师", "令咒", "冬木", "大圣杯",
    "卫宫士郎", "士郎", "Saber", "远坂凛", "凛", "间桐樱", "樱", "Sakura", "Rider", "间桐慎二", "慎二", "间桐脏砚", "脏砚",
    "远坂时臣", "卫宫切嗣", "言峰绮礼", "爱丽丝菲尔", "伊莉雅", "Archer", "Berserker",
    "Heaven", "Feel", "Fate", "Unlimited", "Blade", "Works", "空之境界", "月姬",
]

ALIASES = {
    "间桐樱": ["间桐樱", "樱", "Sakura", "远坂樱", "Rider", "间桐家"],
    "卫宫士郎": ["卫宫士郎", "士郎", "Emiya", "Saber", "远坂凛", "间桐樱"],
    "远坂凛": ["远坂凛", "凛", "远坂", "Archer", "宝石魔术"],
    "Saber": ["Saber", "阿尔托莉雅", "亚瑟王", "骑士王", "士郎"],
    "圣杯战争": ["圣杯战争", "大圣杯", "御主", "从者", "令咒", "英灵", "冬木"],
}


def compact(text):
    return re.sub(r"\s+", " ", text).strip()


def keyword_score(text, novel):
    score = 0
    important = {"间桐樱", "樱", "Sakura", "卫宫士郎", "士郎", "远坂凛", "凛", "Saber", "Rider"}
    for key in KEYWORDS:
        if key in text:
            weight = 12 if key in important else 4 if len(key) >= 3 else 1
            score += weight * min(8, text.count(key))
    if "Fate Stay Night" in novel:
        score += 18
    if "Fate Zero" in novel:
        score += 4
    return score


def best_window(text):
    clean = compact(text)
    if len(clean) <= SNIPPET_SIZE:
        return clean
    best_pos = 0
    best_score = -1
    for pos in range(0, max(1, len(clean) - SNIPPET_SIZE), 160):
        window = clean[pos:pos + SNIPPET_SIZE]
        score = sum(1 for key in KEYWORDS if key in window)
        if score > best_score:
            best_score = score
            best_pos = pos
    return clean[best_pos:best_pos + SNIPPET_SIZE]


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT id, novel, title, path, chunk_index, text FROM chunks").fetchall()
    scored = []
    for row in rows:
        score = keyword_score(row["text"], row["novel"])
        if score > 0:
            scored.append((score, row))
    scored.sort(key=lambda item: item[0], reverse=True)

    items = []
    seen = set()
    for score, row in scored:
        key = (row["path"], row["chunk_index"])
        if key in seen:
            continue
        seen.add(key)
        items.append({
            "id": row["id"],
            "novel": row["novel"],
            "title": row["title"],
            "path": row["path"],
            "chunk": row["chunk_index"],
            "score": score,
            "text": best_window(row["text"]),
        })
        if len(items) >= MAX_ITEMS:
            break

    data = {
        "version": "fate-rag-lite-v1",
        "source": "VectorDatabase/fate_vectors.sqlite3",
        "count": len(items),
        "aliases": ALIASES,
        "items": items,
    }
    with open(OUT_PATH, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, separators=(",", ":"))
    js_path = BASE_DIR.parent / "publish" / "rag-index.js"
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    js_path.write_text(f"window.GameData = window.GameData || {{}};\nwindow.GameData.ragIndex = {payload};\n", encoding="utf-8")
    print(f"导出 {len(items)} 条 RAG 索引到 {OUT_PATH}")


if __name__ == "__main__":
    main()
