import hashlib
import math
import re
import struct

DIMENSION = 384
CHUNK_SIZE = 1200
CHUNK_OVERLAP = 180


def read_text(path):
    for encoding in ("utf-8", "utf-8-sig", "gb18030"):
        try:
            with open(path, "r", encoding=encoding) as file:
                return file.read()
        except UnicodeDecodeError:
            continue
    with open(path, "r", encoding="utf-8", errors="ignore") as file:
        return file.read()


def clean_text(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    text = clean_text(text)
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = min(len(text), start + size)
        window = text[start:end]
        if end < len(text):
            cut = max(window.rfind("。"), window.rfind("！"), window.rfind("？"), window.rfind("\n"))
            if cut > size * 0.55:
                end = start + cut + 1
                window = text[start:end]
        chunks.append(window.strip())
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return [chunk for chunk in chunks if chunk]


def tokens(text):
    lowered = text.lower()
    words = re.findall(r"[a-z0-9_]+", lowered)
    chars = [ch for ch in lowered if "\u4e00" <= ch <= "\u9fff"]
    grams = []
    grams.extend(words)
    for n in (2, 3):
        for i in range(max(0, len(chars) - n + 1)):
            grams.append("".join(chars[i:i + n]))
    return grams or list(lowered[:200])


def embed(text, dimension=DIMENSION):
    vector = [0.0] * dimension
    for token in tokens(text):
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        value = int.from_bytes(digest, "little")
        index = value % dimension
        sign = 1.0 if (value >> 63) == 0 else -1.0
        vector[index] += sign
    norm = math.sqrt(sum(item * item for item in vector)) or 1.0
    return [item / norm for item in vector]


def pack_vector(vector):
    return struct.pack(f"<{len(vector)}f", *vector)


def unpack_vector(blob):
    return struct.unpack(f"<{len(blob) // 4}f", blob)


def dot(left, right):
    return sum(a * b for a, b in zip(left, right))
