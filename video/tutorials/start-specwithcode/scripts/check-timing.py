#!/usr/bin/env python3
"""Caption onsets and pauses of a published tutorial.
Usage: python3 -I check-timing.py <video.mp4> <captions.en.vtt>
Prints each cue start against the nearest speech onset (ffmpeg silencedetect -40 dB, 0.18 s) and every pause over 0.6 s."""
import re, subprocess, sys

video, vtt = sys.argv[1:3]
log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-af", "silencedetect=n=-40dB:d=0.18", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]

def ts(s):
    h, m, x = s.split(":")
    return int(h) * 3600 + int(m) * 60 + float(x)

cues = [(ts(a), t) for a, _b, t in re.findall(r"([\d:.]+) --> ([\d:.]+)\n(.+)", open(vtt).read())]
worst = 0.0
for c, text in cues:
    onset = min(ends, key=lambda e: abs(e - c))
    d = c - onset
    note = "" if abs(d) <= 0.4 else "  (no pause nearby: mid-speech cue)"
    if abs(d) <= 0.4:
        worst = max(worst, abs(d))
    print(f"{c:7.2f}  onset {onset:7.2f}  {d:+.2f}  {text[:48]}{note}")
print(f"max |cue - onset| where a pause exists: {worst:.2f} s")
print("pauses over 0.6 s:", [(round(s, 2), round(e - s, 2)) for s, e in zip(starts, ends) if e - s > 0.6])
