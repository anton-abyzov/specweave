# OpenCode in SpecWithCode

Episode 4 of 6 in **Your agent in SpecWithCode**. Series rules, shared sources, visual system and recording plan: [../SERIES.md](../SERIES.md). How it was made: [../PIPELINE.md](../PIPELINE.md).

**Promise:** in 71 seconds, connect OpenCode to SpecWithCode, plan one small change with a SpecWeave skill, build it, and review the code, the test and the ledger.

- Audience: a developer who already uses OpenCode.
- Runtime: 70.9 s, published 2026-10-11 as `docs-site/static/video/tutorials/opencode.mp4`. Narration: 157 spoken words.
- Demo repo: `greet-app` (seed in SERIES.md). Task: "Personal greeting": `greet(name)` returns `Hello, <name>!`, `greet()` still returns `Hello, world!`.
- Source keys: `S:` = specweave-studio at `618bfeca` (v0.2.4), `path:line`. `C:NN` = `captures/NN-*.json` (real runs, 2026-10-11, specweave 3.0.12, Node 22.20.0; home, user and host redacted). `W:` = this specweave repo. Labels used by every episode are sourced once in SERIES.md, "Shared beats".
- Labels checked on the running SpecWithCode 0.2.6 build with OpenCode 2.0.26 (2026-10-11). Where 0.2.6 differs from the v0.2.4 source lines below, the 0.2.6 label is used and the difference is noted.

## Beats

| # | Time | Kind | Chapter | Beat |
|---|---|---|---|---|
| 01 | 0:00-0:04 | MG | Intro | Intro (shared) |
| 02 | 0:04-0:10.5 | TERM | Set up the repo | Add SpecWeave to the repo (shared) |
| 03 | 0:10.5-0:26.2 | APP | Connect OpenCode | Connect OpenCode |
| 04 | 0:26.2-0:37.2 | APP | Add the project | Add the project and open a chat (shared) |
| 05 | 0:37.2-0:48.2 | APP | Plan | Plan with sw-increment (shared) |
| 06 | 0:48.2-0:58.9 | APP | Build | Build with sw-do (shared) |
| 07 | 0:58.9-1:06.9 | APP | Review | Review the diff (shared) |
| 08 | 1:06.9-1:10.9 | MG | Next | Outro (shared) |

Total: 70.9 s. Executable steps for every APP beat are in `SHOTLIST.json`; cuts, speed ramps, blurs and highlights are in `edit.json`.

### 01 Intro (0:00-0:04, MG)

- **VO:** "OpenCode in SpecWithCode: plan, build, review."
- **Card:** eyebrow "SpecWithCode tutorial 04", title "OpenCode in SpecWithCode", subtitle "Plan, build and review one task. The plan stays in your repo.".
- **Sources:**
  - Shared card, see SERIES.md "Intro and outro".

### 02 Add SpecWeave to the repo (0:04-0:10.5, TERM)

- **VO:** "In your repo, run specweave init. It adds AGENTS.md and eleven SpecWeave skills."
- **Step chip:** In your repo: specweave init . --quick
- **Shot (TERM):**
  1. Typeset `specweave init . --quick` from `captures/02-specweave-init.json`, prompt `greet-app %`. Show `✓ AGENTS.md created`, `✓ 11 skills installed as sw-* in .claude/skills/ and .agents/skills/`.
- **Sources:**
  - C:02 (exit 0): the command and both lines, stdout lines 12 and 16.
  - OpenCode sees all 11 `sw-*` skills from the project folders: `opencode debug skill` (C:04, evidence only).

### 03 Connect OpenCode (0:10.5-0:26.2, APP)

