import importlib.util, json, pathlib, sys
spec = importlib.util.spec_from_file_location("h", pathlib.Path.home() / "Projects/github/marketing/videos/aabyzov-futsal-belarus-june-2026/scripts/publish_approved.py")
h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
st = json.loads(pathlib.Path(__file__).resolve().parents[1].joinpath("renders/publish-state" + (sys.argv[1] if len(sys.argv) > 1 else "") + ".json").read_text())
ph = {"Authorization": h.postiz_key(), "showorg": "true"}
s, d = h.json_request("GET", h.POSTIZ_PUBLIC + "/posts?startDate=2026-10-02T00:00:00.000Z&endDate=2026-10-05T00:00:00.000Z", ph)
for p in d.get("posts", []):
    if p["id"] == st["post"]["id"] or p.get("group") == st["post"]["response"][0].get("group"):
        print(json.dumps({k: p.get(k) for k in ("id", "state", "releaseURL", "error", "publishDate")}))
