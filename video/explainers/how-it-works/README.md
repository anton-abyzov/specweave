# How SpecWithCode works

Sources for the 2.5-minute explainer on /tutorials and its 35-second vertical cut. Media (screen takes, b-roll, voiceover, sound effects, music, renders) is not committed; only what rebuilds the compositions is.

| Path | What it is |
|---|---|
| `scripts/vo-lines.json`, `scripts/vo-lines-short.json` | The narration, one line per beat. Voice: ElevenLabs "Anton Abyzov best voice" on `eleven_v4` |
| `scripts/vo.mjs` | Voiceover from ElevenLabs (`XI_API_KEY=... node scripts/vo.mjs scripts/vo-lines.json <outDir>`) |
| `vo-words/` | Word timings of each line (mlx_whisper large-v3-turbo); every pop and caption is timed from them |
| `scripts/rec.mjs` | Headless 4K takes of a running SpecWithCode server through a read-only pairing; writes `<take>.mp4` and its cues and cursor moves |
| `takes/` | Cues, element boxes and cursor moves of each take |
| `scripts/build.mjs`, `scripts/style.css` | Writes `hyperframes/index.html`, its captions and `hyperframes/sfx.json` |
| `scripts/build-short.mjs` | Writes `short/index.html` from the main render |
| `scripts/sfx.mjs` | Mixes the sound-effect cues under a render |
| `scripts/finish.sh` | Adds the music bed, ducked under the voice, and normalises to -16 LUFS |

```bash
# takes: pair a read-only session, then record each take
specwithcode pair --base-dir ~/.specweave-studio/m4 --json --scope orchestration:read --scope diagnostics:read --ttl 5m > pair.json
node pair-headless.mjs pair.json state.json && node scripts/rec.mjs state.json <recDir> desk   # also project, coordinator, usage, connections, providers, autoresolve
node scripts/build.mjs
cd hyperframes && npx --yes hyperframes@0.8.145 check
npx --yes hyperframes@0.8.145 render --quality delivery --fps 30 --video-frame-format png -o renders/main.mp4
cd .. && node scripts/sfx.mjs hyperframes/renders/main.mp4 <sfxDir> main-fx.mp4
bash scripts/finish.sh main-fx.mp4 <music.mp3> out.mp4 poster.jpg 150
```

Media goes in `hyperframes/media/` and `short/media/`, encoded with a keyframe every second (`-g 30`), or the renderer freezes frames. Revoke the recording's browser sessions afterwards (`specwithcode auth session revoke`).
