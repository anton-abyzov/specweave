# Claude Code in SpecWithCode

Episode 1 of 6 in **Your agent in SpecWithCode**. Series rules, shared sources, visual system and recording plan: [../SERIES.md](../SERIES.md). How it was made: [../PIPELINE.md](../PIPELINE.md).

**Promise:** in 67 seconds, connect Claude Code to SpecWithCode, plan one small change with a SpecWeave skill, build it, and review the code, the test and the ledger.

- Audience: a developer who already uses Claude Code.
- Runtime: 66.7 s, published 2026-10-11 as `docs-site/static/video/tutorials/claude-code.mp4`. Narration: 152 spoken words.
- Demo repo: `greet-app` (seed in SERIES.md). Task: "Personal greeting": `greet(name)` returns `Hello, <name>!`, `greet()` still returns `Hello, world!`.
- Source keys: `S:` = specweave-studio at `618bfeca` (v0.2.4), `path:line`. `C:NN` = `captures/NN-*.json` (real runs, 2026-10-11, specweave 3.0.12, Node 22.20.0; home, user and host redacted). `W:` = this specweave repo. Labels used by every episode are sourced once in SERIES.md, "Shared beats".
- Labels checked on the running SpecWithCode 0.2.6 build (2026-10-11). Where 0.2.6 differs from the v0.2.4 source lines below, the 0.2.6 label is used and the difference is noted.

## Beats

| # | Time | Kind | Chapter | Beat |
|---|---|---|---|---|
| 01 | 0:00-0:04 | MG | Intro | Intro (shared) |
| 02 | 0:04-0:10.5 | TERM | Set up the repo | Add SpecWeave to the repo (shared) |
| 03 | 0:10.5-0:22 | APP | Connect Claude Code | Connect Claude Code |
| 04 | 0:22-0:33 | APP | Add the project | Add the project and open a chat (shared) |
| 05 | 0:33-0:44 | APP | Plan | Plan with sw-increment (shared) |
| 06 | 0:44-0:54.7 | APP | Build | Build with sw-do (shared) |
| 07 | 0:54.7-1:02.7 | APP | Review | Review the diff (shared) |
| 08 | 1:02.7-1:06.7 | MG | Next | Outro (shared) |

Total: 66.7 s. Executable steps for every APP beat are in `SHOTLIST.json`; cuts, speed ramps and highlights are in `edit.json`.

### 01 Intro (0:00-0:04, MG)

- **VO:** "Claude Code in SpecWithCode: plan, build, review."
- **Card:** eyebrow "SpecWithCode tutorial 01", title "Claude Code in SpecWithCode", subtitle "Plan, build and review one task. The plan stays in your repo.".
- **Sources:**
  - Shared card, see SERIES.md "Intro and outro".

### 02 Add SpecWeave to the repo (0:04-0:10.5, TERM)

- **VO:** "In your repo, run specweave init. It adds AGENTS.md and eleven SpecWeave skills."
- **Step chip:** In your repo: specweave init . --quick
- **Shot (TERM):**
  1. Typeset `specweave init . --quick` from `captures/03-specweave-init.json`, prompt `greet-app %`. Show `✓ AGENTS.md created`, `✓ 11 skills installed as sw-* in .claude/skills/ and .agents/skills/`.
- **Sources:**
  - C:03 (exit 0): the command and both lines, stdout lines 12 and 16.
  - Claude reads project skills from `.claude/skills` only (S:apps/server/src/provider/Drivers/ClaudeSkills.ts:4-9).

### 03 Connect Claude Code (0:10.5-0:22, APP)

- **VO:** "Open SpecWithCode. In setup, keep this computer and click Continue. The Claude card should say Ready to code. If it doesn't, run claude auth login in a terminal first."
- **Step chip:** Setup → Continue → Claude: Ready to code → Continue
- **Shot (APP):**
  1. Check: "Connect your computers" (the wizard opens on its Connect step; the steps are Connect, Agents, Projects).
  2. Check: "Demo Mac" (the computer row; named by the scutil shim, so nothing is blurred).
  3. Click **Continue**.
  4. Check: "Connect your agents".
  5. Hover the **Claude** card; it shows "Ready to code." and "Ready".
  6. Click **Continue**.
  7. Click **Do not import projects** when it is offered (0.2.6 shows "No existing Claude Code or Codex projects found." in a fresh HOME), then **Continue** when present.
