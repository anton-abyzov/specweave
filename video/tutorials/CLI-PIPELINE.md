# CLI tutorial pipeline

How CLI tutorial 1 (`handoff-claude-to-codex/`) was made after its review, as the recipe for the next CLI tutorials (install and first increment, the daily loop, review with the other model). PIPELINE.md covers the SpecWithCode app episodes. SERIES.md holds the series rules; this file says where CLI tutorials follow them and where they differ.

A CLI tutorial is a real run of the `specweave` CLI from this repo in a disposable home. The terminal is drawn by a HyperFrames composition from the captured output, so it is sharp at any size and every character on screen is real output. No agent session runs: a command "as Claude Code" or "as Codex" is the same CLI with `SPECWEAVE_TOOL=claude` or `codex`, and the outro and the `tutorials.json` note say so.

## Files

Copy `handoff-claude-to-codex/` as the template and change only the episode parts.

| Path | Kind | Notes |
|---|---|---|
| `<slug>/SCRIPT.md` | episode | Beats, VO, on-camera commands, findings, exceptions |
| `<slug>/captures/spec.md` | episode | The increment the demo repo gets off camera |
| `<slug>/captures/session.json` | generated | Every on-camera command with its real output |
| `<slug>/scripts/capture.mjs` | episode | Off-camera setup plus the `shot(...)` list |
| `<slug>/scripts/vo-lines.json` | episode | Caption text plus the spoken form, per chunk |
| `<slug>/scripts/tts.mjs` | shared | ElevenLabs `/with-timestamps` call, trim, cue and word times |
| `<slug>/scripts/build-composition.mjs` | shared | Writes `hyperframes/index.html` and the VTT files |
| `<slug>/scripts/finish.sh` | shared | Loudness, AAC, poster |
| `<slug>/scripts/check-timing.py` | shared | Caption onsets and pauses of the published file |
| `<slug>/edit.json` | episode | Beats, chips, screens, anchors, highlights |
| `<slug>/vo-timing/*.json` | generated | Cue and word times per beat |
| `<slug>/hyperframes/` | template | `hyperframes.json`, `package.json`, `.gitignore` and the fonts with their OFL files. Set `meta.json` id and name to the slug. `index.html` is generated, and `assets/media` is a symlink. |

Outside the repo, in `/Users/Shared/specwithcode-demo/<tutNN-slug>/`:

- `final/`: the disposable home, shim and session log. `capture.mjs` deletes and rebuilds it on every run.
- `vo/`: raw MP3s and alignment JSON. Each line is generated once; delete a line's `.raw.mp3` and `.alignment.json` to redo it.
- `media/`: the trimmed WAVs, linked as `hyperframes/assets/media`.
- `build/`: `render.mp4`, both VTT files and `timeline.json`.
- `out/`: old versions worth keeping.

Only these go into the repo: the episode folder (about 260 KB), `docs-site/static/video/tutorials/<slug>.{mp4,jpg,en.vtt,chapters.vtt}` and the entry in `docs-site/src/data/tutorials.json`.

## Steps

All commands run from the episode folder `video/tutorials/<slug>/` unless they say otherwise. `REPO` is the specweave worktree, and `DEMO` is `/Users/Shared/specwithcode-demo/<tutNN-slug>`. Use Node 22.

### 1. Plan

1. **Beats.** Write the beats in `SCRIPT.md` from the tutorial's row in content-architecture section 3. A typical shape:
   - an intro card of about 5 s;
   - five or six terminal beats of 8–14 s each;
   - an outro card naming the next step.

   Aim for 75–90 s and about 170 spoken words.
