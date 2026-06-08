import json
import re
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fate_vectors.sqlite3"
OUT_PATH = BASE_DIR.parent / "publish" / "character-catalog.json"
JS_PATH = BASE_DIR.parent / "publish" / "character-catalog-data.js"

CHARACTERS = [
    {"name": "卫宫士郎", "aliases": ["卫宫士郎", "士郎"], "role": "正义伙伴候补 / 御主"},
    {"name": "Saber", "aliases": ["Saber", "阿尔托莉雅", "亚瑟王", "骑士王"], "role": "剑阶从者"},
    {"name": "远坂凛", "aliases": ["远坂凛", "远坂", "凛"], "role": "远坂家魔术师 / 御主"},
    {"name": "间桐樱", "aliases": ["间桐樱", "远坂樱", "Sakura", "樱"], "role": "间桐家少女 / 关键命运角色"},
    {"name": "Rider", "aliases": ["Rider", "骑兵"], "role": "骑阶从者"},
    {"name": "Archer", "aliases": ["Archer", "弓兵"], "role": "弓阶从者"},
    {"name": "Lancer", "aliases": ["Lancer", "枪兵"], "role": "枪阶从者"},
    {"name": "Caster", "aliases": ["Caster", "魔术师职阶"], "role": "术阶从者"},
    {"name": "Berserker", "aliases": ["Berserker", "狂战士"], "role": "狂阶从者"},
    {"name": "Assassin", "aliases": ["Assassin", "暗杀者"], "role": "杀阶从者"},
    {"name": "伊莉雅", "aliases": ["伊莉雅", "伊莉雅丝菲尔"], "role": "爱因兹贝伦御主"},
    {"name": "卫宫切嗣", "aliases": ["卫宫切嗣", "切嗣"], "role": "魔术师杀手"},
    {"name": "言峰绮礼", "aliases": ["言峰绮礼", "绮礼"], "role": "圣杯战争监督者"},
    {"name": "远坂时臣", "aliases": ["远坂时臣", "时臣"], "role": "远坂家当主"},
    {"name": "爱丽丝菲尔", "aliases": ["爱丽丝菲尔", "爱丽"], "role": "爱因兹贝伦人造人"},
    {"name": "间桐慎二", "aliases": ["间桐慎二", "慎二"], "role": "间桐家相关人物"},
    {"name": "间桐脏砚", "aliases": ["间桐脏砚", "脏砚"], "role": "间桐家家长"},
    {"name": "葛木宗一郎", "aliases": ["葛木宗一郎", "葛木"], "role": "教师 / 相关人物"},
    {"name": "藤村大河", "aliases": ["藤村大河", "大河", "藤姐"], "role": "教师 / 监护者"},
    {"name": "美缀绫子", "aliases": ["美缀绫子", "美缀"], "role": "弓道部相关人物"},
    {"name": "韦伯", "aliases": ["韦伯", "韦伯·维尔维特", "埃尔梅罗二世"], "role": "魔术师 / 讲师"},
    {"name": "征服王", "aliases": ["征服王", "伊斯坎达尔"], "role": "王者从者"},
    {"name": "吉尔伽美什", "aliases": ["吉尔伽美什", "英雄王"], "role": "英雄王"},
    {"name": "肯尼斯", "aliases": ["肯尼斯", "肯尼斯·艾尔梅洛伊"], "role": "时钟塔魔术师"},
    {"name": "索拉", "aliases": ["索拉", "索拉娜"], "role": "魔术师相关人物"},
    {"name": "雨生龙之介", "aliases": ["雨生龙之介", "龙之介"], "role": "异常杀人者 / 御主"},
    {"name": "贞德", "aliases": ["贞德", "Jeanne", "Ruler"], "role": "裁定者"},
    {"name": "齐格", "aliases": ["齐格", "Sieg"], "role": "人造人 / 主角"},
    {"name": "天草四郎", "aliases": ["天草四郎", "四郎·言峰"], "role": "圣人 / 御主"},
    {"name": "莫德雷德", "aliases": ["莫德雷德", "Mordred"], "role": "叛逆骑士"},
    {"name": "阿斯托尔福", "aliases": ["阿斯托尔福", "Astolfo"], "role": "骑阶从者"},
    {"name": "喀戎", "aliases": ["喀戎", "Chiron"], "role": "弓阶从者"},
    {"name": "迦尔纳", "aliases": ["迦尔纳", "Karna"], "role": "枪阶从者"},
    {"name": "弗兰肯斯坦", "aliases": ["弗兰肯斯坦", "Fran"], "role": "狂阶从者"},
    {"name": "两仪式", "aliases": ["两仪式", "式"], "role": "直死之魔眼持有者"},
    {"name": "黑桐干也", "aliases": ["黑桐干也", "干也"], "role": "调查者 / 重要关系者"},
    {"name": "苍崎橙子", "aliases": ["苍崎橙子", "橙子"], "role": "人偶师 / 魔术师"},
    {"name": "浅上藤乃", "aliases": ["浅上藤乃", "藤乃"], "role": "异能者"},
    {"name": "远野志贵", "aliases": ["远野志贵", "志贵"], "role": "直死之魔眼持有者"},
    {"name": "爱尔奎特", "aliases": ["爱尔奎特", "真祖"], "role": "真祖公主"},
    {"name": "希耶尔", "aliases": ["希耶尔", "Ciel"], "role": "代行者"},
    {"name": "秋叶", "aliases": ["远野秋叶", "秋叶"], "role": "远野家当主"},
    {"name": "翡翠", "aliases": ["翡翠"], "role": "女仆"},
    {"name": "琥珀", "aliases": ["琥珀"], "role": "女仆"},
]


