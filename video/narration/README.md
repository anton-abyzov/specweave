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
- `work/` (ignored) caches each generated line, so local reruns only voice changed lines.
- Silent sources are not committed. Restore one before a rerun:
  `git show 48f43d581^:<out path> > video/narration/work/<slug>/silent-source.mp4`
  (`<out path>` is the script's `out`, e.g. `docs-site/static/video/studio-tutorial.mp4`).

Tutorials are voice only, like the other narrated episodes. The SpecWithCode tour also carries
"Make Funk" by HoliznaCC0 (CC0), the bed used by the Studio overview.

The agent result walkthrough's last two scenes hold their final frame for 2.8 s and 3.5 s
so the on-screen sentences fit when spoken. Rebuild that source from the restored 43.7 s cut:

```sh
W=video/narration/work/agent-result-walkthrough
ffmpeg -i $W/silent-source.mp4 -filter_complex "[0:v]split=2[a][b];[a]trim=0:38.9,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=2.8[va];[b]trim=start=38.9,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=3.5[vb];[va][vb]concat=n=2:v=1:a=0[v]" -map "[v]" -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 16 -preset slow -r 30 -movflags +faststart $W/silent-extended.mp4
```

## Publishing

Git ignores rendered videos under `docs-site/static/video/`; the site plays them from R2
(`media.spec-weave.com`, bucket `specweave-docs-media`). After a render, upload it:
`npm --prefix docs-site run videos:publish -- docs-site/static/video/<path>.mp4` (no file names uploads every render).
Posters (`.jpg`) and captions (`.vtt`) stay in git next to where the video was.
