# Tutorial pipeline

How episode 1 (`claude-code/`) was made, as steps to repeat for the other five. SERIES.md holds the series rules; this file records what the pipeline actually is on SpecWithCode 0.2.6 and where it differs from SERIES.md.

The scripts are in `claude-code/scripts/`. They take the episode folder or demo folder as an argument, so later episodes can call them from there or copy them.

## Layout

- **Repo** (`video/tutorials/<agent>/`):
  - `SCRIPT.md`, `SHOTLIST.json` (executable steps) and `edit.json` (cuts, speed ramps, highlights, caption chunks).
  - `vo-words/` (Whisper word timings), `scripts/` and `hyperframes/` (the composition; `index.html` is generated).
- **Outside the repo** (`/Users/Shared/specwithcode-demo/ep0N-<agent>/`), with everything big or private:
  - Rehearsal: `home/`, `studio/`, `shim/`, `secret/` (mode 700).
  - Final take: `final/` with the same folders plus `out/` (take.webm, cues.json, stills).
  - Media and builds: `vo/` (raw and trimmed VO), `media/` (take.mp4 plus VO WAVs; `hyperframes/assets/media` symlinks here) and `build/` (render, VTTs, stills).
- **Published** (`docs-site/static/video/tutorials/`): `<agent>.mp4`, `<agent>.jpg`, `<agent>.en.vtt`, `<agent>.chapters.vtt` (the page reads chapters from `tutorials.json`; the VTT is for other players). Then the entry in `docs-site/src/data/tutorials.json`.

## Steps

1. **Demo folder.**
   - Make `home/greet-app` from the SERIES.md seed: `git init`, the "Initial greet-app" commit, `specweave init . --quick`, then the "Add SpecWeave" commit with `Demo User` and a demo address.
   - `shim/scutil` answers `--get ComputerName|LocalHostName|HostName` with "Demo Mac" / `demo-mac` and passes everything else to `/usr/sbin/scutil`.
   - `home/.zprofile` prepends the shim directory to PATH. The agent's login shell otherwise puts the system scutil first, and the real host name comes back.
2. **Sign the agent in off camera** (see the sign-in section below).
3. **Start the server:** `scripts/serve.sh <demo> <tool> 8329`. It prints the PID; stop the server with `kill <pid>`.
   - It runs the release's `bin.mjs` under `env -i` with:
     - PATH set to the shim, node, the agent CLI and the system dirs;
     - `HOME=<demo>/home`, `TMPDIR`, `SPECWEAVE_HOST=demo`, `SPECWEAVE_TOOL=<tool>`, `STUDIO_ENABLE_HOSTED_SERVICES=false`;
     - `serve --base-dir <demo>/studio --host 127.0.0.1 --no-browser`, with the log written to `secret/server.log`.
4. **Pair:** `scripts/pair.sh <demo>` writes `secret/pair.json`, then `node scripts/pair-headless.mjs <demo>/secret/pair.json <demo>/secret/state.json`. Both files are mode 600, and the URL is never printed.
5. **Rehearse, then take.** Run `PWDEBUG=0 node scripts/record-app.mjs <SHOTLIST.json> <demo>/secret/state.json <demo>/out`.
   - The recording is headless, 1920x1080 at DPR 1, light scheme.
   - The cursor ring and click outlines are injected into the page.
   - A 300 ms black frame marks sync.
   - A failed `expect` stops the take and saves `stills/failed.png`.
   - Rehearse against `home/`, then reseed into `final/` and take once. The first ledger line must read `<tool>@demo`.
6. **Footage:**
   - Convert with `ffmpeg -i take.webm -r 30 -c:v libx264 -crf 14 -pix_fmt yuv420p media/take.mp4`.
   - Find the sync frame with `ffmpeg -i media/take.mp4 -vf blackdetect=d=0.2:pix_th=0.1 -f null -`, then set `edit.json.syncOffset` to the black start minus the `black-on` cue.
