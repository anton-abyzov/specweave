# Codex in SpecWithCode

Episode 2 of 6 in **Your agent in SpecWithCode**. Series rules, shared sources, visual system and recording plan: [../SERIES.md](../SERIES.md). How it was made: [../PIPELINE.md](../PIPELINE.md).

**Promise:** in 73 seconds, connect Codex to SpecWithCode, plan one small change with a SpecWeave skill, build it, and review the code, the test and the ledger.

- Audience: a developer who already uses Codex.
- Runtime: 72.7 s, published 2026-10-11 as `docs-site/static/video/tutorials/codex.mp4`. Narration: 154 spoken words.
- Demo repo: `greet-app` (seed in SERIES.md, written by `scripts/seed.sh`). Task: "Personal greeting": `greet(name)` returns `Hello, <name>!`, `greet()` still returns `Hello, world!`.
- Source keys: `S:` = specweave-studio at `618bfeca` (v0.2.4), `path:line`. `C:NN` = `captures/NN-*.json` (real runs, 2026-10-11; home, user and host redacted). `W:` = this specweave repo. Labels used by every episode are sourced once in SERIES.md, "Shared beats".
- Labels checked on the running SpecWithCode 0.2.6 build (2026-10-11). Where 0.2.6 differs from the v0.2.4 source lines below, the 0.2.6 label is used and the difference is noted.
- Shared beats keep episode 1's wording, visual system and lengths. Only beat 03 (Connect Codex) is longer: 17.5 s against 11.5 s, so the episode runs 6 s longer.

## Beats

| # | Time | Kind | Chapter | Beat |
|---|---|---|---|---|
| 01 | 0:00-0:04 | MG | Intro | Intro (shared) |
| 02 | 0:04-0:10.5 | TERM | Set up the repo | Add SpecWeave to the repo (shared) |
| 03 | 0:10.5-0:28 | APP | Connect Codex | Connect Codex |
| 04 | 0:28-0:39 | APP | Add the project | Add the project and open a chat (shared) |
| 05 | 0:39-0:50 | APP | Plan | Plan with sw-increment (shared) |
| 06 | 0:50-1:00.7 | APP | Build | Build with sw-do (shared) |
| 07 | 1:00.7-1:08.7 | APP | Review | Review the diff (shared) |
| 08 | 1:08.7-1:12.7 | MG | Next | Outro (shared) |

Total: 72.7 s. Executable steps for every APP beat are in `SHOTLIST.json`; cuts, speed ramps and highlights are in `edit.json`.

### 01 Intro (0:00-0:04, MG)

- **VO:** "Codex in SpecWithCode: plan, build, review."
- **Card:** eyebrow "SpecWithCode tutorial 02", title "Codex in SpecWithCode", subtitle "Plan, build and review one task. The plan stays in your repo.".
- **Sources:**
  - Shared card, see SERIES.md "Intro and outro".

### 02 Add SpecWeave to the repo (0:04-0:10.5, TERM)

- **VO:** "In your repo, run specweave init. It adds AGENTS.md and eleven SpecWeave skills."
- **Step chip:** In your repo: specweave init . --quick
- **Shot (TERM):**
  1. Typeset `specweave init . --quick` from `captures/10-specweave-init-quick.json`, prompt `greet-app %`. Show `✓ AGENTS.md created`, `✓ 11 skills installed as sw-* in .claude/skills/ and .agents/skills/`.
- **Sources:**
  - C:10 (exit 0, the seed run of the take, `SPECWEAVE_TOOL=codex`): the command and both lines, stdout lines 12 and 48. Codex was detected without `--adapter codex`, so the shared command is kept.
  - Codex reads the project's `.agents/skills`: its own prompt input lists that folder and the 11 `sw-*` skills (C:04).

### 03 Connect Codex (0:10.5-0:28, APP)

