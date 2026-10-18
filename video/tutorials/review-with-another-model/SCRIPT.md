# Review with the other model before you ship

CLI tutorial (slug `review-with-another-model`), 1920x1080, SpecWeave 3.1.0, codex-cli 0.162.1. Published as `docs-site/static/video/tutorials/review-with-another-model.{mp4,jpg,en.vtt,chapters.vtt}`; its `tutorials.json` entry is prepared separately (`publishedAt: null`). The recipe is `../CLI-PIPELINE.md`; this file records what is specific to this episode.

## How it was made

1. `node scripts/capture.mjs /Users/Shared/specwithcode-demo/tut05-review-with-another-model <specweave repo> captures/session.json` builds `greet-app` in a disposable HOME (`<demo>/final/home`) under `env -i`, `SPECWEAVE_HOST=demo`, `SPECWEAVE_TOOL=claude`. Off camera: the SERIES.md seed, `specweave init . --quick`, the one-task increment from `captures/spec.md` committed on `main`, then a branch `personal-greeting` where T-01 is claimed, changed (`name ?? "world"`, a test for "Ada" only), proved with `task done --run "npm test"` and committed. The merge-base with `main` is the review base.
2. **The reviewer is real.** `specweave review` runs its built-in Codex command unchanged (`codex exec -m gpt-6.1-sol -c model_reasoning_effort="high" -s read-only --skip-git-repo-check -o {out} -`). Each review took about 30 s (`session.reviewSeconds`: 29 and 32); the video holds the verdict back until the VO says how long it took (the CLI prints the two header lines before it starts the reviewer, review.ts:101-106, and the verdict after).
3. **Privacy gate, open.** In the take used here (2026-10-18 08:47 UTC) `<home>/.codex/auth.json` was a symlink to the owner's own Codex login. Codex read nothing else from the real home, nothing of it was printed, and the link was removed (checked: gone). This still needs the owner's OK before the video is committed or deployed. `capture.mjs` now refuses to run without `CODEX_DEMO_AUTH` (a dedicated demo sign-in) and never falls back to `~/.codex`; a re-take with a demo sign-in replaces shots 0-4.
4. Between the two reviews the fix (`trimmed = typeof name === "string" ? name.trim() : ""`) and a blank-name test are written off camera and committed as claude (`0001: fall back on a blank name`).
5. `node scripts/capture-extra.mjs <demo> captures/session.json` (after review, no reviewer, no sign-in; it refuses if an auth.json is present) adds shots 5-7 against the home capture.mjs left: `specweave review --brief` in a temporary detached worktree at the first review's head `4cb830c` (removed afterwards), `git show` of the fix commit, and the verdict line of the overwritten report.
6. Voice: `tts.mjs` with voice `0Ki1af67ybTaTu4TNmO8`, `eleven_v4`, unchanged settings, key loaded inside the command only. After review only 02, 03, 05 and 07 were re-voiced; the first takes are in `<demo>/out/v1/vo`.

Episode changes to the shared build (`build-composition.mjs`):
- terminal rows insert a zero-width non-joiner between operator characters, because the renderer ignores `font-feature-settings` and drew `===` and `=>` as JetBrains Mono ligatures; nothing visible is added;
- `holdFrom {line, at}` prints the rest of a command's output later (the review's verdict after the wait);
- `trim [{line, pattern, with}]` shortens part of a line with a dimmed `…` (the absolute demo path in both verdict lines, CLI finding 3);
- `diff [[a,b]]` colours the +/- rows of diff hunks as git does in a terminal.

Audio exceptions: as tutorial 1 (`mp3_44100_128` source; higher formats need a higher plan; the key cannot read the plan). Length 93.0 s, slightly over the 75-90 s aim, because the brief, the test diff and the overwrite note were added.

## Beats

### 01-intro · 0.0 s · What you will do
VO: Review with the other model before you ship.

### 02-review · 4.3 s · What a reviewer gets
Step chip: What a reviewer gets: `specweave review --brief`
VO: Claude Code finished this task on a branch. `specweave review --brief` shows what a reviewer gets: who wrote the code, from the ledger, the acceptance criteria, and the diff since the branch began.
- `--brief` prints the brief and runs nothing: review.ts:7,75-79.
- "Written by" from the ledger's done events: brief.ts:41-55,133-136,148.
- ACs: brief.ts:157. Diff of the task files since the merge-base: brief.ts:63-74,179.
- Shown lines 9, 16-19, 44-48 of shot 5; the instructions, Approach, tasks, diff stat (CLI finding 4), the test hunk and the answer template are elided.