- **0.2.6 differences:** the card is labelled "Claude", not "Claude Code". The Sign in insert was dropped: on 0.2.6 a signed-out Claude card showed "Needs attention" rather than a Sign in button, so the VO points to `claude auth login` in a terminal instead.
- **Sources:**
  - Stages (S:apps/web/src/components/onboarding/WelcomeWizard.tsx:110), "Connect your computers" (:338), Continue (:435), "Connect your agents" (:665), "Ready to code." (:974), "Do not import projects" (:1531).
  - Login command `claude auth login` (S:apps/web/src/onboarding/providerReadiness.logic.ts:114-119).
  - Claude is on by default (S:packages/contracts/src/settings.ts:673-676).

### 04 Add the project and open a chat (0:22-0:33, APP)

- **VO:** "Add the repo: the plus next to Projects, Local folder, then its path. A new chat opens. Pick Claude in the model picker, and set Full access for this demo."
- **Step chip:** + → Local folder → ~/greet-app · Claude Sonnet 5.5 · Full access
- **Shot (APP):**
  1. Click **Add project** (the + next to Projects).
  2. Click **Local folder**.
  3. Type `~/greet-app` into "Enter path (e.g. ~/projects/my-app)".
  4. Press Enter.
  5. Check: "What should we build in greet-app?" (adding the folder opens a new chat; there is no separate New chat click on 0.2.6).
  6. Leave the workspace on "Current checkout".
  7. Click the model picker (labelled with the current model, "Claude Opus 5.5" by default) → **Claude Sonnet 5.5**.
  8. Click **Runtime mode** ("Supervised" by default) → **Full access**.
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - "Claude Sonnet 5.5" (S:apps/server/src/provider/model-manifest.json:695-696); driver label "Claude" (S:apps/web/src/components/settings/providerDriverMeta.ts:56-57).

### 05 Plan with sw-increment (0:33-0:44, APP)

