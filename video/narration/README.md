# Narration for silent site videos

`narrate.mjs` adds a voice track (and optionally a music bed) to a finished silent video and writes
WebVTT captions from the spoken words. The picture is copied untouched unless the script points at an
edited source.

```sh
XI_API_KEY=... node video/narration/narrate.mjs video/narration/scripts/<slug>.json
```

- Voice: ElevenLabs "Anton Abyzov best voice" (`0Ki1af67ybTaTu4TNmO8`, `eleven_v4`). Never the older clones.
- Each line has a window `[start, end]`; a line up to 15% too long is sped up, longer lines fail with the overrun.
- `text` is the caption; `say` is an optional spoken form for file names and acronyms.
- Where a sentence is burned into the picture, narrate it word for word so viewers read and hear the same thing.
- Output is -16 LUFS integrated, true peak -1.5 dBFS, AAC 192k 48 kHz stereo.
- `work/` (ignored) caches each generated line and keeps the silent sources, so reruns cost nothing.

Tutorials are voice only, like the other narrated episodes. The SpecWithCode tour also carries
"Make Funk" by HoliznaCC0 (CC0), the bed used by the Studio overview.

The agent result walkthrough's last two scenes hold their final frame for 2.8 s and 3.5 s
(`work/agent-result-walkthrough/silent-extended.mp4`, made from the 43.7 s silent cut) so the
on-screen sentences fit when spoken.
