# How SpecWithCode works

Sources for the 2-minute explainer on /tutorials and its 35-second vertical cut. Media (screen takes, b-roll, voiceover, music, renders) is not committed; only what rebuilds the compositions is.

| Path | What it is |
|---|---|
| `edit.json` | Both cuts, beat by beat: footage segments and speeds, crops and zooms, diagrams, step chips |
| `scripts/vo-lines.json` | The narration, one line per beat |
| `scripts/vo.mjs` | Voiceover from ElevenLabs (`XI_API_KEY=... node scripts/vo.mjs scripts/vo-lines.json <outDir>`) |
| `vo-words/` | Word timings of each voiceover line, used to time captions |
| `diagrams/d1-d4.mjs` | Animated diagrams; each exports `build({variant, start, duration})` |
| `scripts/assemble.mjs` | Writes `<cut>/index.html` and `<cut>/captions.en.vtt` from `edit.json` |
| `scripts/finish.sh` | Adds the music bed, ducked under the voice, and normalises to -16 LUFS |

```bash
node scripts/assemble.mjs main      # or: short
cd hyperframes && npx --yes hyperframes@0.8.145 check
npx --yes hyperframes@0.8.145 render --quality delivery --fps 30 --video-frame-format png -o renders/main.mp4
cd .. && bash scripts/finish.sh hyperframes/renders/main.mp4 hyperframes/media/main.mp3 out.mp4 poster.jpg 56
```

Media goes in `hyperframes/media/` and `short/media/`, encoded with a keyframe every second (`-g 30`), or the renderer freezes frames.
