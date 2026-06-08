import json
import os
import sqlite3
import time
from pathlib import Path

from vector_utils import DIMENSION, chunk_text, embed, pack_vector, read_text

BASE_DIR = Path(__file__).resolve().parent
SOURCE_DIR = BASE_DIR.parent / "同人素材" / "Fate"
DB_PATH = BASE_DIR / "fate_vectors.sqlite3"
MANIFEST_PATH = BASE_DIR / "manifest.json"


def novel_name(path):
    try:
        return path.relative_to(SOURCE_DIR).parts[0]
    except ValueError:
        return path.parent.name


def create_schema(conn):
    conn.executescript(
        """
        DROP TABLE IF EXISTS chunks;
        DROP TABLE IF EXISTS documents;
        DROP TABLE IF EXISTS metadata;

        CREATE TABLE metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel TEXT NOT NULL,
            title TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            char_count INTEGER NOT NULL,
            chunk_count INTEGER NOT NULL
        );

        CREATE TABLE chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            novel TEXT NOT NULL,
            title TEXT NOT NULL,
            path TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            start_hint INTEGER NOT NULL,
            text TEXT NOT NULL,
            embedding BLOB NOT NULL,
            FOREIGN KEY(document_id) REFERENCES documents(id)
        );

        CREATE INDEX idx_chunks_document ON chunks(document_id);
        CREATE INDEX idx_chunks_novel ON chunks(novel);
        """
    )


def build():
    if not SOURCE_DIR.exists():
        raise SystemExit(f"源目录不存在：{SOURCE_DIR}")

    txt_files = sorted(SOURCE_DIR.rglob("*.txt"))
    if not txt_files:
        raise SystemExit(f"没有找到 txt 文件：{SOURCE_DIR}")

    conn = sqlite3.connect(DB_PATH)
    create_schema(conn)
    imported = []
    total_chunks = 0

    for path in txt_files:
        text = read_text(path)
        chunks = chunk_text(text)
        relative = str(path.relative_to(BASE_DIR.parent))
        title = path.stem
        novel = novel_name(path)
        cursor = conn.execute(
            "INSERT INTO documents(novel, title, path, char_count, chunk_count) VALUES (?, ?, ?, ?, ?)",
            (novel, title, relative, len(text), len(chunks)),
        )
        document_id = cursor.lastrowid

        start_hint = 0
        for index, chunk in enumerate(chunks):
            conn.execute(
                """
                INSERT INTO chunks(document_id, novel, title, path, chunk_index, start_hint, text, embedding)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (document_id, novel, title, relative, index, start_hint, chunk, pack_vector(embed(chunk))),
            )
            start_hint += max(1, len(chunk) - 180)

        imported.append({
            "novel": novel,
            "title": title,
            "path": relative,
            "charCount": len(text),
            "chunkCount": len(chunks),
        })
        total_chunks += len(chunks)

    metadata = {
        "sourceDir": str(SOURCE_DIR.relative_to(BASE_DIR.parent)),
        "database": DB_PATH.name,
        "dimension": DIMENSION,
        "chunkSize": 1200,
        "chunkOverlap": 180,
        "documentCount": len(imported),
        "chunkCount": total_chunks,
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "embedding": "local-hashed-char-ngram-v1",
    }
    for key, value in metadata.items():
        conn.execute("INSERT INTO metadata(key, value) VALUES (?, ?)", (key, json.dumps(value, ensure_ascii=False)))

    conn.commit()
    conn.close()

    with open(MANIFEST_PATH, "w", encoding="utf-8") as file:
        json.dump({"metadata": metadata, "documents": imported}, file, ensure_ascii=False, indent=2)

    print(f"已导入 {len(imported)} 部/篇小说，{total_chunks} 个文本块")
    print(f"数据库：{DB_PATH}")
    print(f"清单：{MANIFEST_PATH}")


if __name__ == "__main__":
    os.chdir(BASE_DIR)
    build()