2. **Read the code first.** Every claim in the VO must match `src`: thresholds, defaults, file names, what a command prints. Note the file and line for each claim in SCRIPT.md.
3. **Write `scripts/vo-lines.json`.** Keep `voiceId` `0Ki1af67ybTaTu4TNmO8`, `modelId` `eleven_v4` and the voice settings unchanged (`tts.mjs` refuses anything else). Each line is one beat. Each chunk is `[caption text, spoken text]`:
   - **Caption text** uses backticks for commands and file names (`` `specweave pickup` ``).
   - **Spoken text** spells out what TTS would misread: "spec weave", "T zero two", "handoff dot M D", "dash dash run", "ninety-five percent".
   - **Chunks become caption cues.** Keep each one at 84 characters or fewer, and cut at clause boundaries.
   - **Give a visual its own chunk.** If something on screen needs its own moment (a diff overlay, say), make that chunk short, like "With the change in place,".
   - **Re-splitting is free.** You can re-split chunks later without a new TTS request, as long as the spoken chunks still join to the same string.
4. **Write `captures/spec.md` and adapt `scripts/capture.mjs`.**
   - The off-camera part builds the SERIES.md seed repo, runs `specweave init . --quick`, and creates the increment state the beat needs.
   - The on-camera part is a list of `shot(beat, tool, cmd)` calls.
   - Put a real `sleep` (`PICKUP_GAP_SECONDS`, 75 s by default) wherever the story says time passes or a different tool takes over. Timestamps and "1m ago" then read honestly.
   - Show changes as their real `git diff`, captured with `sh(...)`.

### 2. Compile the CLI and capture

```sh
cd "$REPO" && npx tsc                       # bin/specweave.js runs dist/; stale dist = stale output
node scripts/capture.mjs "$DEMO" "$REPO" captures/session.json
python3 -c "import json;s=json.load(open('captures/session.json'))
for i,sh in enumerate(s['shots']):
  print('=====',i,sh['beat'],sh['cmd'])
  for j,l in enumerate(sh['out'].split('\n')): print(j,l)"
```

- **Disposable environment.** `capture.mjs` runs everything under `env -i` with `HOME=$DEMO/final/home`, `SPECWEAVE_HOST=demo`, `SPECWEAVE_TOOL=<tool>`, `NO_COLOR=1` and a scutil shim. Git uses `Demo User <demo@example.com>`. The ledger reads `claude@demo` or `codex@demo`.
- **Privacy check.** It refuses to write the capture if the text contains `/Users/<anyone but Shared>`, the login name, `@gmail` or an `sk_` token.
- **Line numbers.** The printout above gives every output line its index; `edit.json` refers to those numbers.
- **Fix the CLI first.** If the output shows a CLI bug (a wrong count, a broken table, a double space), fix it in `src` with a test, compile, and capture again. Never edit captured output.

### 3. Voice

```sh
f="$HOME/Projects/Obsidian/personal-docs/003 Resources/Technical Knowledge/Credentials-Secrets-Passwords/AI-ML-Services/ElevenLabs api key token.md"
XI_API_KEY=$(grep -m1 -oE 'sk_[A-Za-z0-9]+' "$f") node scripts/tts.mjs scripts/vo-lines.json "$DEMO/vo" vo-timing
mkdir -p "$DEMO/media" && cp "$DEMO"/vo/*.wav "$DEMO/media/" && ln -sfn "$DEMO/media" hyperframes/assets/media
```

- **The key.** It is loaded only inside the command that uses it and is never printed. `tts.mjs` stops on the first error and has no fallback voice, model or format.
- **The request.** It is `POST /v1/text-to-speech/0Ki1af67ybTaTu4TNmO8/with-timestamps?output_format=mp3_44100_128`. The account's plan refuses the 192 kbps MP3 and PCM formats, and the key lacks `user_read`, so the plan can't be checked. Record this exception in SCRIPT.md.
- **What it writes per line.**
  - A 48 kHz mono 24-bit WAV, trimmed to 0.15 s before the first character and 0.3 s after the last.
  - `vo-timing/<id>.json` with `duration`, `cues` (one per chunk, from the character timestamps) and `words`.
  - Each `words` entry is `[chunk, spokenWordLowercase, start, end]`. Use these to anchor screen events.