- **VO:** "Sign OpenCode in to a model provider first: run opencode auth login in a terminal. Open SpecWithCode, then Settings, Providers. Click Add provider, pick OpenCode, click Next twice, then Add instance."
- **Step chip:** Settings → Providers → Add provider → OpenCode → Add instance
- **Shot (APP):**
  1. Click **Account: Demo Mac** (the sidebar footer), then **Settings** in its menu.
  2. Click **Providers** (only the Codex and Claude rows show; OpenCode is off by default).
  3. Click **Add provider**. Check: "Add an account or configure a provider" (dialog "Add provider", steps Provider, Identity, Config).
  4. Click **OpenCode** (a radio; the list also has Codex, Claude, Cursor, Grok (existing CLI), Antigravity, Pi and an ACP Registry section).
  5. Click **Next**. Check: "Instance ID" (Identity step: Label, Instance ID, Accent color; left as is).
  6. Click **Next**. Check: "Leave blank to let SpecWithCode spawn the server when needed." (Config step: Binary path, Server URL, Server password; all left empty).
  7. Click **Add instance**. Toast "Provider instance added" / "OpenCode instance 'opencode' was added."
  8. Hold on "Authenticated · OpenCode 2.0.26 lists N models." in the OpenCode panel.
  9. Click **Back** (cut in the edit).
- **Edit:** the opening Overview frames blur the stale "Codex 1" quota row in "Hosts & capacity".
- **0.2.6 differences:** Settings moved from the sidebar footer link into the account menu; Providers is a button; the status line reads "Authenticated · OpenCode 2.0.26 lists N models." instead of "1 upstream provider connected through OpenCode."; there is no Refresh step. The old separate sign-in card beat was folded into this beat's first sentence, so the episode has 8 beats like episode 1.
- **Sources:**
  - `opencode auth login` (S:docs/user/install.md:123).
  - A default-off provider has no row until it is added or enabled; Codex and Claude always show (S:apps/web/src/components/settings/ProviderSettingsPanel.tsx:788-806).
  - Add provider button (S:…/ProviderSettingsPanel.tsx:1215), dialog title (S:…/AddProviderInstanceDialog.tsx:383), steps Provider, Identity, Config (S:…/AddProviderInstanceDialog.logic.ts:8), Next (:699), Add instance (:711), toast (:364), saved with enabled: true (:328).
  - OpenCode is off by default (S:packages/contracts/src/settings.ts:966-970).
  - Empty Server URL means the app starts the server (S:…/settings.ts:986; S:docs/user/providers-opencode.md:27).

### 04 Add the project and open a chat (0:26.2-0:37.2, APP)

- **VO:** "Add the repo: the plus next to Projects, Local folder, then its path. A new chat opens. Pick OpenCode in the model picker, and set Full access for this demo."
- **Step chip:** + → Local folder → ~/greet-app · Sonnet 5.5 · Full access
- **Shot (APP):**
  1. Click **Add project** (the + next to Projects).
  2. Click **Local folder** ("New project" and "Personal assistant" rows sit above it).
  3. Type `~/greet-app` into "Enter path (e.g. ~/projects/my-app)", press Enter.
  4. Check: "What should we build in greet-app?" (adding the folder opens a new chat; there is no separate New chat click on 0.2.6). Leave the workspace on "Current checkout".
  5. Click the model picker (labelled with the current model; with only OpenCode ready it defaulted to an OpenCode model, "Big Pickle" or "Aion 3.5" in the takes).
  6. Click **OpenCode** in the Providers rail, type `sonnet 5.5` into "Search models...", click **Claude Sonnet 5.5** (served through the connected OpenRouter provider).
  7. Click **Runtime mode** ("Supervised" by default) → **Full access**.
- **Edit:** the first frames blur the same stale "Codex 1" row.
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - Models are listed only for upstream providers OpenCode reports as connected (S:apps/server/src/provider/OpenCodeProvider.ts:253-262).

### 05 Plan with sw-increment (0:37.2-0:48.2, APP)