- **VO:** "Open SpecWithCode. In setup, keep this computer and click Continue. On the Codex card, click Continue with ChatGPT, or run codex login, then Use existing CLI. The card says Ready to code."
- **Step chip:** Setup → Continue → Codex: Use existing CLI → Ready to code
- **Shot (APP):**
  1. Check: "Connect your computers" (the wizard opens on its Connect step; the steps are Connect, Agents, Projects).
  2. Check: "Demo Mac" (named by the scutil shim, so nothing is blurred).
  3. Click **Continue**.
  4. Check: "Connect your agents". The Codex card reads "Not authenticated" (the demo HOME starts signed out) and offers **Use existing CLI** and **Continue with ChatGPT**.
  5. Hover **Continue with ChatGPT** (never clicked: it opens the OpenAI sign-in page).
  6. Hover, then click **Use existing CLI**. Off camera, right before the click, `scripts/codex-auth.sh` stands in for `codex login` in a terminal.
  7. Check: "Ready to code." and "Ready". No account email is shown.
  8. Click **Continue**, then **Do not import projects** (0.2.6 shows "No existing Claude Code or Codex projects found." in a fresh HOME).
- **Edit:** the 1.2 s after the click, while the card shows "Not authenticated · Codex CLI is not authenticated. Run `codex login`…" and then "Checking…", is jump-cut.
- **0.2.6 differences:** the wizard is titled "SpecWithCode", not "Set up SpecWithCode". A signed-out Codex card reads "Not authenticated" and shows both buttons; a ready card adds a "Connect another ChatGPT account" link.
- **Sources:**
  - Stages and wizard labels as in episode 1 (S:apps/web/src/components/onboarding/WelcomeWizard.tsx:110,338,435,665,974,1531); Codex uses `CodexSetupSection` in setup (:930-941).
  - "Continue with ChatGPT" (S:apps/web/src/components/settings/CodexSetupSection.tsx:115,835), "Use existing CLI" (:122,876), "Ready" (:100,814).
  - Signed-out existing CLI: "Codex CLI is not authenticated. Run `codex login` and try again." (S:apps/server/src/provider/CodexProvider.ts:692).
  - Codex is on by default (S:packages/contracts/src/settings.ts:601-602).

### 04 Add the project and open a chat (0:28-0:39, APP)