- **Budget.** About 900 characters per full pass. Re-running with every raw file present costs nothing.

### 4. Edit (`edit.json`)

Top level:

| Key | Value in tutorial 1 | Meaning |
|---|---|---|
| `title`, `subtitle` | the H1; default subtitle "A real run of the SpecWeave {version} CLI in a sample repo." | Intro card |
| `outro.next`, `outro.note` | "Next: check the increment with `specweave verify`"; the disclosure line | Outro card |
| `voOffset` | 0.05 | Seconds from a beat's start to its VO start |
| `tailAfterVo` | 0.1 | Seconds after the VO before the next beat |
| `termCols` | 90 | Terminal wrap column |
| `visibleRows` | 15 | Rows before the card scrolls. Keeps the card clear of a two-line caption. |
| `posterAt` | 1.0 | Poster time: the intro card, before the first caption |

Per beat, after `id`, `kind` (`card` or `term`), `chapter` and, for terminal beats, `screen` and `stepChip`:

- `voOffset` / `tail` overrides:
  - intro: `1.1` and `0.3`, so the poster frame has no caption;
  - a doc-reading beat: `tail` `0.3`;
  - the last beat before the outro: `0.35`;
  - outro: `tail` `1.5`.
- `diffPanel` `{from, to, head}`: an overlay of `session.offCameraDiff`, at most 2.5 s (the build refuses longer).

A screen is one terminal card, kept across the beats that name it. A new screen starts when the tool changes or the story moves to a fresh terminal. Each `items[]` entry is one command:

- `shot`: the index into `session.shots`.
- `at`: when typing starts, as an anchor.
- `lines`: the output line ranges to show, `[[a,b],…]`. Every gap becomes one `…` row at 50% opacity. Elide paths outside the repo, long checkpoint lines and anything the VO does not explain (a changing "uncommitted" count, for example).
- `keepTop: true`: for a long `cat`, keep the command row at the top instead of jumping to the end.
- `hl[]`: `{lines, from, to}`, using output line indices. The build delays `from` until the row has appeared, refuses a highlight shorter than 0.5 s, and scrolls so the highlighted rows are in view.