- **VO:** "Type a dollar sign, pick sw-increment, and describe the change. Claude writes spec.md: acceptance criteria and a task with its files and test."
- **Step chip:** $ → Sw Increment → describe the change → Enter
- **Shot (APP):**
  1. Click the composer (a new chat's placeholder is "Ask for changes, send follow-ups, or attach images").
  2. Type `$`.
  3. Check: "Sw Increment" (0.2.6 lists the 11 skills title-cased, Sw Auto … Sw Team, each tagged "Project Skill").
  4. Click **Sw Increment**.
  5. Type `Personal greeting: greet(name) returns "Hello, <name>!" and greet() still returns "Hello, world!". Use Ada in examples. Plan only, no code yet.`.
  6. Press Enter.
  7. Speed-ramp 8x until the reply ends, with the "Sped up 8×" chip.
  8. Highlight the reply's AC-01, AC-02 and T-01 (files and `npm test`).
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - `$skill` is sent to Claude as `/skill` (S:apps/server/src/provider/Drivers/ClaudeSkillDispatch.ts:2-9).
  - In the take, Claude wrote `0001-personal-greeting/spec.md` with AC-01, AC-02 and T-01 in 19 s.

### 06 Build with sw-do (0:44-0:54.7, APP)

- **VO:** "Then send sw-do. Claude claims the task, changes the code, and runs the test. The task is marked done only when the test passes."
- **Step chip:** $ → Sw Do → claim → edit → test → done
- **Shot (APP):**
  1. Type `$`, click **Sw Do** (not Sw Done).
  2. Type `Do T-01, then stop. I will close the increment myself.`, press Enter.
  3. Speed-ramp 6x until the turn ends, with the "Sped up 6×" chip.
  4. Expand **Worked for …** and hold on the steps: `specweave task claim T-01`, the edits to `src/greeting.js`, `test/greeting.test.js` and `README.md`, then `npm test` and the commit.
- **Sources:**
  - `specweave task done --run` exits 5 and records nothing when the command fails; on exit 0 it records the command and log as evidence (W:src/cli/commands/task.ts:8,64,207-209).
  - `sw-do`: "claim, implement inside the task's Files, test, commit, done with evidence" (W:skills/sw-do/SKILL.md:2).

### 07 Review the diff (0:54.7-1:02.7, APP)

- **VO:** "Click Open diff to review the code, the test, and the ledger line that records who finished the task."
- **Step chip:** Open diff → code · test · ledger.jsonl
- **Shot (APP):**
  1. Click **Open diff** on the last turn's "6 changed files" card. The diff panel opens on "Latest turn".
  2. Click **Expand src/greeting.js**, then **Expand test/greeting.test.js**, then the `ledger.jsonl` row. (Clicking a file name opens the file instead of expanding it.)
  3. Highlight the `done` line: `"by":"claude@demo"` with its `npm test` evidence.
- **Sources:**
  - Ledger lines: one JSON object per line, `done` carries evidence (generated AGENTS.md, Rules).
  - Agent id is `SPECWEAVE_AGENT`, else `<tool>@<host>`; `SPECWEAVE_TOOL` and `SPECWEAVE_HOST` override detection (W:src/core/tasks/ledger.ts:95-133).

### 08 Outro (1:02.7-1:06.7, MG)

- **VO:** "Next, sw-done verifies and closes the increment."
- **Card:** three lines: "Next: $sw-done · verify and close" / "SpecWithCode is in private pilot · spec-weave.com/studio" / "All tutorials · spec-weave.com/tutorials".
- **Sources:**
  - `sw-done`: "every task done or skipped, specweave verify green, a fresh-context review, then specweave complete" (W:skills/sw-done/SKILL.md:2).
  - Private pilot, no public download: W:docs-site/src/pages/studio.tsx:19,22.

## Narration (read straight through)

Claude Code in SpecWithCode: plan, build, review.
In your repo, run specweave init. It adds AGENTS.md and eleven SpecWeave skills.
Open SpecWithCode. In setup, keep this computer and click Continue. The Claude card should say Ready to code. If it doesn't, run claude auth login in a terminal first.
Add the repo: the plus next to Projects, Local folder, then its path. A new chat opens. Pick Claude in the model picker, and set Full access for this demo.
Type a dollar sign, pick sw-increment, and describe the change. Claude writes spec.md: acceptance criteria and a task with its files and test.
Then send sw-do. Claude claims the task, changes the code, and runs the test. The task is marked done only when the test passes.
Click Open diff to review the code, the test, and the ledger line that records who finished the task.
Next, sw-done verifies and closes the increment.

The TTS input spells some words out (for example "Spec With Code", "S W increment"); see `scripts/vo-lines.json`. Narration is AI-generated with Anton's cloned voice; there is no music bed.

## Claude Code recording notes

Shared rules (demo home, environment, credentials, rename) are in SERIES.md. These apply to this episode only.

1. **Sign-in.** Never run `claude auth login` or `claude auth status` on camera: status prints the account email and org (C:06, redacted, reference only). The demo HOME was signed in off camera by writing only the current access token to `<demo HOME>/.claude/.credentials.json` (no refresh token), and deleting that file after the take. See PIPELINE.md.
2. **Skills folder.** Claude ignores `.agents/skills`; only `.claude/skills` entries appear in its `$` menu (S:…/ClaudeSkills.ts:7-9). `specweave init` writes both, so nothing extra is needed.
3. **"All plugins ready".** `specweave init` prints `✔ All plugins ready` (C:03) without installing the `sw@specweave` Claude plugin. Never typeset that line. The project skills used here need no plugin.
4. **Host name.** The Claude Code login shell puts its own PATH first, so the scutil shim also needs `<demo HOME>/.zprofile` prepending the shim directory; without it the host name came back in the computer label.
5. **Old sandbox.** `~/specweave-tutorial-sandbox/claude-code` holds an uncommitted `0001-personal-greeting` from C:07. Record from a fresh seed copy, never from the sandbox.

## Not verified

Shared gaps are listed in SERIES.md. Specific to this episode:

- What a signed-out Claude card offers on 0.2.6 beyond "Needs attention" (no Sign in insert was recorded).
- The "Hosts & capacity" panel in beat 04 shows a stale "Codex 1" usage row in the demo account; it carries no account name, but a later episode may want to hide it.

## Captures

| File | Command | Exit | Time | Use |
|---|---|---|---|---|
| `captures/01-git-init.json` | `git init -q -b main && git add -A && git -c user.name="Demo User" -…` | 0 | 1.0 s | evidence |
| `captures/02-specweave-version.json` | `specweave --version` | 0 | 2.1 s | evidence |
| `captures/03-specweave-init.json` | `specweave init . --quick` | 0 | 0.5 s | on screen |
| `captures/04-ls-skills.json` | `ls .claude/skills .agents/skills` | 0 | 0.0 s | evidence |
| `captures/05-commit-specweave.json` | `git add -A && git -c user.name="Demo User" -c user.email=<redacted-…` | 0 | 1.3 s | evidence |
| `captures/06-claude-auth-status.json` | `claude --version && claude auth status` | 0 | 0.5 s | evidence |
| `captures/07-claude-sw-increment.json` | `claude -p --model sonnet --max-turns 25 --permission-mode acceptEdi…` | 0 | 24.3 s | evidence |
| `captures/08-specweave-task-list.json` | `specweave task list` | 0 | 0.7 s | evidence |
| `captures/09-spec-md.json` | `git status --short && sed -n "1,40p" .specweave/increments/0001-per…` | 0 | 0.0 s | evidence |