- **VO:** "Add the repo: the plus next to Projects, Local folder, then its path. A new chat opens. Pick Codex in the model picker, and set Full access for this demo."
- **Step chip:** + → Local folder → ~/greet-app · GPT-6.1-Sol · Full access
- **Shot (APP):**
  1. Click **Add project** (the + next to Projects).
  2. Click **Local folder** ("New project" and "Personal assistant" rows sit above it).
  3. Type `~/greet-app` into "Enter path (e.g. ~/projects/my-app)".
  4. Press Enter.
  5. Check: "What should we build in greet-app?" (adding the folder opens a new chat on "Current checkout"; there is no separate New chat click).
  6. Click the model picker (labelled "GPT-6.1-Sol", Codex's default once Codex is ready) → **GPT-6.1-Sol**. Every model in the list is tagged "Codex".
  7. Click **Runtime mode** ("Supervised" by default) → **Full access**.
- **0.2.6 differences:** with only Codex ready, the picker already shows a Codex model, so the pick confirms the default rather than changing it. Reasoning effort shows "Low".
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - Driver label "Codex" (S:apps/web/src/components/settings/providerDriverMeta.ts:52).

### 05 Plan with sw-increment (0:39-0:50, APP)

- **VO:** "Type a dollar sign, pick sw-increment, and describe the change. Codex writes spec.md: acceptance criteria and a task with its files and test."
- **Step chip:** $ → Sw Increment → describe the change → Enter
- **Shot (APP):**
  1. Click the composer (a new chat's placeholder is "Ask for changes, send follow-ups, or attach images").
  2. Type `$`.
  3. Check: "Sw Increment" (0.2.6 lists the 11 skills title-cased, Sw Auto … Sw Team, each tagged "Repo Skill").
  4. Click **Sw Increment**.
  5. Type `Personal greeting: greet(name) returns "Hello, <name>!" and greet() still returns "Hello, world!". Use Ada in examples. Plan only, no code yet.` (shown at 2x).
  6. Press Enter.
  7. Speed-ramp 8x until the reply ends, with the "Sped up 8×" chip; about 20 s of the 50 s turn is jump-cut.
  8. Highlight the reply: "Created 0001 Personal greeting spec.md", the acceptance criteria and `npm test`.
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - Codex lists skills through its app server with the project folder as cwd (S:apps/server/src/provider/CodexProvider.ts:530).
  - In the take, Codex wrote `0001-personal-greeting/spec.md` with three acceptance criteria and one task, T-01 (Files `src/greeting.js`, `test/greeting.test.js`, `README.md`; Test `npm test`), in 50 s. A rehearsal wrote two tasks.

### 06 Build with sw-do (0:50-1:00.7, APP)

- **VO:** "Then send sw-do. Codex claims the task, changes the code, and runs the test. The task is marked done only when the test passes."
- **Step chip:** $ → Sw Do → claim → edit → test → done
- **Shot (APP):**
  1. Type `$`, click **Sw Do** (not Sw Done). The follow-up placeholder is "Ask anything, @tag files/folders, $use skills, or / for commands".
  2. Type `Do T-01, then stop. I will close the increment myself.`, press Enter.
  3. Speed-ramp 8x until the turn ends, with the "Sped up 8×" chip; about 28 s of the 47 s turn is jump-cut.
  4. Expand **Worked for 47s** and **Ran 3 commands**, and hold on: the commit, `specweave task done T-01 0001 --run "npm test"`, `git merge --ff-only inc/0001-codex`, and "T-01 is committed and marked done."
- **Sources:**
  - `specweave task done --run` exits 5 and records nothing when the command fails; on exit 0 it records the command and log as evidence (W:src/cli/commands/task.ts:8,64,207-209).
  - `sw-do`: "claim, implement inside the task's Files, test, commit, done with evidence" (W:skills/sw-do/SKILL.md:2).
  - In the take Codex worked on branch `inc/0001-codex` in a sibling worktree, then fast-forwarded `main`; every ledger line is by `codex@demo`.

### 07 Review the diff (1:00.7-1:08.7, APP)

- **VO:** "Click Open diff to review the code, the test, and the ledger line that records who finished the task."
- **Step chip:** Open diff → code · test · ledger.jsonl
- **Shot (APP):**
  1. Click **Open diff** on the last turn's "8 changed files" card. The diff panel opens on "Latest turn".
  2. Click **Expand src/greeting.js**, then **Expand test/greeting.test.js**, then the `ledger.jsonl` row.
  3. Highlight the `done` line: `"by":"codex@demo"` with its `npm test → exit 0` evidence.
- **Sources:**
  - Ledger lines: one JSON object per line, `done` carries evidence (generated AGENTS.md, Rules).
  - Agent id is `SPECWEAVE_AGENT`, else `<tool>@<host>`; `SPECWEAVE_TOOL` and `SPECWEAVE_HOST` override detection (W:src/core/tasks/ledger.ts:95-133).

### 08 Outro (1:08.7-1:12.7, MG)

- **VO:** "Next, sw-done verifies and closes the increment."
- **Card:** three lines: "Next: $sw-done · verify and close" / "SpecWithCode is in private pilot · spec-weave.com/studio" / "All tutorials · spec-weave.com/tutorials".
- **Sources:**
  - `sw-done`: "every task done or skipped, specweave verify green, a fresh-context review, then specweave complete" (W:skills/sw-done/SKILL.md:2).
  - Private pilot, no public download: W:docs-site/src/pages/studio.tsx:19,22.

## Narration (read straight through)

Codex in SpecWithCode: plan, build, review.
In your repo, run specweave init. It adds AGENTS.md and eleven SpecWeave skills.
Open SpecWithCode. In setup, keep this computer and click Continue. On the Codex card, click Continue with ChatGPT, or run codex login, then Use existing CLI. The card says Ready to code.
Add the repo: the plus next to Projects, Local folder, then its path. A new chat opens. Pick Codex in the model picker, and set Full access for this demo.
Type a dollar sign, pick sw-increment, and describe the change. Codex writes spec.md: acceptance criteria and a task with its files and test.
Then send sw-do. Codex claims the task, changes the code, and runs the test. The task is marked done only when the test passes.
Click Open diff to review the code, the test, and the ledger line that records who finished the task.
Next, sw-done verifies and closes the increment.

The TTS input spells some words out (for example "Spec With Code", "Chat G P T", "C L I"); see `scripts/vo-lines.json`. Lines 02, 07 and 08 are word for word episode 1's, so their audio is reused. Narration is AI-generated with Anton's cloned voice; there is no music bed.

## Codex recording notes

Shared rules (demo home, environment, credentials, rename) are in SERIES.md. These apply to this episode only.

1. **Sign-in.** Never click Continue with ChatGPT or run `codex login` on camera. `scripts/codex-auth.sh <demo HOME>` copies this Mac's `~/.codex/auth.json` into the demo HOME (mode 600, refresh token blanked so the real login is never rotated) and prints nothing secret. It runs as `offCameraBeforeClick` on the Use existing CLI click: run it any earlier and the server picks the file up on its own, the card turns Ready without the click and shows a masked "Signed in as" account row. Delete `<demo HOME>/.codex/auth.json` after the take.
2. **Other agents.** `serve.sh` and the seeded `.zprofile` set PATH to the shim, Node and system folders only. Without that, `/etc/paths.d` added Homebrew and the Claude card read "Unavailable · installed but failed to run" in the Codex episode; with it, it reads "Not found".
3. **Long turns.** Plan took 50 s and build 47 s. Both are shown at 8x with jump cuts inside the turn so the shared beats keep episode 1's lengths.
4. **Branching.** Codex built in a sibling worktree on `inc/0001-codex` and fast-forwarded `main`; the chat stays on "Current checkout".
5. **Plan shape.** Codex's plan reply has no AC ids on screen (it lists the criteria as bullets), so the take checks for "spec.md", not "AC-01". The number of tasks varies between runs.
6. **`$` key.** The skill trigger is any currency symbol starting a token (S:apps/web/src/composer-logic.ts:273). Type `$` on a US layout.

## Not verified

Shared gaps are listed in SERIES.md. Specific to this episode:

- The Continue with ChatGPT browser flow (never clicked, by design).
- What a signed-in card looks like when the CLI login is found at startup: it shows a masked "Signed in as" row, which this episode avoids.
- The "Hosts & capacity" panel on the Overview at the end of beat 03 shows a "Codex 1" usage row (7-day window, percent used) from the real Codex login; it carries no account name or email.

## Captures

| File | Command | Exit | Time | Use |
|---|---|---|---|---|
| `captures/01-specweave-version.json` | `specweave --version` | 0 | 2.4 s | evidence |
| `captures/02-specweave-init.json` | `specweave init . --quick --adapter codex` | 0 | 2.2 s | evidence |
| `captures/03-ls-skills.json` | `ls .agents/skills .claude/skills` | 0 | 0.0 s | evidence |
| `captures/04-codex-skills.json` | `codex debug prompt-input \| grep -oE -- '- sw-[a-z]+:\|[^ `]*/\.agent…` | 0 | 3.0 s | evidence |
| `captures/05-codex-exec-sw-increment-do.json` | `codex exec -s workspace-write "\$sw-increment personal greeting: gr…` | timed out | 180.0 s | evidence |
| `captures/06-task-list.json` | `specweave task list` | 0 | 2.0 s | evidence |
| `captures/07-git-log.json` | `git log --oneline` | 0 | 0.0 s | evidence |
| `captures/08-verify.json` | `specweave verify 0001` | 0 | 2.2 s | evidence |
| `captures/09-spec-acs-tasks.json` | `grep -E '^# \|^- \[.\] AC-\|^### T-\|^- AC:' .specweave/increments/000…` | 0 | 0.0 s | evidence |
| `captures/10-specweave-init-quick.json` | `specweave init . --quick` | 0 | – | on screen |
