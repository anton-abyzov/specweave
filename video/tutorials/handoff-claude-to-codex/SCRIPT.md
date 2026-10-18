# Hand off from Claude Code to Codex at a usage limit

CLI tutorial 1 (slug `handoff-claude-to-codex`), 1920x1080, SpecWeave 3.1.0. Published as `docs-site/static/video/tutorials/handoff-claude-to-codex.{mp4,jpg,en.vtt,chapters.vtt}` with its entry in `docs-site/src/data/tutorials.json`. The exact recipe, with every command, is in `../CLI-PIPELINE.md`; this file records what is specific to this episode.

## How it was made

1. `node scripts/capture.mjs /Users/Shared/specwithcode-demo/tut01-handoff <specweave repo> captures/session.json` builds `greet-app` in a disposable HOME (`<demo>/final/home`) under `env -i`, with `SPECWEAVE_HOST=demo` and `SPECWEAVE_TOOL=claude` or `codex`, and runs every command with this worktree's `bin/specweave.js` (compile `src` with `npx tsc` first). Off camera: the SERIES.md seed, `specweave init . --quick`, the two-task increment from `captures/spec.md`, `specweave auto-handoff on --mode suggest`, T-01 claimed, done and proved, T-02 claimed and a new test left uncommitted (Claude wrote that test before the handoff). On camera: the commands listed below, output stored verbatim in `captures/session.json`. The capture waits 75 s between `specweave handoff` and `specweave pickup` (`PICKUP_GAP_SECONDS`), so the timestamps and "1m ago" are real. Between `task claim T-02` and `task done` the T-02 fix is written off camera; the video shows its real diff.
2. The 95% reading is a sample: `~/claude-status.json` holds Claude Code's status line input (`rate_limits.five_hour.used_percentage: 95`, resets in 130 min) and `~/stop-hook.json` the Stop hook input. `specweave statusline` and `specweave usage-guard` read them; their output is real. No Claude Code or Codex session ran.
3. `XI_API_KEY=… node scripts/tts.mjs scripts/vo-lines.json <demo>/vo vo-timing`: ElevenLabs `/with-timestamps`, voice `0Ki1af67ybTaTu4TNmO8`, `eleven_v4`, stability 0.5, similarity 0.75, speaker boost, speed 1.0. Each caption chunk's times and each spoken word's times come from the character timestamps. Re-splitting caption chunks needs no new request as long as the spoken text joins to the same string. WAVs are copied to `<demo>/media`, which `hyperframes/assets/media` links to.
4. `node scripts/build-composition.mjs . <demo>/build` writes `hyperframes/index.html` and both VTT files from `edit.json`, the capture and the timings. Every on-screen event is anchored to a spoken word; caption cues snap to the pause before them.
5. In `hyperframes/`: `npx hyperframes@0.8.145 check` (lint: 0 errors; the layout pass flags only the intentional diff overlay as overlap), then `render --quality delivery --fps 30`.
6. `scripts/finish.sh <demo>/build/render.mp4 …/handoff-claude-to-codex.mp4 …/handoff-claude-to-codex.jpg 1.0`: two-pass loudnorm to -16 LUFS with a -2.0 dBTP target (measured -16.0 LUFS, -1.8 dBTP); the poster is the intro card at 1.0 s, before the first caption.

Look: Weave tokens (canvas `#f8f7f9`, iris `#6d4fb5`, sunken `#efedf2`), Schibsted Grotesk for text and JetBrains Mono for commands, both embedded (OFL files beside them). No music.

Audio exceptions: the VO source is ElevenLabs `mp3_44100_128`; `mp3_44100_192` and `pcm_44100` need a higher plan than the account has, and the key cannot read the plan (`user_read` is not granted). The delivery AAC is encoded at `-b:a 192k`; the encoder lands near 165 kbps on this mono voice.

## Beats

### 01-intro · 0.0 s · What you will do

VO: Hand off from Claude Code to Codex at a usage limit.

### 02-limit · 5.4 s · The usage limit warning
Step chip: Claude Code at 95% of the 5-hour limit

VO: With `specweave auto-handoff on`, Claude Code sends its usage to SpecWeave. Here we pass in a sample reading of 95% of the 5-hour limit. The guard says a handoff is available, and work continues.

### 03-handoff · 19.2 s · specweave handoff --reason
Step chip: Hand off: `specweave handoff --reason`

VO: When you are ready, tell Claude to hand off. It runs `specweave handoff` with a reason, releases its claim on `T-02`, and writes `handoff.md`.

### 04-doc · 29.4 s · What handoff.md carries
Step chip: Read `handoff.md`

VO: `handoff.md` says who stopped and why, and which tasks are done. It lists the uncommitted files, with the full diff beside it, and the exact next step.

### 05-pickup · 40.5 s · specweave pickup in Codex
Step chip: As Codex: `specweave pickup`

VO: Now open Codex in the same repo and say "pick up". It runs `specweave pickup`, which reads the handoff and records the pickup in the ledger as `codex@demo`.

### 06-next · 51.6 s · The next task and its acceptance criteria
Step chip: Next task: `T-02` with `AC-02`

VO: Pickup names the next task, `T-02`, with its acceptance criterion, its files and its test. Codex claims it.

### 07-done · 60.2 s · task done --run
Step chip: Prove it: `task done --run "npm test"`

VO: With the change in place, `task done --run` runs the test again. Only a passing test marks the task done, and the ledger shows that Codex finished it.

### 08-outro · 71.9 s · Next: verify

VO: Next, `specweave verify` checks the increment before you close it.

## On-camera commands (real output in captures/session.json)

- 02-limit as `claude`: `specweave statusline < ~/claude-status.json`
- 02-limit as `claude`: `specweave usage-guard < ~/stop-hook.json | jq -r .systemMessage`
- 03-handoff as `claude`: `specweave handoff --reason "usage at 95% of the 5-hour limit"`
- 04-doc as `claude`: `cat .specweave/increments/0001-personal-greeting/handoff.md`
- 05-pickup as `codex`: `specweave pickup`
- 05-pickup as `codex`: `grep '"e":"pickup"' .specweave/increments/0001-personal-greeting/ledger.jsonl | jq -c '{e,by,note}'`
- 06-next as `codex`: `specweave task claim T-02`
- 07-done as `codex`: `specweave task done T-02 --run "npm test"`
- 07-done as `codex`: `tail -n 1 .specweave/increments/0001-personal-greeting/ledger.jsonl | jq -c '{t,e,by}'`

## Findings while recording (fixed in the CLI before the final take)

- handoff.md broke its own Done / Pending table: the T-01 evidence cell kept the newline after `npm test → exit 0`. `tableCell()` in `src/core/session/handoff-doc-format.ts` now flattens line breaks and pipes.
- handoff.md said `ACs 0/2` while `specweave pickup` said `ACs 1/2 met`. `work-handoff.ts` now counts ACs with `deriveAcStatus`, like pickup and verify.
- `specweave pickup` printed `Picking up handoff: 0001  Personal greeting` (two spaces) and the local checkpoint as two long absolute paths. It now prints one space and a `~/…` path with `(+ handoff.diff beside it)`.

## Still open in the CLI

- `specweave handoff` also saves a local checkpoint about 150 ms after its ledger event (07:58:42.975Z event, 07:58:43.127Z checkpoint), so `specweave pickup` reports that checkpoint as "newer than the last handoff". The video elides that line.
