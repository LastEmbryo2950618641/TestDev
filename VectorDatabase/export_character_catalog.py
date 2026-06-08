import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
RAG_PATH = BASE_DIR.parent / "publish" / "rag-index.json"
OUT_PATH = BASE_DIR.parent / "publish" / "character-catalog.json"

CHARACTERS = [
    {"name": "卫宫士郎", "aliases": ["卫宫士郎", "士郎"], "role": "正义伙伴候补 / 御主"},
    {"name": "Saber", "aliases": ["Saber", "阿尔托莉雅", "亚瑟王", "骑士王"], "role": "剑阶从者"},
    {"name": "远坂凛", "aliases": ["远坂凛", "凛"], "role": "远坂家魔术师 / 御主"},
    {"name": "间桐樱", "aliases": ["间桐樱", "樱", "Sakura", "远坂樱"], "role": "间桐家少女 / 关键命运角色"},
    {"name": "Rider", "aliases": ["Rider", "骑兵"], "role": "骑阶从者"},
    {"name": "Archer", "aliases": ["Archer", "弓兵"], "role": "弓阶从者"},
    {"name": "伊莉雅", "aliases": ["伊莉雅", "伊莉雅丝菲尔"], "role": "爱因兹贝伦御主"},
    {"name": "卫宫切嗣", "aliases": ["卫宫切嗣", "切嗣"], "role": "魔术师杀手"},
    {"name": "言峰绮礼", "aliases": ["言峰绮礼", "绮礼"], "role": "圣杯战争监督者"},
    {"name": "远坂时臣", "aliases": ["远坂时臣", "时臣"], "role": "远坂家当主"},
    {"name": "爱丽丝菲尔", "aliases": ["爱丽丝菲尔", "爱丽"], "role": "爱因兹贝伦人造人"},
    {"name": "间桐慎二", "aliases": ["间桐慎二", "慎二"], "role": "间桐家相关人物"},
    {"name": "间桐脏砚", "aliases": ["间桐脏砚", "脏砚"], "role": "间桐家家长"},
    {"name": "韦伯", "aliases": ["韦伯", "韦伯·维尔维特", "埃尔梅罗二世"], "role": "魔术师 / 讲师"},
    {"name": "征服王", "aliases": ["征服王", "伊斯坎达尔", "Rider"], "role": "王者从者"},
    {"name": "吉尔伽美什", "aliases": ["吉尔伽美什", "英雄王"], "role": "英雄王"},
    {"name": "两仪式", "aliases": ["两仪式", "式"], "role": "直死之魔眼持有者"},
    {"name": "苍崎橙子", "aliases": ["苍崎橙子", "橙子"], "role": "人偶师 / 魔术师"},
    {"name": "远野志贵", "aliases": ["远野志贵", "志贵"], "role": "直死之魔眼持有者"},
    {"name": "爱尔奎特", "aliases": ["爱尔奎特", "真祖"], "role": "真祖公主"},
]


def compact(text):
    return re.sub(r"\s+", " ", text).strip()


def score_item(item, aliases):
    text = f"{item.get('novel','')} {item.get('title','')} {item.get('text','')}"
    score = 0
    for alias in aliases:
        if alias:
            score += text.count(alias) * (10 if len(alias) >= 3 else 3)
    return score


def mark(name):
    ascii_part = "".join(ch for ch in name.upper() if ch.isascii() and ch.isalnum())
    if ascii_part:
        return ascii_part[:4]
    return name[:2]


def stats(seed):
    base = sum(ord(ch) for ch in seed)
    return {
        "will": 45 + base % 46,
        "sense": 45 + (base // 3) % 46,
        "charm": 45 + (base // 7) % 46,
        "combat": 45 + (base // 11) % 46,
    }


def skills(name, role):
    return [
        {"name": "原作记忆", "desc": "根据资料回忆相关经历"},
        {"name": "命运分歧", "desc": "在关键选择中改变路线"},
        {"name": role[:8] or "角色本能", "desc": "发挥该角色的身份特质"},
    ]


def main():
    rag = json.load(open(RAG_PATH, encoding="utf-8"))
    by_work = {}
    for item in rag.get("items", []):
        by_work.setdefault(item["novel"], []).append(item)

    works = []
    for work, items in sorted(by_work.items()):
        chars = []
        for char in CHARACTERS:
            scored = []
            for item in items:
                score = score_item(item, char["aliases"])
                if score > 0:
                    scored.append((score, item))
            scored.sort(key=lambda pair: pair[0], reverse=True)
            if not scored:
                continue
            refs = [pair[1] for pair in scored[:3]]
            detail = compact(" ".join(ref["text"] for ref in refs))[:360]
            chars.append({
                "id": f"{work}-{char['name']}",
                "name": char["name"],
                "mark": mark(char["name"]),
                "role": char["role"],
                "work": work,
                "personality": f"来自《{work}》资料的可操控角色。请参考原作片段保持言行一致。",
                "detail": detail,
                "stats": stats(work + char["name"]),
                "skills": skills(char["name"], char["role"]),
                "aliases": char["aliases"],
                "refs": [{"novel": r["novel"], "title": r["title"], "chunk": r["chunk"], "text": r["text"][:220]} for r in refs],
            })
        if chars:
            chars.sort(key=lambda c: c["name"])
            works.append({"name": work, "characters": chars})

    json.dump({"version": "fate-character-catalog-v1", "works": works}, open(OUT_PATH, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"导出 {sum(len(w['characters']) for w in works)} 个角色，{len(works)} 部作品到 {OUT_PATH}")


if __name__ == "__main__":
    main()