def compact(text):
    return re.sub(r"\s+", " ", text).strip()


def load_chunks():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    docs = conn.execute("SELECT novel, title, path FROM documents ORDER BY novel, title").fetchall()
    chunks = conn.execute("SELECT novel, title, path, chunk_index, text FROM chunks ORDER BY id").fetchall()
    conn.close()
    works = {doc["novel"]: [] for doc in docs}
    for row in chunks:
        works.setdefault(row["novel"], []).append(dict(row))
    return works


def score_item(item, aliases):
    text = f"{item['novel']} {item['title']} {item['text']}"
    score = 0
    for alias in aliases:
        if not alias:
            continue
        weight = 12 if len(alias) >= 3 else 4
        score += text.count(alias) * weight
    return score


def mark(name):
    ascii_part = "".join(ch for ch in name.upper() if ch.isascii() and ch.isalnum())
    return ascii_part[:4] if ascii_part else name[:2]


def stats(seed):
    base = sum(ord(ch) for ch in seed)
    return {
        "will": 45 + base % 46,
        "sense": 45 + (base // 3) % 46,
        "charm": 45 + (base // 7) % 46,
        "combat": 45 + (base // 11) % 46,
    }


def skills(role):
    return [
        {"name": "原作记忆", "desc": "根据资料回忆相关经历"},
        {"name": "命运分歧", "desc": "在关键选择中改变路线"},
        {"name": role[:8] or "角色本能", "desc": "发挥该角色的身份特质"},
    ]


def build_character(work, char, items):
    scored = []
    for item in items:
        score = score_item(item, char["aliases"])
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    if not scored:
        return None
    refs = [pair[1] for pair in scored[:4]]
    detail = compact(" ".join(ref["text"] for ref in refs))[:520]
    return {
        "id": f"{work}-{char['name']}",
        "name": char["name"],
        "mark": mark(char["name"]),
        "role": char["role"],
        "work": work,
        "personality": f"来自《{work}》全量小说数据库的可操控角色。",
        "detail": detail,
        "stats": stats(work + char["name"]),
        "skills": skills(char["role"]),
        "aliases": char["aliases"],
        "hitCount": sum(pair[0] for pair in scored),
        "refs": [
            {
                "novel": ref["novel"],
                "title": ref["title"],
                "chunk": ref["chunk_index"],
                "text": ref["text"][:260],
            }
            for ref in refs
        ],
    }


def main():
    by_work = load_chunks()
    works = []
    total = 0
    for work, items in sorted(by_work.items()):
        chars = []
        for char in CHARACTERS:
            built = build_character(work, char, items)
            if built:
                chars.append(built)
        chars.sort(key=lambda item: (-item["hitCount"], item["name"]))
        if chars:
            works.append({"name": work, "characters": chars})
            total += len(chars)

    data = {"version": "fate-character-catalog-v2-full-db", "source": str(DB_PATH.name), "works": works}
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    OUT_PATH.write_text(payload, encoding="utf-8")
    JS_PATH.write_text(f"window.GameData = window.GameData || {{}};\nwindow.GameData.characterCatalog = {payload};\n", encoding="utf-8")
    print(f"从完整数据库导出 {len(works)} 部作品，{total} 个角色")


if __name__ == "__main__":
    main()