**Anchors.** Never use a bare time. Write `[beat, null, offset]` (from the beat start), `[beat, cue, offset]` (from a caption chunk's start) or `[beat, cue, "word", offset]`. The word form uses the spoken word in lowercase with punctuation removed ("five-hour", "codex"); add `#2` for the second match. Type a command when its words are spoken ("say pick up" → `["05-pickup", 0, "say", 0]`). Highlight output on the word that names it.

### 5. Build, check, render

```sh
node scripts/build-composition.mjs . "$DEMO/build"           # prints total length and beat starts
cd hyperframes && PWDEBUG=0 npx --yes hyperframes@0.8.145 check
PWDEBUG=0 npx --yes hyperframes@0.8.145 render --quality delivery --fps 30 -o "$DEMO/build/render.mp4"
```

- `check`: lint has 0 errors. The nesting and density warnings are expected. In the layout pass, `content_overlap` is expected only under the diff overlay, and `text_occluded` info rows come from rows scrolled out of the clip box.
- The render is headless Chrome and takes about 40 s for 80 s of video.
- Before publishing, look at stills: `ffmpeg -ss <t> -i "$DEMO/build/render.mp4" -frames:v 1 x.jpg` at each highlight.

What the build does, so you don't have to:

- **Terminal.** JetBrains Mono 28 px on 42 px rows (line-height 1.5), 90 columns, wrapped at spaces (or after `/`), never mid-word. The card starts at one row (the prompt is there when the screen opens) and grows with its content up to `visibleRows`. It scrolls by whole rows inside a clip box, so no half row ever shows at the top.
- **Typing.** Commands type at 60 characters a second, for at most 1 s. Output starts 0.25 s after typing ends, with a 40 ms stagger between rows.
- **Highlights.** A 4 px iris bar on the left plus a 10% iris tint behind the row.
- **Captions.**
  - Burned in at Schibsted Grotesk 600, 40 px, at most two lines of at most 42 characters.
  - Lines break at the most balanced space, never inside backticks or "Claude Code".
  - The pill sits 56 px from the bottom, with code in mono on the sunken colour.
  - Each cue after the first in a beat starts at the nearest pause that ffmpeg `silencedetect` (-40 dB, 0.18 s) finds within ±0.4 s. A cue with no pause nearby keeps its character time.
  - Each cue lasts until the next one starts.
  - The build warns about a cue under 1 s, over 6 s, or one that needs more than two lines.
- **Look.**
  - Weave tokens: canvas `#f8f7f9`, panel `#ffffff`, sunken `#efedf2`, ink `#241523`, muted `#675d69`, line `#dedae5`, iris `#6d4fb5`.
  - Schibsted Grotesk for text, JetBrains Mono only for code. Both are embedded.
  - The step chip is at the top left (600, 30 px). The tool label "Terminal as Codex" plus `SPECWEAVE_TOOL=codex` is at the top right (600, 28 px, ink).
  - No music, no AI imagery.

### 6. Finish and publish

```sh
cd "$REPO"
S=docs-site/static/video/tutorials
sh video/tutorials/<slug>/scripts/finish.sh "$DEMO/build/render.mp4" $S/<slug>.mp4 $S/<slug>.jpg 1.0
cp "$DEMO/build/<slug>.en.vtt" "$DEMO/build/<slug>.chapters.vtt" $S/
```

`finish.sh` does the following:

1. Runs two-pass linear `loudnorm` to `I=-16`, `TP=-2.0`, `LRA=8`. With a -1.5 target, linear mode landed at -1.3 dBTP; with -2.0 it measures about -1.8.
2. Encodes AAC at 192k, 48 kHz stereo. This measured 183 kbps.
3. Copies the H.264 video and adds faststart.
4. Takes the poster at 1.0 s.
5. Prints the ebur128 summary.

Then add the `tutorials.json` entry (schema v2, see `docs-site/src/data/tutorials.ts`):

- `prerequisites`: GuideBody joins them with "; ", so every item after the first starts lowercase, and none ends with a full stop.
- `video`:
  - `durationSeconds` from `ffprobe` (to 0.1 s);
  - `chapters` equal to the beat starts in `$DEMO/build/timeline.json`;
  - `captionsBurnedIn: true`, `audio: "narrated"`, `uploadDate` as the recording day;
  - `publishedAt: null` until the first deploy. The JSON-LD VideoObject appears once it is set.
- `steps`: full sentences with the exact commands.
- `note`: say that the output is real and from a disposable home, that agent sessions are not shown and how the tool ids are set, and which inputs are samples. Say who made each change shown (or not shown). Name the AI voice ("ElevenLabs, the author's cloned voice").

```sh
cd docs-site && node scripts/verify-tutorials.mjs && npm run build
```

### 7. Verify (record the numbers in your report)

```sh
V=docs-site/static/video/tutorials/<slug>.mp4
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate,bit_rate,sample_rate,channels -of compact $V
ffmpeg -hide_banner -nostats -i $V -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary/,$p'
ffmpeg -hide_banner -nostats -i $V -af silencedetect=n=-40dB:d=0.6 -f null - 2>&1 | grep -E 'silence_(start|end)'
```

| Check | Target | Tutorial 1 after review |
|---|---|---|
| Format | 1920x1080, 30 fps, H.264 + AAC 48 kHz stereo | 1920x1080, 30 fps, 769 kbps video, 183 kbps AAC |
| Size | about 10 MB or less for 90 s | 9.4 MB for 78.3 s |
| Loudness | -16 ±0.5 LUFS, true peak at most -1.5 dBTP, LRA at most 8 | -16.0 LUFS, -1.8 dBTP, LRA 3.4 |
| Pauses | none over 0.6 s between beats (the first second and the end card do not count) | one, 0.64 s before the outro |
| Captions | every cue start within 0.1 s of a speech onset where there is a pause | max 0.06 s |
| Captions | at most 2 lines of 42 characters, 1–6 s | all |
| Privacy | no real names, emails, hosts, `/Users/<name>`, tokens | clean (frames and files) |

- **Caption onset check.** `python3 -I video/tutorials/<slug>/scripts/check-timing.py $V docs-site/static/video/tutorials/<slug>.en.vtt` compares each cue start with the nearest speech onset and lists pauses over 0.6 s. A cue in the middle of continuous speech has no onset to compare against, and the script marks it.
- **Stills.** Pull 1 fps stills and contact sheets: `ffmpeg -i $V -vf fps=1 f%03d.jpg` and `-vf "fps=1,scale=480:-1,tile=6x3"`. Read every highlight beat at 1/4 size, because embeds and phones show it that small.
- **Privacy scan.** `grep -rnI -E "/Users/[^S/][^/]*|<login>|gmail|sk_[A-Za-z0-9]{8}" video/tutorials/<slug> docs-site/static/video/tutorials/<slug>.*` must print nothing except the guard line in `capture.mjs`.
- **Page check.** Run `npx docusaurus serve --port <p> --no-open` in the background and keep its PID. Then a headless Playwright script (`chromium.launch({ headless: true })`, `PWDEBUG=0`) confirms:
  - `/tutorials/` links the guide;
  - `/tutorials/<slug>/` has the H1;
  - the video plays (`currentTime` advances) at the right duration;
  - the poster is set;
  - the prerequisites read as one sentence.

  Stop the server with `kill <pid>` and confirm the port is free with `lsof -t -iTCP:<p> -sTCP:LISTEN`.

## Lessons from the tutorial 1 review

Each of these failed review once. The build or this recipe now prevents them.

1. **Two commands disagreed on a number.** `handoff.md` said `ACs 0/2` while `pickup` said `ACs 1/2 met`. When two commands print the same quantity, check they agree. If they don't, fix the CLI before capturing. The fix here: `work-handoff.ts` now uses `deriveAcStatus`.
2. **Dead air.** A beat tail of 1.0 s plus extras made pauses of 2–3 s and a static screen for 6 s. Now `tailAfterVo` is 0.1 and `voOffset` 0.05, giving about 0.6 s of silence between beats. Type each command on the word that introduces it.
3. **Unreadable at embed size.** 22 px mono at 118 columns rendered at 4–9 px in a phone player. Use 28 px, 90 columns, and a card that grows with its content.
4. **The VO named something the screen hid.** "Which tasks are done" played over an elided table. Show what the VO names, or change the VO.
5. **An overlay covered the command being narrated.** Keep the diff at 2.5 s or less on its own caption chunk, then type the command.
6. **A caption burned into the poster.** Start the intro VO at 1.1 s and take the poster at 1.0 s.
7. **Scripted timing gave itself away.** Timestamps 183 ms apart. Put a real pause in the capture where time passes in the story.
8. **A count changed with no explanation.** Elide lines the VO does not explain.
9. **Lines broke mid-word, and half rows showed at the top.** Fixed in the build: word wrap, a clip box, whole-row scroll.
10. **Raw output looked broken.** Code fences and double spaces: elide the fences; fix CLI cosmetics in `src`.
11. **Captions ran too long on one line, or split "Claude / Code".** Fixed by balanced two-line breaks with a 42-character limit.
12. **Some cues came in 0.2–0.3 s late.** Fixed by the pause snap.
13. **The highlight style didn't match the spec.** The left bar from SERIES.md is now used, with a light tint.
14. **The tool label was too small to read.** It is now 28 px ink, and the chip says "As Codex: …".
