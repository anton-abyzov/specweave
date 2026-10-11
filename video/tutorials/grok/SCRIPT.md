# Grok in SpecWithCode

Episode 5 of 6 in **Your agent in SpecWithCode**. Series rules, shared sources, visual system and recording plan: [../SERIES.md](../SERIES.md). How it was made: [../PIPELINE.md](../PIPELINE.md).

**Promise:** in 84 seconds, connect Grok to SpecWithCode, plan one small change with a SpecWeave skill, build it, and review the code, the test and the ledger.

- Audience: a developer who already uses the Grok CLI.
- Runtime: 83.6 s, published 2026-10-11 as `docs-site/static/video/tutorials/grok.mp4`. Narration: 176 words.
- Demo repo: `greet-app` (seed in SERIES.md, `scripts/seed.sh`). Task: "Personal greeting": `greet(name)` returns `Hello, <name>!`, `greet()` still returns `Hello, world!`.
- Source keys: `S:` = specweave-studio at `618bfeca` (v0.2.4), `path:line`. `C:NN` = `captures/NN-*.json` (real runs, 2026-10-11, specweave 3.0.12, Node 22.20.0; home, user and host redacted). `W:` = this specweave repo. Labels used by every episode are sourced once in SERIES.md, "Shared beats".
- Labels checked on the running SpecWithCode 0.2.6 build (2026-10-11, grok 1.0.50). Where 0.2.6 differs from the v0.2.4 source lines below, the 0.2.6 label is used and the difference is noted.

## Beats

| # | Time | Kind | Chapter | Beat |
|---|---|---|---|---|
| 01 | 0:00-0:04 | MG | Intro | Intro (shared) |
| 02 | 0:04-0:11.7 | TERM | Set up the repo | Add SpecWeave to the repo (shared) |
| 03 | 0:11.7-0:22.6 | TERM | Set up the repo | Trust the folder |
| 04 | 0:22.6-0:36.3 | APP | Connect Grok | Add Grok as a provider |
| 05 | 0:36.3-0:48.3 | APP | Add the project | Add the project and open a chat (shared) |
| 06 | 0:48.3-1:01.3 | APP | Plan | Plan with sw-increment (shared) |
| 07 | 1:01.3-1:11.6 | APP | Build | Build with sw-do (shared) |
| 08 | 1:11.6-1:19.6 | APP | Review | Review the diff (shared) |
| 09 | 1:19.6-1:23.6 | MG | Next | Outro (shared) |

Total: 83.6 s. Executable steps for every APP beat are in `SHOTLIST.json`; cuts, speed ramps and highlights are in `edit.json`.

### 01 Intro (0:00-0:04, MG)

- **VO:** "Grok in SpecWithCode: plan, build, review."
- **Card:** eyebrow "SpecWithCode tutorial 05", title "Grok in SpecWithCode", subtitle "Plan, build and review one task. The plan stays in your repo.".
- **Sources:**
  - Shared card, see SERIES.md "Intro and outro".

### 02 Add SpecWeave to the repo (0:04-0:11.7, TERM)

- **VO:** "In your repo, run specweave init with the generic adapter. It adds AGENTS.md and eleven SpecWeave skills."
- **Step chip:** In your repo: specweave init . --quick --adapter generic
- **Shot (TERM):**
  1. Typeset `specweave init . --quick --adapter generic` from `captures/02-specweave-init-generic.json`, prompt `greet-app %`. Show `✓ AGENTS.md created`, `✓ 11 skills installed as sw-* in .claude/skills/ and .agents/skills/`.
- **Sources:**
  - C:02 (exit 0): the command and both lines, stdout lines 7 and 58.
  - The init tool picker has no Grok entry, so the episode uses `--adapter generic`; plain `--quick` auto-detected Claude Code on this Mac (C:02b). The skills are the same either way. The demo repo was seeded the same way with specweave 3.0.14 (lines 8 and 62 of its log, same text).

### 03 Trust the folder (0:11.7-0:22.6, TERM)

- **VO:** "Grok skips project skills in folders it doesn't trust. In the repo, run grok --trust once. Signed out? Run grok login first."
- **Step chip:** Trust the folder once: grok --trust · signed out: grok login
- **Shot (TERM):**
  1. Typeset `grok --trust inspect --json | jq -r '.skills[].name | select(startswith("sw-"))'` from `captures/04-grok-trust-skills.json`, prompt `greet-app %`, in the smaller 24 px card. Show all 11 lines (sw-auto … sw-team), with the accent bar on `sw-do` and `sw-increment`.
