import requests
import time
import json
import os

API_URL = "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/sertanejo"

CACHE_FILE = "playlist_cache.json"
OUTPUT_FILE = "playlist.js"

def format_name(filename):
    name = filename.replace(".mp3", "")
    parts = name.split(".-.")

    if len(parts) != 2:
        return None

    artist = parts[0].replace(".", " ").title()
    title = parts[1].replace(".", " ").title()

    return artist, title


def fetch_data():
    print("🌐 Buscando dados do GitHub...")
    response = requests.get(API_URL)
    return response.json()


def build_playlist(data):
    playlist = []

    for asset in data.get("assets", []):
        name = asset["name"]

        if not name.endswith(".mp3"):
            continue

        parsed = format_name(name)

        if parsed:
            artist, title = parsed

            playlist.append({
                "title": title,
                "artist": artist,
                "src": asset["browser_download_url"]
            })

    # remove duplicados
    playlist = list({m['src']: m for m in playlist}.values())

    return playlist


def save_cache(playlist):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(playlist, f, ensure_ascii=False, indent=2)


def load_cache():
    if not os.path.exists(CACHE_FILE):
        return None

    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_js(playlist):
    print("🧠 Gerando playlist.js...")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("const playlist = [\n")

        for m in playlist:
            f.write(f"""  {{ 
    title: "{m['title']}", 
    artist: "{m['artist']}",
    src: "{m['src']}"
  }},\n""")

        f.write("];")


def has_changed(new, old):
    return json.dumps(new, sort_keys=True) != json.dumps(old, sort_keys=True)


def update():
    data = fetch_data()
    new_playlist = build_playlist(data)
    old_playlist = load_cache()

    if old_playlist and not has_changed(new_playlist, old_playlist):
        print("✅ Nenhuma mudança detectada.")
        return

    print("⚡ Mudanças detectadas! Atualizando...")

    save_cache(new_playlist)
    generate_js(new_playlist)

    print(f"🎧 {len(new_playlist)} músicas processadas!")


if __name__ == "__main__":
    update()