- **VO:** "Type a dollar sign, pick sw-increment, and describe the change. OpenCode writes spec.md: acceptance criteria and a task with its files and test."
- **Step chip:** $ → Sw Increment → describe the change → Enter
- **Shot (APP):**
  1. Click the composer (a new chat's placeholder is "Ask for changes, send follow-ups, or attach images").
  2. Type `$`. Check: "Sw Increment" (the menu lists OpenCode's own "OpenCode" and "Report" skills, then the 11 skills title-cased, Sw Auto … Sw Team, each tagged "Provider Skill"; there is no "Searching workspace skills..." state).
  3. Click **Sw Increment**.
  4. Type `Personal greeting: greet(name) returns "Hello, <name>!" and greet() still returns "Hello, world!". Use Ada in examples. Plan only, no code yet.`, press Enter.
  5. Speed-ramp 6x until the reply ends, with the "Sped up 6×" chip.
  6. Highlight the reply's AC-01, AC-02 and T-01 (files and `npm test`).
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - The `$` menu lists OpenCode skills from the OpenCode server (S:apps/server/src/provider/Drivers/OpenCodeDriver.ts:397-409).
  - Only the OpenCode 2 adapter resolves `$skill` tokens (S:apps/server/src/orchestration-v2/Adapters/OpenCode2AdapterV2.ts:795-796).
  - In the take, OpenCode wrote `0001-personal-greeting/spec.md` with AC-01, AC-02 and T-01.

### 06 Build with sw-do (0:48.2-0:58.9, APP)

- **VO:** "Then send sw-do. OpenCode claims the task, changes the code, and runs the test. The task is marked done only when the test passes."
- **Step chip:** $ → Sw Do → claim → edit → test → done
- **Shot (APP):**
  1. Type `$`, click **Sw Do** (not Sw Done). The follow-up placeholder is "Ask anything, @tag files/folders, $use skills, or / for commands".
  2. Type `Do T-01, then stop. I will close the increment myself.`, press Enter.
  3. Speed-ramp 6x until the turn ends, with the "Sped up 6×" chip.
  4. Expand **Worked for …** when present and hold on the steps: `specweave task claim T-01`, the edit to `src/greeting.js`, `npm test`, the commit `0001: greet by name` and `specweave task done T-01 … --run "npm test"`.
- **Sources:**
  - `specweave task done --run` exits 5 and records nothing when the command fails; on exit 0 it records the command and log as evidence (W:src/cli/commands/task.ts:8,64,207-209).
  - `sw-do`: "claim, implement inside the task's Files, test, commit, done with evidence" (W:skills/sw-do/SKILL.md:2).
  - In the take: claim and done both `opencode@demo`, 2 tests pass, OpenCode stopped after T-01.

### 07 Review the diff (0:58.9-1:06.9, APP)

- **VO:** "Click Open diff to review the code, the test, and the ledger line that records who finished the task."
- **Step chip:** Open diff → code · test · ledger.jsonl
- **Shot (APP):**
  1. Click **Open diff** on the last turn's "N changed files" card. The diff panel opens on "Latest turn".
  2. Click **Expand src/greeting.js**, then **Expand test/greeting.test.js**, then the `ledger.jsonl` row.
  3. Highlight the `done` line: `"by":"opencode@demo"` with its `npm test` evidence.
- **Note:** OpenCode committed the code before recording `done`, so the ledger line, `metadata.json` and `reports/task-T-01.txt` are uncommitted and show in the diff next to the code and test.
- **Sources:**
  - Ledger lines: one JSON object per line, `done` carries evidence (generated AGENTS.md, Rules).
  - Agent id is `SPECWEAVE_AGENT`, else `<tool>@<host>`; `SPECWEAVE_TOOL` and `SPECWEAVE_HOST` override detection (W:src/core/tasks/ledger.ts:95-133).

### 08 Outro (1:06.9-1:10.9, MG)

- **VO:** "Next, sw-done verifies and closes the increment."
- **Card:** eyebrow "SPECWITHCODE TUTORIAL 04", three lines: "Next: $sw-done · verify and close" / "SpecWithCode is in private pilot · spec-weave.com/studio" / "All tutorials · spec-weave.com/tutorials".
- **Sources:**
  - `sw-done`: "every task done or skipped, specweave verify green, a fresh-context review, then specweave complete" (W:skills/sw-done/SKILL.md:2).
  - Private pilot, no public download: W:docs-site/src/pages/studio.tsx:19,22.

## Narration (read straight through)

OpenCode in SpecWithCode: plan, build, review.
In your repo, run specweave init. It adds AGENTS.md and eleven SpecWeave skills.
Sign OpenCode in to a model provider first: run opencode auth login in a terminal. Open SpecWithCode, then Settings, Providers. Click Add provider, pick OpenCode, click Next twice, then Add instance.
Add the repo: the plus next to Projects, Local folder, then its path. A new chat opens. Pick OpenCode in the model picker, and set Full access for this demo.
Type a dollar sign, pick sw-increment, and describe the change. OpenCode writes spec.md: acceptance criteria and a task with its files and test.
Then send sw-do. OpenCode claims the task, changes the code, and runs the test. The task is marked done only when the test passes.
Click Open diff to review the code, the test, and the ledger line that records who finished the task.
Next, sw-done verifies and closes the increment.

The TTS input spells some words out (for example "Open Code", "Spec With Code", "S W increment"); see `scripts/vo-lines.json`. Each line was generated once with the episode 1 voice and settings. Narration is AI-generated with Anton's cloned voice; there is no music bed.

## OpenCode recording notes

Shared rules (demo home, environment, credentials, rename) are in SERIES.md. These apply to this episode only.

1. **Use OpenCode 2.** 0.2.6 rates OpenCode 1.14.19 up to 2.0 as **Limited support** and showed an "Update Available" toast on 1.14.33. The take ran OpenCode 2.0.26 (npm `@opencode/cli`) installed into `<demo>/tools` by `scripts/install-opencode2.sh` and put first on the server PATH. "Check provider versions" was switched off off camera.
2. **Sign-in in the demo HOME.** OpenCode 2 keeps provider logins in its own database, so a copied 1.x `auth.json` alone was not picked up in a fresh HOME (only the free Zen models were listed). The demo HOME was signed in off camera by copying `~/.local/share/opencode/auth.json` (mode 600) and piping `opencode auth export --standalone` into `opencode auth import --standalone` between demo HOMEs; nothing was printed. Both the file and `opencode.db*` were deleted at teardown. Never run `opencode auth list` or open the Server password field on camera.
3. **Host name.** `scripts/seed.sh` writes the scutil shim and a `.zprofile` putting it first, so the computer is "Demo Mac".
4. **Model picker.** The default model is whatever OpenCode lists first ("Big Pickle" on the first final take, which broke a name-based click). The take opens the picker by `[data-chat-provider-model-picker=true]` and searches for the model.
5. **Cost.** Every OpenCode turn bills the connected provider. Rehearse on a cheap model, film on a strong one.
6. **Captured ledger name.** C:05, C:07 and C:08 record `claude@<host>`: they ran under a Claude Code parent. The series server environment sets `SPECWEAVE_TOOL=opencode`, so the take records `opencode@demo`; never typeset the captured lines.

## Not verified

Shared gaps are listed in SERIES.md. Specific to this episode:

- What the Providers panel shows for OpenCode with no upstream provider signed in (the take always had one).
- Whisper hears "Spec With Code" as "inspect with code" in the word timings; captions use the script text, so on-screen text is unaffected.

## Captures

| File | Command | Exit | Time | Use |
|---|---|---|---|---|
| `captures/01-versions.json` | `specweave --version && opencode --version` | 0 | 3.6 s | evidence |
| `captures/02-specweave-init.json` | `specweave init . --quick` | 0 | 1.0 s | on screen |
| `captures/03-ls-skills.json` | `ls .agents/skills .claude/skills` | 0 | 0.1 s | evidence |
| `captures/04-opencode-debug-skill.json` | `opencode debug skill > /tmp/skills.json && jq -r '[.[] \| select(.na…` | 0 | 3.3 s | evidence |
| `captures/05-opencode-run-sw-increment.json` | `opencode run -m openrouter/anthropic/claude-haiku-4.5 'Use the skil…` | 0 | 57.1 s | evidence |
| `captures/06-opencode-auth-list.json` | `opencode auth list` | 0 | 1.8 s | evidence |
| `captures/07-opencode-run-sw-do.json` | `opencode run -m openrouter/anthropic/claude-haiku-4.5 'Read .claude…` | 0 | 24.2 s | evidence |
| `captures/08-result-task-list.json` | `specweave task list && git log --oneline -2 && ./hello.sh` | 0 | 0.2 s | evidence |
