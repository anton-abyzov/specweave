"""Lip-sync Anton's HeyGen avatar to the cloned-voice clips for the avatar scenes.

For every storyboard scene of type "avatar", uploads that beat's narration clip and
asks HeyGen v3 for a transparent (WebM) avatar video; falls back to MP4 on a dark
background when the avatar has no matting. Receipts in assets/avatar/<take>.json,
so reruns never pay twice.

Run: python3 scripts/avatar.py   (after scripts/voice.py)
"""
import json
import pathlib
import time
import urllib.request

import requests

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/avatar"
OUT.mkdir(parents=True, exist_ok=True)
CREDS = pathlib.Path.home() / ("Projects/Obsidian/personal-docs/003 Resources/Technical Knowledge/"
                               "Credentials-Secrets-Passwords/AI-ML-Services/HeyGen API key.md")
KEY = next(l.strip("` ").strip() for l in CREDS.read_text().splitlines()
           if len(l.strip("` ")) > 40 and not l.startswith(("tags", "#")))
S = requests.Session()
S.headers["x-api-key"] = KEY
SB = json.loads((ROOT / "storyboard-v2.json").read_text())
AVATAR = SB["avatar"]["avatar_id"]


def upload(path: pathlib.Path) -> str:
    with path.open("rb") as f:
        r = S.post("https://api.heygen.com/v3/assets", files={"file": (path.name, f, "audio/mpeg")}, timeout=120)
    r.raise_for_status()
    return r.json()["data"]["asset_id"]


def create(take: str, asset: str, fmt: str) -> requests.Response:
    body = {"type": "avatar", "avatar_id": AVATAR, "audio_asset_id": asset, "title": f"Opus 5.5 video - {take}",
            "resolution": "1080p", "aspect_ratio": "16:9", "output_format": fmt}
    if fmt == "mp4":
        body["background"] = {"type": "color", "value": "#131416"}
    return S.post("https://api.heygen.com/v3/videos", json=body, timeout=120,
                  headers={"Idempotency-Key": f"opus55-v2-{take}-{fmt}"})


for scene in SB["scenes"]:
    if scene["type"] != "avatar":
        continue
    take = scene["avatar_take"]
    rec_path = OUT / f"{take}.json"
    rec = json.loads(rec_path.read_text()) if rec_path.exists() else {}
    clip = ROOT / f"assets/vo/{scene['id']}-0.mp3"
    if not rec.get("video_id"):
        rec["asset_id"] = upload(clip)
        for fmt in ("webm", "mp4"):
            r = create(take, rec["asset_id"], fmt)
            print(take, fmt, r.status_code, r.text[:300], flush=True)
            if r.ok:
                rec.update(video_id=r.json()["data"]["video_id"], format=fmt)
                break
        else:
            raise SystemExit(f"HeyGen refused {take}")
        rec_path.write_text(json.dumps(rec, indent=1))
    while True:
        d = S.get(f"https://api.heygen.com/v3/videos/{rec['video_id']}", timeout=60).json()["data"]
        if d["status"] == "completed":
            break
        if d["status"] == "failed":
            raise SystemExit(f"{take} failed: {d.get('failure_message')}")
        time.sleep(15)
    dest = OUT / f"{take}.{rec['format']}"
    req = urllib.request.Request(d["video_url"], headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=300) as r:
        dest.write_bytes(r.read())
    rec.update(status="completed", file=str(dest.relative_to(ROOT)), duration=d.get("duration"))
    rec_path.write_text(json.dumps(rec, indent=1))
    print("DONE", take, dest.name, d.get("duration"), flush=True)
