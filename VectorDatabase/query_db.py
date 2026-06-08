import argparse
import sqlite3
from pathlib import Path

from vector_utils import dot, embed, unpack_vector

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fate_vectors.sqlite3"


def search(query, top_k=5, novel=None):
    query_vector = embed(query)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    if novel:
        rows = conn.execute("SELECT * FROM chunks WHERE novel LIKE ?", (f"%{novel}%",)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM chunks").fetchall()

    results = []
    for row in rows:
        score = dot(query_vector, unpack_vector(row["embedding"]))
        results.append((score, row))
    results.sort(key=lambda item: item[0], reverse=True)
    conn.close()
    return results[:top_k]


def main():
    parser = argparse.ArgumentParser(description="查询 Fate 小说向量数据库")
    parser.add_argument("query", help="查询文本")
    parser.add_argument("--top-k", type=int, default=5, help="返回数量")
    parser.add_argument("--novel", default=None, help="限定小说/文件夹名称关键词")
    args = parser.parse_args()

    for rank, (score, row) in enumerate(search(args.query, args.top_k, args.novel), 1):
        text = row["text"].replace("\n", " ")
        preview = text[:260] + ("..." if len(text) > 260 else "")
        print(f"#{rank} score={score:.4f}")
        print(f"novel={row['novel']}")
        print(f"title={row['title']} chunk={row['chunk_index']} path={row['path']}")
        print(preview)
        print("-" * 80)


if __name__ == "__main__":
    main()
