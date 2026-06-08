import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PUBLISH_DIR = BASE_DIR.parent / "publish"


def write_js(json_name, js_name, global_name):
    data = json.load(open(PUBLISH_DIR / json_name, encoding="utf-8"))
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    content = f"window.GameData = window.GameData || {{}};\nwindow.GameData.{global_name} = {payload};\n"
    with open(PUBLISH_DIR / js_name, "w", encoding="utf-8") as file:
        file.write(content)
    print(f"导出 {js_name}")


def main():
    write_js("rag-index.json", "rag-index.js", "ragIndex")
    write_js("character-catalog.json", "character-catalog-data.js", "characterCatalog")


if __name__ == "__main__":
    main()