7. **VO:**
   - `scripts/vo-lines.json` holds each line in two forms: `text` (the captions) and `spoken` (the TTS input).
   - Run `XI_API_KEY=… node scripts/vo.mjs scripts/vo-lines.json <demo>/vo`, with the key loaded inside the same command.
   - Each line is generated once. Delete a raw file to redo that line only. Episode 1's eight lines are about 900 characters per pass.
   - Output is 48 kHz mono 24-bit WAV, trimmed to 0.15 s head and 0.3 s tail. Copy the WAVs into `media/`.
8. **Word timings:**
   - Run `mlx_whisper <wav> --model mlx-community/whisper-large-v3-turbo --word-timestamps True --output-format json` per line.
   - Keep only `segments[].words` in `vo-words/<id>.json`.
   - Whisper hears "Claude" as "Cloud". The caption aligner uses LCS, so misheard words do not shift cues.
9. **Edit:** write `edit.json`.
   - Per beat: `dur` (at least the VO length plus `voOffset` and about 0.3 s), `segments` `[srcStart, srcEnd, rate]` from `cues.json`, optional `highlights` boxes and `lift` for captions that would cover the composer.
   - Caption chunks: one or two lines, at most about 70 characters, with code in backticks.
   - Segment lengths divided by their rates must add up to `dur`.
10. **Build:** run `node scripts/build-composition.mjs <episodeDir> <episodeDir>/vo-words <demo>/build/<agent>`. It writes `hyperframes/index.html` and both VTT files.
    - Caption cues snap to spoken words, with no gaps, each 1–6 s and inside its beat.
    - A "Sped up N×" chip appears when the rate is above 1.05.
    - The step chip comes from SHOTLIST `stepChip`.
11. **Check and render.** In `hyperframes/`, run `npx hyperframes check` (0 errors; the nesting and density warnings are expected), then `npx hyperframes render --quality delivery --fps 30 -o <demo>/build/render.mp4`.
12. **Finish:** `scripts/finish.sh <demo>/build/render.mp4 docs-site/static/video/tutorials/<agent>.mp4 docs-site/static/video/tutorials/<agent>.jpg 2`.
    - Two-pass linear loudnorm to -16 LUFS / -1.5 dBTP, AAC 192k 48 kHz stereo, video copied, poster at 2 s.
    - It prints the ebur128 summary; check I = -16 ±0.5 and true peak ≤ -1.
13. **Verify:**
    - Extract stills at each beat and inspect them: no real names, emails, hosts, `/Users/<you>` paths, pairing links, tokens or account pickers; the app name reads SpecWithCode; captions match the VO.
    - Publish the `tutorials.json` entry: `published`, `durationSeconds` from ffprobe, `audio: "narrated"`, chapters equal to beat starts, no `captionsOn` (captions are burned in), and a `note` disclosing the AI voice.
    - Run `cd docs-site && npm run build`, then a headless check that `/tutorials` lists the episode and the video plays.
14. **Teardown:**
    - Stop the server by PID.
    - Delete `secret/pair.json`, `secret/state.json`, `secret/server.log` (it holds the pairing details) and the demo HOME's copied credentials.
    - Keep `out/take.webm` and `cues.json`.

## What differed from SERIES.md on 0.2.6

1. **Server command.** The installed `specweave-studio` launcher re-sets HOME, STUDIO_HOME and the port to the real instance, so `env -i … specweave-studio serve` would not stay disposable. `serve.sh` runs the release's `bin.mjs` directly.
2. **Host label.** The scutil shim in the server's PATH was not enough, because the agent's login shell re-reads PATH. `home/.zprofile` fixes that. With it, the computer reads "Demo Mac" and no blur is needed.
3. **Claude card.** On 0.2.6 the card is "Claude", not "Claude Code". A signed-out card showed "Needs attention", not a Sign in button, so there is no Sign in insert. The VO says to run `claude auth login` in a terminal first.
4. **Add project.** Adding the folder opens a new chat directly, with no New chat click. The model picker is labelled with the current model ("Claude Opus 5.5" by default). Runtime mode defaults to Supervised.
5. **Skill menu.** `$` lists the skills title-cased ("Sw Increment", "Sw Do"), each tagged "Project Skill". There is no "Searching workspace skills…" state worth checking. Match "Sw Do" exactly, because "Sw Done" also contains it.
6. **New-chat placeholder** is "Ask for changes, send follow-ups, or attach images". The follow-up composer uses the "Ask anything, @tag…" placeholder.
7. **Open diff.** The diff includes `ledger.jsonl` (one SERIES.md gap closed). Expand files with the "Expand <path>" buttons; clicking a file name opens the file.
8. **"Do T-01, then stop."** Claude stopped after `task done`.
9. **`SPECWEAVE_HOST`/`SPECWEAVE_TOOL` reach the agent's shell.** The ledger reads `claude@demo`.
10. **Pairing survives `storageState`.** No in-recording pairing was needed.
11. **Captions:**
    - The ffmpeg here has no libass/drawtext, so captions are burned in by the HyperFrames composition.
    - The `.en.vtt` ships too, for search and transcripts. Set `captionsBurnedIn: true` on the entry so the player offers no captions track; turning one on would show a second set over the burned-in captions.
    - `captionsOn` stays unset.
