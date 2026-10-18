# Claim, prove, verify and complete a task

CLI tutorial 3 (slug `claim-prove-verify-complete`), 1920x1080, SpecWeave 3.1.0, 90.2 s. Published as `docs-site/static/video/tutorials/claim-prove-verify-complete.{mp4,jpg,en.vtt,chapters.vtt}`; its `tutorials.json` entry is written separately (schema v2, `publishedAt: null`). The recipe, with every command, is in `../CLI-PIPELINE.md`; this file records what is specific to this episode. The demo folder is `/Users/Shared/specwithcode-demo/tut03-claim-prove-verify-complete`.

## How it was made

1. `node scripts/capture.mjs <demo> <specweave repo> captures/session.json` builds `greet-app` in a disposable HOME (`<demo>/final/home`) under `env -i`, with `SPECWEAVE_HOST=demo` and `SPECWEAVE_TOOL=claude`, and runs every command with this worktree's `bin/specweave.js` (the already compiled `dist/`). Off camera: the SERIES.md seed, `specweave init . --quick`, `specweave create-increment "Personal greeting"` and the one-task spec from `captures/spec.md`, committed. On camera: the commands below, output stored verbatim. After `task claim T-01` the capture sleeps 45 s (`EDIT_GAP_SECONDS`) while the change and its test are written and committed as `0001: greet by name`, so the claim time and the evidence time are honestly apart; it sleeps another 15 s (`READ_GAP_SECONDS`) before the first `specweave complete`. `shot()` takes the exit code the story needs: the blocked `complete` must exit 1, anything else stops the take.
2. Voice: `scripts/tts.mjs` (ElevenLabs `/with-timestamps`, voice `0Ki1af67ybTaTu4TNmO8`, `eleven_v4`, stability 0.5, similarity 0.75, speaker boost, speed 1.0), key loaded inside the same command as CLI-PIPELINE.md step 3 shows. 1,150 characters, 215 spoken words, one request per line. The intro, `02-claim`, `03-done` and `06-verify` chunks were re-split afterwards without a new request (the spoken text joins to the same string); the `03-done` and `06-verify` splits break up static stretches of just over 4 s found in review.
3. `node scripts/build-composition.mjs . <demo>/build`, then in `hyperframes/`: `npx hyperframes@0.8.145 check` (lint 0 errors; the layout pass flags only the intentional diff overlay at 20.6-22.5 s as `content_overlap`), then `render --quality delivery --fps 30`.
4. `scripts/finish.sh … 1.0`: -16.1 LUFS, -1.8 dBTP, LRA 4.1; poster is the intro card at 1.0 s.

Outro note: "Agent sessions are not shown. Each command ran in a terminal as Claude Code (SPECWEAVE_TOOL=claude), and every output is real. The change to src/greeting.js and its test were written off camera. The narration is an AI voice."

Look: unchanged from tutorial 1 (Weave tokens, Schibsted Grotesk and JetBrains Mono embedded, same intro and outro cards, terminal card and caption pill). No music.