- **Sources:**
  - C:04 (exit 0). Before the grant, `grok inspect --json` reported `projectTrusted: false` and no `sw-*` skills; after `grok --trust inspect --json` it reported `projectTrusted: true` and 11 `sw-*` skills, and the grant was saved in `~/.grok/trusted_folders.toml` (re-checked in the demo HOME on 2026-10-11).
  - Grok: "Startup discovery skips project skills and commands in untrusted folders" (grok 1.0.50 `~/.grok/docs/user-guide/08-skills.md:3`; `--trust` covers project skills, `10-hooks.md:81`).
  - SpecWithCode lists skills with `grok inspect --json` and starts `grok agent stdio` without `--trust` (S:apps/server/src/provider/GrokProvider.ts:501; S:apps/server/src/provider/Drivers/GrokSkills.ts:1-14; S:apps/server/src/provider/acp/GrokAcpSupport.ts:56-67).
  - Signed out: "Grok CLI is installed but not logged in. Run `grok login`." (S:…/GrokProvider.ts:537).

### 04 Add Grok as a provider (0:22.6-0:36.3, APP)

- **VO:** "Open SpecWithCode. In the account menu, pick Settings, then Providers. Grok is off by default: click Add provider, pick Grok, existing CLI, click Next twice, then Add instance."
- **Step chip:** Settings → Providers → Add provider → Grok (existing CLI)
- **Shot (APP):** the wizard was finished off camera (SERIES.md, recording plan step 7), so the take opens on Overview ("Control desk").
  1. Click the account menu at the foot of the sidebar (aria-label "Account: Demo Mac"; it shows the computer name).
  2. Click **Settings** (menu item; Usage, Pull requests and Machines and connections sit below it).
  3. Click **Providers** in the Settings list (route /settings/providers; only the Codex and Claude rows show).
  4. Click **Add provider**.
  5. Check: "Add an account or configure a provider on Demo Mac." (dialog "Add provider"; steps Provider, Identity, Config).
  6. Click **Grok (existing CLI)** (radios: Codex, Claude, Cursor, Grok (existing CLI), OpenCode, Antigravity, Pi; not the "Grok Build" ACP Registry card).
  7. Click **Next** (Identity: Label "Grok", Instance ID "grok").
  8. Click **Next** (Config: Binary path, placeholder "grok").
  9. Click **Add instance**.
  10. Check: "Provider instance added" (toast; "Grok instance 'grok' was added.").
  11. Check: "Authenticated · Grok account" (the row first reads "Needs attention · Checking Grok CLI availability…" for about a second).
- **0.2.6 differences:** Settings is not a sidebar item; it sits in the account menu under the computer name, and the Settings view has its own list with Providers and a Back button. The VO says "In the account menu, pick Settings" instead of "then Settings". The instance id is plain `grok` (no suffix). Edits 3× the two Next clicks and Add instance, with a "Sped up 3×" chip.
- **Sources:**
  - Add provider button (S:…/ProviderSettingsPanel.tsx:1215), dialog title (S:…/AddProviderInstanceDialog.tsx:383), steps Provider, Identity, Config (S:…/AddProviderInstanceDialog.logic.ts:8), Next (:699), Add instance (:711), toast (:364), saved with enabled: true (:328).
  - "Grok (existing CLI)" (S:apps/web/src/components/settings/AddProviderInstanceDialog.tsx:450). Grok is off by default (S:packages/contracts/src/settings.ts:757-764).
  - A default-off provider has no row until it is added or enabled; Codex and Claude always show (S:apps/web/src/components/settings/ProviderSettingsPanel.tsx:788-806).
  - After adding, the row reads "Authenticated · Grok account" (S:apps/web/src/components/settings/providerStatus.ts:79; S:apps/server/src/provider/GrokProvider.ts:494-496). The detail pane's "Authenticated as" email is blurred by the app ("Toggle account email visibility"); it was never clicked.

### 05 Add the project and open a chat (0:36.3-0:48.3, APP)

- **VO:** "Add the repo: the plus next to Projects, Local folder, then its path. A new chat opens. Pick Grok in the model picker, and set Full access for this demo."
- **Step chip:** + → Local folder → ~/greet-app · Grok 4.7 · Full access
- **Shot (APP):**
  1. Click **Back** (foot of the Settings list) to return to the sidebar.
  2. Click **Add project** (the + next to Projects).
  3. Click **Local folder** ("New project" and "Personal assistant" rows sit above it).
  4. Type `~/greet-app` into "Enter path (e.g. ~/projects/my-app)".
  5. Press Enter.
  6. Check: "What should we build in greet-app?" (adding the folder opens a new chat; there is no separate New chat click on 0.2.6).
  7. Leave the workspace on "Current checkout" (cut from the edit).
  8. Click the model picker (labelled with the current model; "Grok 4.7" once Grok is added) → **Grok 4.7** in the Grok rail (Grok 4.7, Grok 4.7 Fast, Grok 4.6, Grok 4.5, Grok Build).
  9. Click **Runtime mode** ("Supervised" by default; options Supervised, Auto, Full access) → **Full access**.
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - Models come from the Grok CLI; this machine's default is grok-4.7 (C:10). The picker shows "Grok 4.7".

