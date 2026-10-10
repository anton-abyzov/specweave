"""Generate the v2 narration in Anton's cloned ElevenLabs voice and lay out the timeline.

Reads storyboard-v2.json, synthesizes every beat's "say" line (cached by text hash),
then writes:
  assets/vo/<scene>-<beat>.mp3       one clip per beat, with character alignment JSON
  assets/vo/narration.wav            all clips laid end to end with pauses
  timeline.json                      beat start/duration + word timings for build-v2.mjs

Run: python3 scripts/voice.py
"""
import base64
import hashlib
import json
import pathlib
import re
import subprocess
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
VO = ROOT / "assets/vo"
VO.mkdir(parents=True, exist_ok=True)
CREDS = pathlib.Path.home() / ("Projects/Obsidian/personal-docs/003 Resources/Technical Knowledge/"
                               "Credentials-Secrets-Passwords/AI-ML-Services/ElevenLabs api key token.md")
KEY = re.search(r"sk_[A-Za-z0-9]{20,}", CREDS.read_text()).group(0)
SB = json.loads((ROOT / "storyboard-v2.json").read_text())
VOICE = SB["voice"]
GAP_BEAT, GAP_SCENE, LEAD_IN = 0.35, 0.7, 0.4
SR = 48000


def tts(text: str, out: pathlib.Path) -> dict:
    meta = out.with_suffix(".json")
    digest = hashlib.sha256((VOICE["voice_id"] + VOICE["model_id"] + text).encode()).hexdigest()
    if meta.exists() and json.loads(meta.read_text()).get("hash") == digest and out.exists():
        return json.loads(meta.read_text())
    body = {"text": text, "model_id": VOICE["model_id"],
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.85, "style": 0.15, "use_speaker_boost": True}}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE['voice_id']}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), method="POST",
        headers={"xi-api-key": KEY, "Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read())
    out.write_bytes(base64.b64decode(data["audio_base64"]))
    al = data.get("alignment") or data.get("normalized_alignment")
    record = {"hash": digest, "text": text, "alignment": al}
    meta.write_text(json.dumps(record))
    print("TTS", out.name, len(text), "chars", flush=True)
    return record


def duration(path: pathlib.Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def words(al: dict, offset: float) -> list:
    chars, starts, ends = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    result, cur, cs = [], "", None
    for ch, s, e in zip(chars, starts, ends):
        if ch.isspace():
            if cur:
                result.append([cur, round(cs + offset, 3), round(pe + offset, 3)])
            cur, cs = "", None
            continue
        if cs is None:
            cs = s
        cur += ch
        pe = e
    if cur:
        result.append([cur, round(cs + offset, 3), round(pe + offset, 3)])
    return result


timeline = {"scenes": []}
cursor = LEAD_IN
segments = []  # (path, start)
for scene in SB["scenes"]:
    sc = {"id": scene["id"], "start": round(cursor, 3), "beats": []}
    for i, beat in enumerate(scene["beats"]):
        clip = VO / f"{scene['id']}-{i}.mp3"
        rec = tts(beat["say"], clip)
        d = duration(clip)
        sc["beats"].append({"start": round(cursor, 3), "audio": round(d, 3), "clip": str(clip.relative_to(ROOT)),
                            "words": words(rec["alignment"], cursor)})
        segments.append((clip, cursor))
        cursor += d + (GAP_BEAT if i < len(scene["beats"]) - 1 else GAP_SCENE)
    sc["end"] = round(cursor, 3)
    timeline["scenes"].append(sc)
timeline["total"] = round(cursor + 1.5, 3)

# Mix every clip at its offset into one narration track.
inputs, filters = [], []
for n, (clip, start) in enumerate(segments):
    inputs += ["-i", str(clip)]
    ms = int(round(start * 1000))
    filters.append(f"[{n}:a]aresample={SR},adelay={ms}|{ms}[a{n}]")
mix = "".join(f"[a{n}]" for n in range(len(segments)))
filters.append(f"{mix}amix=inputs={len(segments)}:normalize=0,apad=whole_dur={timeline['total']},"
               f"loudnorm=I=-16:TP=-1.5:LRA=11[out]")
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[out]",
                "-ac", "2", "-ar", str(SR), str(VO / "narration.wav")], check=True)
(ROOT / "timeline.json").write_text(json.dumps(timeline, indent=1))
print(f"narration.wav + timeline.json: {timeline['total']:.1f}s, {len(segments)} clips")
