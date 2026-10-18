# Install SpecWeave and plan your first increment

CLI tutorial 2 (slug `install-and-plan`), 1920x1080, SpecWeave 3.1.0, 96.7 s. Published as `docs-site/static/video/tutorials/install-and-plan.{mp4,jpg,en.vtt,chapters.vtt}`. The recipe is `../CLI-PIPELINE.md`; this file records what is specific to this episode. Demo folder: `/Users/Shared/specwithcode-demo/tut02-install-and-plan/`.

## How it was made

1. `node scripts/capture.mjs <demo> <specweave repo> captures/session.json` seeds `greet-app` (SERIES.md seed, committed) in a disposable HOME under `env -i`, `SPECWEAVE_HOST=demo`, `SPECWEAVE_TOOL=claude`. Unlike tutorial 1 there is no shim for `specweave`: `npm i -g specweave` on camera really installs 3.1.0 from the npm registry into `<home>/.npm-global` (`npm_config_prefix`), and every later `specweave` command runs that copy. PATH holds only that bin folder, links to node/npm/npx, the scutil shim and system folders, and the capture refuses to run if `specweave` is reachable before the install or if the installed version differs from the worktree's `package.json` (both 3.1.0). stderr is merged into stdout in the shell (`exec 2>&1`), so spinner lines keep terminal order.
2. Off camera: `spec.md` is replaced with `captures/spec.md` (the sample plan) between `create-increment` and `cat`. No agent session ran; the scaffold the CLI wrote is kept in `session.json` as `specTemplate`.
3. Voice, build, render, finish exactly as CLI-PIPELINE.md steps 3-6.

## Beats

### 01-intro · 0.0 s · What you will do
VO: Install SpecWeave and plan your first increment.

### 02-install · 4.84 s · Install the CLI
Chip: Install: `npm i -g specweave`
VO: Install the CLI from npm with `npm i -g specweave`. It needs Node 20.12 or later. `specweave --version` prints 3.1.0.
Sources: `package.json:88` (`"node": ">=20.12.0"`); version from the capture.

### 03-init · 18.67 s · specweave init
Chip: Set up the repo: `specweave init`
VO: In your repo, run `specweave init` with the Claude Code adapter. It writes CLAUDE.md and AGENTS.md, installs six SpecWeave skills, and keeps its settings in `.specweave/config.json`.
Sources: `src/cli/commands/init.ts:323-324` (`--adapter`), `init.ts:559` (skill count line); capture lines 6-7, 12, 20-21; six skills in `.claude/skills/` and `.agents/skills/` (sw-auto, sw-do, sw-done, sw-handoff, sw-increment, sw-review).

### 04-create · 32.82 s · Create the increment
Chip: Plan: `specweave create-increment`
VO: Now plan the work. Give `specweave create-increment` a title. It makes the folder `0001-personal-greeting`, with a `spec.md` to fill in.
Sources: `src/cli/commands/create-increment.ts:91-94` (auto id, slug from title), `:180-182` (created line, Files).

### 05-decide · 44.33 s · The Decide step
Chip: Decide: only the critical decisions
VO: Step one is Decide. At the default level, critical, your agent asks only the decisions that are yours, one at a time with a recommended answer.
Sources: `create-increment.ts:185` (`Decide: critical` default), `src/core/increment/template-creator.ts:350` (next step 1 text), `skills/sw-increment/SKILL.md:24-36` (triage; ask only "theirs"; record Asked/Defaulted/Open), `src/core/config/types.ts:934` (default `critical`).

### 06-spec · 54.88 s · Problem and acceptance criteria
Chip: Fill in `spec.md`
VO: Then fill in `spec.md`, yourself or with the `sw-increment` skill: the problem, and numbered acceptance criteria that a test can check.
Sources: scaffold `template-creator.ts:518-560`; `skills/sw-increment/SKILL.md:1-3`.

### 07-tasks · 65.19 s · Decisions and tasks
Chip: Decisions and tasks in `spec.md`
VO: Decisions records what was asked, what was defaulted, and what is open. Each task names its acceptance criterion, its files, and the test that proves it.
Sources: `template-creator.ts:548-563` (Decisions headings, task line `- AC: … | Files: … | Test: …`).

### 08-pickup · 76.58 s · specweave pickup
Chip: Next task: `specweave pickup`
VO: Commit the plan, then run `specweave pickup`. It shows the increment, the next task, `T-01`, with its acceptance criterion, files and test, and the command that claims it.
Sources: `src/core/session/pickup.ts:119-131`.

### 09-outro · 89.06 s · Next: claim and prove the task
VO: Next, claim `T-01` and prove it with `task done --run`.

## On-camera commands (real output in captures/session.json)

- `npm i -g specweave` (funding lines elided)
- `node --version`
- `specweave --version`
- `specweave init . --quick --adapter claude`
- `specweave create-increment "Personal greeting"` (absolute Path line elided)
- `cat .specweave/increments/0001-personal-greeting/spec.md` (Scope and Approach elided)
- `git add -A && git commit -m "0001: plan personal greeting"`
- `specweave pickup` (empty memory index elided)

## Exceptions

- `--adapter claude` is on screen. Without it, tool detection (`src/utils/claude-cli-detector.ts:213-232`, `getNpmGlobalPaths` at `:377`) also looks in `/opt/homebrew/bin` and `/usr/local/bin`, outside PATH, found this Mac's own `claude` there and printed "Claude command found but not fully functional / Issue: version_check_failed". That is host state leaking into a disposable run, so the adapter is named explicitly.
- `edit.json` sets `snapDb: -45` (new, optional knob in this episode's `build-composition.mjs`, default -40). At -40 dB the `specweave --version` cue snapped 0.15 s after a soft breath that crosses -40 dB once loudnorm raises the level; at -45 dB the max cue-to-onset error is 0.07 s.
- Audio: same as tutorial 1 (`mp3_44100_128` source; higher formats need a higher plan; key lacks `user_read`).
- The `tutorials.json` entry is written to the batch scratchpad, not to `docs-site/src/data/tutorials.json`, so `verify-tutorials.mjs`, the site build and the page check were not run for this slug.

## CLI findings (not fixed here)

- `init` tool detection reads fixed folders outside PATH (see above) and, when that binary fails `--version`, warns "found but not fully functional" yet still reports "Claude Code native installation complete!".
- `init` "Next steps" numbers a status as a step (`1. ✔ All plugins ready`), prints a Claude Code Desktop AutoVerify tip in a plain CLI run, and says "(1 tech patterns detected)".
- `create-increment` without `--description` puts the title as the first line of `## Problem` in the scaffold (description defaults to the title, `create-increment.ts:96`).
- `create-increment` points to `sw-grill-me` ("sw-grill-me interviews in full") although `init` does not install it (optional, `specweave skills enable grill-me`).
- `pickup` prints the `.specweave/memory/MEMORY.md` header even when the index has no entries.