Episode-only changes to a shared script, `build-composition.mjs` (without the new keys it behaves like the template's, apart from the hanging indent):

- Output lines that start with an indented bullet (`   • …`) hang their wrapped rows under the bullet text, so the tail of the blocked `complete` error (`pass --reason …`) no longer starts at column 0 and reads like a separate command.
- A screen item may list `firstRowOnly: [line, …]`: only the first visual row of those output lines is shown. Used once, for the task row of `verify.md`, whose 95 characters wrapped at 90 columns and left the empty Note cell `|  |` alone on a row. The first row ends with the CLI's own `…`.
- An optional `cueNudge` in `edit.json` (`{beat: {cue: seconds}}`). It is used once, `06-verify` cue 1 at -0.1 s: in the WAV that cue snaps to a pause ending at 4.88 s, but after loudnorm the speech onset reads 0.11 s earlier in the published file. With the nudge the worst cue-to-onset gap is 0.07 s.

Audio exceptions (same as tutorial 1): the VO source is ElevenLabs `mp3_44100_128`; `mp3_44100_192` and `pcm_44100` need a higher plan, and the key cannot read the plan (`user_read` is not granted). Delivery AAC is `-b:a 192k` (measured 183 kbps).

## Story order

The brief listed verify before the blocked complete. A `complete` can only be blocked after a passing verify if verify fails, which a one-task spec whose task is done cannot do honestly. So the blocked `complete` comes first (no `reports/verify.json` yet), then `specweave verify` and its report, then the passing `complete`. That shows the gate itself: `complete` reads what `verify` wrote.

## Beats

### 01-intro · 0.0 s · What you will do

VO: Claim, prove, verify and complete a task / with the SpecWeave CLI.

### 02-claim · 7.2 s · specweave task claim
Step chip: Claim: `specweave task claim T-01`

VO: Start with `specweave task claim T-01`. The claim goes into the ledger as `claude@demo`, so others see who owns the task. It prints the acceptance criteria, the files and the test.

- Claim appends a `claim` line to `ledger.jsonl` and prints `Claimed T-01 as <agent>` plus the task: W:src/cli/commands/task.ts:179-187, `describeTask` 323-331.
- Agent id `<tool>@<host>` from `SPECWEAVE_TOOL` / `SPECWEAVE_HOST`: W:src/core/tasks/ledger.ts:101-104.
- "Others see who owns it": a task claimed by someone else is refused with `refused: T-01 is claimed by …`: task.ts:110-111, 174, 276-278.

### 03-done · 20.4 s · task done --run
Step chip: Prove it: `task done --run "npm test"`

VO: With the change committed, `task done --run` runs the test again. Only a zero exit marks the task done, with the output as evidence.

- Runs the command; on a non-zero exit it exits 5 and appends no `done` line (the run log `reports/task-<id>.txt` is still written first, task.ts:201-206), evidence on exit 0: task.ts:199-209, 232; `EXIT_RUN_FAILED = 5` at 64.
- The diff overlay (2.0 s) is the real `git diff src/greeting.js` of the off-camera change. Its head reads "Written off camera: the change for `T-01` in `src/greeting.js`", and the outro note says the change and its test were written off camera.

### 04-evidence · 31.2 s · The evidence file
Step chip: Evidence: `reports/task-T-01.txt`

VO: The full output is saved in `reports/task-T-01.txt`: the command, its exit code and the time, then the test results.

- `writeRunLog`: `reports/task-<id>.txt` with `$ <cmd>`, `# exit <code> — <ISO time>`, then the full output: task.ts:285-290.

### 05-blocked · 41.7 s · complete is blocked
Step chip: Close too early: `specweave complete`

VO: Now try to close the increment with `specweave complete`. It refuses: `reports/verify.json` is missing, so it tells you to run `specweave verify` first.

- The only hard gate is `reports/verify.json` with `ok: true`; when missing the error is `reports/verify.json missing — run specweave verify … first`: W:src/core/tasks/closure-gate.ts:37-42; printed as "failed quality gates" by W:src/core/increment/status-commands.ts:339-348; exit 1 from W:src/cli/commands/complete.ts:112-115.

### 06-verify · 53.6 s · specweave verify
Step chip: Check: `specweave verify`

VO: `specweave verify` runs the project's test, lint and build scripts, here only `npm run test`. Both acceptance criteria are met, because the task that covers them is done.

- Commands: `testing.commands` from config, else package.json `test`, `lint`, `build` scripts as `npm run <s>`; the demo config has `"commands": []` and the seed has only `test`: W:src/core/tasks/verify-runner.ts:95-114.
- An AC is met when ticked, or when every covering task is done or skipped with at least one done: verify-runner.ts:73-80, used at 156.
- Output lines: W:src/cli/commands/verify.ts:36-54.

### 07-report · 66.1 s · The verify report
Step chip: Read `reports/verify.md`

VO: Its report, `verify.md`, keeps the test output, the criteria table, and the task with its evidence. `verify.json` beside it is what `complete` reads.

- `renderVerifyMd`: commands with their output tail, AC table (`x (tasks)` when met through the ledger), ledger task table: verify-runner.ts:189-231; both files written at 179-184.
- `complete` reads `verify.json`: closure-gate.ts:37 (`readVerifyReport`, verify-runner.ts:234-242). On the cue "`verify.json` beside it …" the screen types `ls …/reports` and highlights `verify.json`, so the file the VO names is on screen.
- The task row is shown up to the CLI's own `…` (`firstRowOnly`); its empty Note cell is left out.

### 08-complete · 78.5 s · complete passes
Step chip: Close: `specweave complete`

VO: Run `specweave complete` again. The verify check passes, and the increment is completed.

- Passing gate is printed under "Checks" as `verify ok (…; ACs 2/2)`: closure-gate.ts:61-62, status-commands.ts:354-357; status set to completed at 396. `jq -r .status metadata.json` prints `completed`.

### 09-outro · 84.4 s · Next: hand off

VO: Next, hand the work to another agent with `specweave handoff`. (The next step in the "Run work across agents" path is `handoff-claude-to-codex`.)

## On-camera commands (real output in captures/session.json)

All as `claude` (`SPECWEAVE_TOOL=claude`):

- 02-claim: `specweave task claim T-01`
- 03-done: `specweave task done T-01 --run "npm test"`
- 04-evidence: `cat .specweave/increments/0001-personal-greeting/reports/task-T-01.txt`
- 05-blocked: `specweave complete 0001` (exit 1)
- 06-verify: `specweave verify`
- 07-report: `cat .specweave/increments/0001-personal-greeting/reports/verify.md`, then `ls .specweave/increments/0001-personal-greeting/reports`
- 08-complete: `specweave complete 0001`, then `jq -r .status .specweave/increments/0001-personal-greeting/metadata.json`

Elided on screen (the VO does not explain them): the green `✅ Completing increment …` line the blocked `complete` prints before its error (CLI finding below), the empty Note cell of the `verify.md` task row, the review and coverage warnings in both `complete` runs, the duplicated `[completeIncrement] …` stderr line, `Transitioning: active → ready_for_review`, the `PASS → <absolute path>` line of `verify`, most TAP lines.

## CLI findings (not fixed here, reported)

- `specweave verify` prints `PASS → /Users/Shared/…/greet-app/.specweave/increments/0001-personal-greeting/reports/verify.md`, an absolute path (verify.ts:53 prints `result.mdPath`), while `task done` prints repo-relative paths (`rel()`, task.ts:293). Elided in the video.
- `specweave complete` prints `✅ Completing increment …` before it knows the result, so the blocked run shows a green check above `❌ … failed quality gates` (status-commands.ts:309).
- The blocked run repeats the error on stderr as `[completeIncrement] … failed quality gates: …` right after printing it (status-commands.ts:347), so the same sentence appears twice in a terminal.
- Every `complete` warns `Test coverage below target (0.0% < 80%) … Coverage data not found` on a fresh project: `create-increment` writes `coverageTarget: 80` into metadata.json although the repo has no coverage tooling (completion-validator.ts:225-260).
- `Transitioning: active → ready_for_review` is still logged on a successful close (status-commands.ts:372) although `completeIncrement` suppresses intermediate transition notices (289-300).