### 06 Plan with sw-increment (0:48.3-1:01.3, APP)

- **VO:** "Type a dollar sign, pick sw-increment, and describe the change. Grok writes spec.md: acceptance criteria and a task with its files and test."
- **Step chip:** $ → Sw Increment → describe the change → Enter
- **Shot (APP):**
  1. Click the composer (a new chat's placeholder is "Ask for changes, send follow-ups, or attach images").
  2. Type `$`.
  3. Check: "Sw Increment" (0.2.6 lists the 11 skills title-cased, Sw Auto … Sw Team, each tagged "Project Skill").
  4. Click **Sw Increment**.
  5. Type `Personal greeting: greet(name) returns "Hello, <name>!" and greet() still returns "Hello, world!". Use Ada in examples. Plan only, no code yet.`.
  6. Press Enter.
  7. Speed-ramp until the reply ends, with the "Sped up 21×" chip (the turn took 89 s, "Worked for 1m 27s").
  8. Highlight the reply's acceptance criteria and task: AC-01, AC-02 and T-01 with `greeting.js`, `greeting.test.js` and `npm test -- test/greeting.test.js`.
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - In the take, Grok wrote `0001-personal-greeting/spec.md` with AC-01, AC-02 and T-01 and changed no code (C:05 and C:07 are an earlier `grok -p` run of a different task).

### 07 Build with sw-do (1:01.3-1:11.6, APP)

- **VO:** "Then send sw-do. Grok claims the task, changes the code, and runs the test. The task is marked done only when the test passes."
- **Step chip:** $ → Sw Do → claim → edit → test → done
- **Shot (APP):**
  1. Type `$`, click **Sw Do** (not Sw Done).
  2. Type `Do T-01, then stop. I will close the increment myself.`, press Enter.
  3. Speed-ramp until the turn ends, with the "Sped up 24×" chip (the turn took 77 s, "Worked for 1m 15s").
  4. Expand **Worked for …**, then **Ran 3 commands**, and hold on `git add src/greeting.js test/greeting.test.js …`, `specweave task done T-01 0001-personal-greeting --run "npm test -- test/greeting.test.js"` and "T-01 is complete. I will stop as requested."
- **Sources:**
  - `specweave task done --run` exits 5 and records nothing when the command fails; on exit 0 it records the command and log as evidence (W:src/cli/commands/task.ts:8,64,207-209).
  - `sw-do`: "claim, implement inside the task's Files, test, commit, done with evidence" (W:skills/sw-do/SKILL.md:2).
  - In the take, Grok claimed T-01, edited `src/greeting.js` and `test/greeting.test.js`, ran the test (2 pass), committed `0001: accept an optional name`, ran `task done`, and stopped: "T-01 is done. The increment is still open for you to close."

### 08 Review the diff (1:11.6-1:19.6, APP)

- **VO:** "Click Open diff to review the code, the test, and the ledger line that records who finished the task."
- **Step chip:** Open diff → code · test · ledger.jsonl
- **Shot (APP):**
  1. Click **Open diff** on the last turn's "5 changed files" card. The diff panel opens on "Latest turn".
  2. Click **Expand src/greeting.js**, then **Expand test/greeting.test.js**, then the `ledger.jsonl` row.
  3. Highlight the `done` line: `"by":"grok@demo"` with its `npm test` evidence.
- **Sources:**
  - Ledger lines: one JSON object per line, `done` carries evidence (generated AGENTS.md, Rules).
  - Agent id is `SPECWEAVE_AGENT`, else `<tool>@<host>`; `SPECWEAVE_TOOL` and `SPECWEAVE_HOST` override detection (W:src/core/tasks/ledger.ts:95-133). Both ledger lines read `grok@demo`.

### 09 Outro (1:19.6-1:23.6, MG)

- **VO:** "Next, sw-done verifies and closes the increment."
- **Card:** three lines: "Next: $sw-done · verify and close" / "SpecWithCode is in private pilot · spec-weave.com/studio" / "All tutorials · spec-weave.com/tutorials".
- **Sources:**
  - `sw-done`: "every task done or skipped, specweave verify green, a fresh-context review, then specweave complete" (W:skills/sw-done/SKILL.md:2).
  - Private pilot, no public download: W:docs-site/src/pages/studio.tsx:19,22.

## Narration (read straight through)

Grok in SpecWithCode: plan, build, review.
In your repo, run specweave init with the generic adapter. It adds AGENTS.md and eleven SpecWeave skills.
Grok skips project skills in folders it doesn't trust. In the repo, run grok --trust once. Signed out? Run grok login first.
Open SpecWithCode. In the account menu, pick Settings, then Providers. Grok is off by default: click Add provider, pick Grok, existing CLI, click Next twice, then Add instance.
Add the repo: the plus next to Projects, Local folder, then its path. A new chat opens. Pick Grok in the model picker, and set Full access for this demo.
Type a dollar sign, pick sw-increment, and describe the change. Grok writes spec.md: acceptance criteria and a task with its files and test.
Then send sw-do. Grok claims the task, changes the code, and runs the test. The task is marked done only when the test passes.
Click Open diff to review the code, the test, and the ledger line that records who finished the task.
Next, sw-done verifies and closes the increment.

The TTS input spells some words out (for example "Spec With Code", "S W increment", "grok dash dash trust", "existing C L I"); see `scripts/vo-lines.json`. Narration is AI-generated with Anton's cloned voice (same voice, model and settings as episode 1); there is no music bed.

## Grok recording notes

Shared rules (demo home, environment, credentials, rename) are in SERIES.md and PIPELINE.md. These apply to this episode only.

1. **Sign-in, off camera.** `scripts/grok-signin.sh <root>` copies only the current access key from `~/.grok/auth.json` into `<root>/home/.grok/auth.json` (mode 600, never printed), with the refresh token removed and the email and name replaced by demo values, so a refresh in the demo HOME cannot rotate the real login. Run `grok models` in your own HOME first if the key is near expiry (it lasts about six hours). Delete the file at teardown.
2. **Trust lives in HOME.** The grant is saved in `~/.grok/trusted_folders.toml`. `grok-signin.sh` runs `grok --trust inspect --json` in the demo repo, which saves the grant without opening the TUI.
3. **Full access matters.** Grok has no Auto-accept edits, and Supervised stops on every command (S:docs/user/permission-modes.md at 618bfeca).
4. **Grok Build.** Do not use the "Grok Build" registry card; it is a different install (S:docs/studio/copilot-and-grok.md at 618bfeca).
5. **Credentials.** The Grok row blurs the account email behind "Toggle account email visibility"; never click it. Never type an `XAI_API_KEY` on screen.
6. **Long turns.** Plan took 89 s and build 77 s in the take (62 s and 68 s in rehearsal), so the ramps are 21× and 24×. `build-composition.mjs` pre-renders ramps above 8× with ffmpeg and the chip shows the real rate.
7. **Whisper.** The full-line pass dropped "existing CLI" from beat 04; `vo-words/04-add-provider.json` carries the timings from a re-transcription of that span.
8. **Scripts.** `scripts/prep.sh <root> [port]` seeds the repo, signs Grok in, trusts the folder, starts the server on 8334, pairs and finishes the wizard. `scripts/demo-env.sh <root> <cmd>` runs a command in the demo environment.

## Not verified

Shared gaps are listed in SERIES.md. Specific to this episode:

- The Overview page shows a stale "Codex 1" usage observation in "Hosts & capacity" for about a second at the start of beat 04 (no account name; the same row appears in episode 1).
- Grok left the `done` ledger line, `metadata.json` and the task report uncommitted after its commit (it said so in its reply); the review beat shows them in the diff, which is correct for the turn.

## Captures

| File | Command | Exit | Time | Use |
|---|---|---|---|---|
| `captures/01-specweave-version.json` | `specweave --version` | 0 | 0.5 s | evidence |
| `captures/02-specweave-init-generic.json` | `specweave init . --quick --adapter generic` | 0 | 1.1 s | on screen |
| `captures/02b-specweave-init-autodetect.json` | `specweave init . --quick` | 0 | 1.1 s | evidence |
| `captures/03-ls-skills.json` | `ls .agents/skills .claude/skills` | 0 | 0.1 s | evidence |
| `captures/04-grok-trust-skills.json` | `grok --trust inspect --json \| jq -r '.skills[].name \| select(starts…` | 0 | 0.2 s | on screen |
| `captures/05-grok-sw-increment.json` | `grok -p '/sw-increment Add an optional shout flag to greet() that r…` | 0 | 85.2 s | evidence |
| `captures/06-git-status-after-plan.json` | `git status --short` | 0 | 0.1 s | evidence |
| `captures/07-spec-md.json` | `cat .specweave/increments/0001-optional-shout-flag-for-greet/spec.md` | 0 | 0.1 s | evidence |
| `captures/08-increment-files.json` | `ls .specweave/increments/0001-optional-shout-flag-for-greet` | 0 | 0.1 s | evidence |
| `captures/09-specweave-task-next.json` | `specweave task next` | 0 | 0.4 s | evidence |
| `captures/10-grok-version-models.json` | `grok --version && grok models` | 0 | 1.4 s | evidence |