### 03-verdict · 17.9 s · Codex reviews: fix first, exit 3
Step chip: Before you ship: `specweave review`
VO: Before you ship, run `specweave review`. Claude wrote the code, so it picks Codex, from another family. Codex gets the brief in a read-only sandbox. This run took about 30 seconds. Its verdict is fix first, so the command exits 3.
- First installed reviewer of another family, Codex first: reviewer.ts:68-88; printed line review.ts:101.
- Brief sent to the reviewer: review.ts:106. `-s read-only`: reviewer.ts:25.
- 30 seconds: `reviewSeconds[0]` = 29.
- Exit 3 for fix first: review.ts:134; the printed `exit 3` is the shell's `$?`. Verdict line review.ts:138, path trimmed on screen.

### 04-report · 34.3 s · What reports/review-codex.md says
Step chip: Read `reports/review-codex.md`
VO: The review is saved in `reports/review-codex.md`. Each finding cites a file and line, and how to fix it. Here, a blank name gets no fallback, which breaks `AC-02`.
- Report path and write: review.ts:97-98,124. Finding shape `path:line` with a fix: brief.ts:143-144,188-190; the real finding is `src/greeting.js:2` with "Fix: trim the name…".
- The header comment line (reviewer, family, author, base, head, time: review.ts:123) is elided as the first `…` row.

### 05-fix · 47.3 s · Fix the finding
Step chip: Fix the finding, run the tests
VO: Claude's fix trims the name, and falls back to world when it's empty. It also adds a test for blank names. Run the tests: all three pass.
- `git show` of the fix commit (shot 6, lines 8-10 and 20-24) is on screen from about 48.6 s to the next beat (about 9 s), with no motion; `npm test` (shot 2: 3 tests, 3 pass).
- The fix and the test were scripted off camera (end card and entry note say so).

### 06-again · 57.5 s · Review again: ship, exit 0
Step chip: Review again: `specweave review`
VO: Then run `specweave review` again, on the fixed code. No critical or high finding is left, so the verdict is ship, and the exit code is 0.
- Verdict rule given to the reviewer: brief.ts:195-196; parsed by reviewer.ts:191-195; exit 0 on ship: review.ts:134. Verdict printed on "No".

### 07-ledger · 67.3 s · Each verdict in the ledger
Step chip: Each verdict in `ledger.jsonl`
VO: Each run adds a note to the ledger, with the reviewer and its verdict. Both notes name the same file, and the second run overwrote it: the fix-first report is gone, so keep a copy if you need it. `specweave pickup` shows the latest notes to whoever comes next.
- Note event: review.ts:126-132. Same file every run: review.ts:98 (CLI finding 1). Shot 7 shows the report now says `Verdict: ship`.
- Pickup shows the latest notes: src/cli/commands/pickup.ts:12-13.

### 08-outro · 83.9 s · Next: verify and complete
VO: Next, run `specweave verify`, then close the increment with `specweave complete`.
- The CLI's own advice after fix first: review.ts:139.
- End card: agent sessions not shown; Claude Code's change, fix and test scripted off camera and committed under the claude tool id; every command and output real; real Codex CLI; AI voice.

## On-camera commands (real output in captures/session.json)

- 02-review: `specweave review --brief` (shot 5)
- 03-verdict: `specweave review; echo "exit $?"` (shot 0, exit 3)
- 04-report: `cat .specweave/increments/0001-personal-greeting/reports/review-codex.md` (shot 1)
- 05-fix: `git --no-pager show --format=%s HEAD -- src test` (shot 6), `npm test 2>&1 | grep -E '^# (tests|pass|fail)'` (shot 2, run on the same code before the commit)
- 06-again: `specweave review; echo "exit $?"` (shot 3, exit 0)
- 07-ledger: `grep '"e":"note"' …/ledger.jsonl | jq -r .note` (shot 4), `grep -m1 '^Verdict' …/reports/review-codex.md` (shot 7)

## Findings in the CLI (not fixed here)

- The second `specweave review` overwrites `reports/review-codex.md`, so the fix-first report is lost, while the first ledger note still points at that path (`review by codex (openai): fix first · reports/review-codex.md`). review.ts:98,124 always write `review-<reviewer>.md`.
- `specweave init . --quick` printed `Using codex...` under `SPECWEAVE_TOOL=claude`, apparently because `~/.codex` exists in the home. Off camera only.
- The verdict line prints the absolute report path (review.ts:138), which wraps to two rows; a project-relative path would read better.
- `brief.ts:128` trims the `git diff --stat` output, so the first stat row loses its leading space and no longer lines up with the others (shot 5, lines 32-33). Off camera (elided).
