"""Upload the rendered video to the AI Power YouTube channel through Postiz.

Uploads as PRIVATE so Anton can review before making it public.
Idempotent: receipts live in renders/publish-state.json; rerunning reuses them.
Reuses the proven Postiz helpers (login, SSH-tunnel upload) from the marketing repo.
"""
import datetime as dt
import importlib.util
import json
import pathlib
import re
import sys
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
HELPER = pathlib.Path.home() / "Projects/github/marketing/videos/aabyzov-futsal-belarus-june-2026/scripts/publish_approved.py"
spec = importlib.util.spec_from_file_location("h", HELPER)
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)

AI_POWER = "cmgyq88pu0001po4fdvq4fvii"  # Anton Abyzov: AI Power (@antonabyzov)
VIDEO = ROOT / "renders/claude-code-projects-opus-5-5.mp4"
THUMB = ROOT / "thumb/ai-A-1280.jpg"
STATE = ROOT / "renders/publish-state.json"
PRIVACY = sys.argv[1] if len(sys.argv) > 1 else "private"
assert PRIVACY in ("private", "unlisted", "public")

meta = (ROOT / "youtube-metadata.md").read_text()
title = re.search(r"## Title\n\n(.+)\n", meta).group(1).strip()
description = re.search(r"## Description\n\n(.+?)\n\n## Tags", meta, re.S).group(1).strip()
tags = [t.strip() for t in re.search(r"## Tags\n\n(.+?)\n", meta).group(1).split(",") if t.strip()]
assert len(title) <= 100 and len(description) <= 5000 and sum(map(len, tags)) < 500

state = json.loads(STATE.read_text()) if STATE.exists() else {"media": {}, "post": None}
save = lambda: h.atomic_json(STATE, state)
key = h.postiz_key()
ph = {"Authorization": key, "showorg": "true"}


def request(method, url, body=None, timeout=300):
    status, data = h.json_request(method, url, ph, body, timeout=timeout)
    assert status in (200, 201), f"HTTP {status}: {str(data)[:500]}"
    return data


channel = {x["id"]: x for x in request("GET", h.POSTIZ_PUBLIC + "/integrations")}.get(AI_POWER)
assert channel and channel["identifier"] == "youtube" and not channel["disabled"], channel
assert "AI Power" in channel["name"], channel["name"]
print("CHANNEL", channel["name"], channel.get("profile"))

if state["post"]:
    print("ALREADY SUBMITTED", state["post"]["id"])
    sys.exit(0)

today = dt.datetime.now(dt.timezone.utc)
window = f"?startDate={(today - dt.timedelta(days=7)).strftime('%Y-%m-%dT00:00:00.000Z')}&endDate={(today + dt.timedelta(days=30)).strftime('%Y-%m-%dT23:59:59.000Z')}"
live = request("GET", h.POSTIZ_PUBLIC + "/posts" + window)["posts"]
dupe = [p for p in live if p["integration"]["id"] == AI_POWER and "Claude Code Projects" in (p.get("content") or "")]
assert not dupe, "A post for this video already exists: " + json.dumps([p["id"] for p in dupe])

pending = [p for p in (VIDEO, THUMB) if h.sha256(p) != state["media"].get(p.name, {}).get("sha256")]
if pending:
    auth = h.postiz_login()
    tunnel, port = h.open_tunnel()
    try:
        for path in pending:
            print(f"UPLOAD {path.name} {path.stat().st_size / 1048576:.1f} MiB", flush=True)
            remote = h.upload_multipart(port, auth, path)
            state["media"][path.name] = {"sha256": h.sha256(path), "remote": {
                "id": remote["id"], "path": remote["path"],
                "name": remote.get("name") or pathlib.Path(remote["path"]).name,
                "originalName": remote.get("originalName") or path.name}}
            save()
            print("UPLOADED", path.name, remote["id"], flush=True)
    finally:
        tunnel.terminate()

obj = lambda name: {k: state["media"][name]["remote"][k] for k in ("id", "path")}
settings = {"title": title, "type": PRIVACY, "selfDeclaredMadeForKids": "no",
            "thumbnail": obj(THUMB.name), "tags": [{"value": t, "label": t} for t in tags]}
when = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=60)).isoformat(timespec="milliseconds").replace("+00:00", "Z")
payload = {"type": "schedule", "date": when, "shortLink": False, "tags": [],
           "posts": [{"integration": {"id": AI_POWER}, "value": [{"content": description, "image": [obj(VIDEO.name)]}],
                      "group": str(uuid.uuid4()), "settings": settings}]}
h.atomic_json(ROOT / "renders/youtube-payload.json", payload)
response = request("POST", h.POSTIZ_PUBLIC + "/posts", payload)
assert response and response[0].get("postId"), response
state["post"] = {"id": response[0]["postId"], "date": when, "privacy": PRIVACY, "response": response}
save()
print("SUBMITTED", response[0]["postId"], "at", when, "as", PRIVACY)