12. **Zoom holds** from DPR-2 stills were not used. Highlight boxes on the 1080p footage read well enough.
13. **Music:** none. No licensed track is in the repo, so the video is voice only.

## Signing each agent in inside a disposable HOME

Never sign in on camera, and never run a status command that prints the account on camera.

| Agent | Sign-in on 0.2.6 |
|---|---|
| Claude Code | Verified. On this Mac the login lives in the Keychain, which a disposable HOME cannot reach, and `claude auth login` would need a browser. Instead, write `<demo>/home/.claude/.credentials.json` (mode 600) holding only the current access token, with `refreshToken: null` and the real expiry. Do it in a command that never prints the token. It lasts until that token expires (hours), so take soon after. Delete the file at teardown. |
| Codex | Verified (episode 2). `codex/scripts/codex-auth.sh` copies `~/.codex/auth.json` into `<demo>/home/.codex/` (mode 600, refresh token blanked) right before the take clicks "Use existing CLI". Copied earlier, the server signs in on its own and shows a masked "Signed in as" row. "Continue with ChatGPT" is only hovered. Delete the copy at teardown. |
| OpenCode | Verified (episode 4). 0.2.6 rates OpenCode 1.x as limited, so install OpenCode 2 into the demo tools folder (`opencode/scripts/install-opencode2.sh`). OpenCode 2 keeps logins in `opencode.db`; move them with `opencode auth export --standalone` piped into `HOME=<demo>/home opencode auth import --standalone`, printing nothing. Delete `auth.json` and `opencode.db*` at teardown. |
| Grok | Verified (episode 5). `grok/scripts/grok-signin.sh` refreshes the real login with `grok models`, then writes a sanitized `<demo>/home/.grok/auth.json` (access key only, no refresh token, demo name and email). Then run `grok --trust` inside `greet-app`. Delete it at teardown. |
| Cursor | Blocked. 0.2.6 runs Cursor through `@cursor/sdk`, which accepts only a Cursor user API key: `CURSOR_API_KEY` in the server environment, or an in-app browser sign-in that stores a key in the server's own `<base-dir>/secrets` (not HOME). The Cursor CLI login is not used. |
| Antigravity | Blocked. 0.2.6 runs `agy_acp_server` with a private `GEMINI_HOME`; its Google login is written only by the in-app Sign in (browser OAuth to a 127.0.0.1 callback) into `<base-dir>/userdata/providers/antigravity/<hash>/antigravity-acp/acp_token.json`. Sign in once off camera on the demo `--base-dir`, then record. |

For agents whose credentials sit in the macOS Keychain, use the Claude approach: copy only short-lived tokens into the demo HOME, never refresh tokens, and delete them at teardown.

## Per-episode checklist

1. Copy `claude-code/SHOTLIST.json` and `edit.json` as a template, and change beat 03 for the agent's card and sign-in. Rehearse until every `expect` passes.
2. Episodes 3–6 finish the welcome wizard before the take (SERIES.md step 7). Their SHOTLIST then starts at Add project.
3. Write `scripts/vo-lines.json` with the episode's lines. Reuse beats 01, 02 and 04–08 with only the agent name changed.
4. Run steps 3–14 above. Budget about 900 ElevenLabs characters per pass and a few minutes of real agent turns per take.
