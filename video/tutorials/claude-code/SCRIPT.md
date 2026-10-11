# Claude Code in SpecWithCode

Episode 1 of 6 in **Your agent in SpecWithCode**. Series rules, shared sources, visual system and recording plan: [../SERIES.md](../SERIES.md).

**Promise:** in 79 seconds, connect Claude Code to SpecWithCode, plan one small change with a SpecWeave skill, build it, and review the code, the test and the ledger.

- Audience: a developer who already uses Claude Code.
- Runtime: 79 s. Narration: 174 spoken words, about 69.6 s at 150 wpm.
- Demo repo: `greet-app` (seed in SERIES.md). Task: "Personal greeting": `greet(name)` returns `Hello, <name>!`, `greet()` still returns `Hello, world!`.
- Source keys: `S:` = specweave-studio at `618bfeca` (v0.2.4), `path:line`. `C:NN` = `captures/NN-*.json` (real runs, 2026-10-11, specweave 3.0.12, Node 22.20.0; home, user and host redacted). `W:` = this specweave repo. Labels used by every episode are sourced once in SERIES.md, "Shared beats".
- App name: written as SpecWithCode. v0.2.4 still renders "SpecWeave Studio"; record only on the renamed build.

## Beats

| # | Time | Kind | Chapter | Beat | Spoken |
|---|---|---|---|---|---|
| 01 | 0:00-0:04 | MG | Intro | Intro (shared) | 3.6 s / 4 s |
| 02 | 0:04-0:12 | TERM | Set up the repo | Add SpecWeave to the repo (shared) | 7.2 s / 8 s |
| 03 | 0:12-0:28 | APP | Connect Claude Code | Connect Claude Code | 14.4 s / 16 s |
| 04 | 0:28-0:41 | APP | Add the project | Add the project and open a chat (shared) | 11.6 s / 13 s |
| 05 | 0:41-0:54 | APP | Plan | Plan with sw-increment (shared) | 11.2 s / 13 s |
| 06 | 0:54-1:06 | APP | Build | Build with sw-do (shared) | 10.4 s / 12 s |
| 07 | 1:06-1:15 | APP | Review | Review the diff (shared) | 7.6 s / 9 s |
| 08 | 1:15-1:19 | MG | Next | Outro (shared) | 3.6 s / 4 s |

Total: 79 s.

### 01 Intro (0:00-0:04, MG)

- **VO:** "Claude Code in SpecWithCode: plan, build, review."
- **Card:** eyebrow "SpecWithCode tutorial 01", title "Claude Code in SpecWithCode", subtitle "Plan, build and review one task. The plan stays in your repo.".
- **Sources:**
  - Shared card, see SERIES.md "Intro and outro".

### 02 Add SpecWeave to the repo (0:04-0:12, TERM)

- **VO:** "In your repo, run specweave init. It adds AGENTS.md and eleven SpecWeave skills."
- **Step chip:** In your repo: specweave init . --quick
- **Shot (TERM):**
  1. Typeset `specweave init . --quick` from `captures/03-specweave-init.json`, prompt `greet-app %`. Show `✓ AGENTS.md created`, `✓ 11 skills installed as sw-* in .claude/skills/ and .agents/skills/`.
- **Sources:**
  - C:03 (exit 0): the command and both lines, stdout lines 12 and 16.
  - Claude reads project skills from `.claude/skills` only (S:apps/server/src/provider/Drivers/ClaudeSkills.ts:4-9).

### 03 Connect Claude Code (0:12-0:28, APP)

- **VO:** "Open SpecWithCode. In setup, keep this computer and click Continue. The Claude Code card should say Ready to code. If it says Sign in, click it, then press Enter to run claude auth login."
- **Step chip:** Setup → Continue → Claude Code: Ready to code (or Sign in) → Continue → Do not import projects
- **Shot (APP):**
  1. Check: "Set up SpecWithCode" (v0.2.4 says "Set up SpecWeave Studio"; steps Connect, Agents, Projects).
  2. Check: "Connect your computers".
  3. Blur the computer row label (host name).
  4. Click **Continue**.
  5. Check: "Connect your agents".
  6. Hover **Claude Code card**; it shows "Ready to code.".
  7. Insert, 3 s: second take where the card shows Sign in: click it; the terminal opens with `claude auth login` typed, not sent. Cut before Enter.
  8. Click **Continue**.
  9. Click **Do not import projects**.
- **Sources:**
  - Title (S:apps/web/src/components/onboarding/WelcomeWizard.tsx:227), stages (:110), "Connect your computers" (:338), Continue (:435), "Connect your agents" (:665), card "Claude Code" (:960), "Ready to code." (:974), Sign in or Install (:998), command typed but not sent (:1007-1010), "Do not import projects" (:1531).
  - Login command `claude auth login` (S:apps/web/src/onboarding/providerReadiness.logic.ts:114-119).
  - Claude is on by default (S:packages/contracts/src/settings.ts:673-676).

### 04 Add the project and open a chat (0:28-0:41, APP)

- **VO:** "Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick Claude in the model picker, and set Full access for this demo."
- **Step chip:** Projects + → Local folder → ~/greet-app · New chat → Claude · Full access
- **Shot (APP):**
  1. Click **Add project** (the + next to Projects; tooltip "New project or assistant").
  2. Click **Local folder** ("New project" and "Personal assistant" rows can sit above it).
  3. Type `~/greet-app` into "Enter path (e.g. ~/projects/my-app)".
  4. Press Enter.
  5. Check: "greet-app" (listed under Projects).
  6. Click **New chat**.
  7. Check: "What should we build in greet-app?".
  8. Click the model picker (labelled with the current model).
  9. Click the Providers rail → Claude → Claude Sonnet 5.5.
  10. Click the Runtime mode → Full access.
  11. Check: "Current checkout" (leave the workspace on the current checkout).
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - "Claude Sonnet 5.5" (S:apps/server/src/provider/model-manifest.json:695-696); driver label "Claude" (S:apps/web/src/components/settings/providerDriverMeta.ts:56-57).

### 05 Plan with sw-increment (0:41-0:54, APP)

- **VO:** "Type a dollar sign, pick sw-increment, and describe the change. Claude writes spec.md: acceptance criteria and a task with its files and test."
- **Step chip:** $ → sw-increment → describe the change → Enter
- **Shot (APP):**
  1. Click the composer (placeholder "Ask anything, @tag files/folders, $use skills, or / for commands").
  2. Type `$`.
  3. Check: "Searching workspace skills..." (then the 11 sw-* skills).
  4. Click **sw-increment**.
  5. Type `Personal greeting: greet(name) returns "Hello, <name>!" and greet() still returns "Hello, world!". Use Ada in examples. Plan only, no code yet.`.
  6. Press Enter (send button aria-label "Submit message").
  7. Speed-ramp 4-8x until the reply ends, with the "sped up" chip.
  8. Highlight in .specweave/increments/0001-…/spec.md (the edit in the thread): `- [ ] AC-01 …`, `- [ ] AC-02 …`, `### T-01 …`, `- AC: … | Files: … | Test: …`.
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - `$skill` is sent to Claude as `/skill` (S:apps/server/src/provider/Drivers/ClaudeSkillDispatch.ts:2-9).
  - The same task, worded slightly differently, through `claude -p` and `/sw-increment` finished in 24 s and wrote AC-01, AC-02 and T-01 with Files `src/greeting.js, test/greeting.test.js` and Test `npm test` (C:07, C:09).

### 06 Build with sw-do (0:54-1:06, APP)

- **VO:** "Then send sw-do. Claude claims the task, changes the code, and runs the test. The task is marked done only when the test passes."
- **Step chip:** $ → sw-do → claim → edit → test → done
- **Shot (APP):**
  1. Type `$`.
  2. Click **sw-do**.
  3. Type `Do T-01, then stop. I will close the increment myself.`.
  4. Press Enter.
  5. Speed-ramp 4-8x until T-01 is done, with the "sped up" chip.
  6. Hold 1 s on specweave task claim T-01.
  7. Hold 1 s on the edit to src/greeting.js.
  8. Hold 1 s on npm test passing.
  9. Hold 1 s on specweave task done T-01 … --run "npm test".
- **Sources:**
  - `specweave task done --run` exits 5 and records nothing when the command fails; on exit 0 it records the command and log as evidence (W:src/cli/commands/task.ts:8,64,207-209).
  - `sw-do`: "claim, implement inside the task's Files, test, commit, done with evidence" (W:skills/sw-do/SKILL.md:2).
  - Not captured: no `sw-do` run was made through Claude; the recording is the evidence.

### 07 Review the diff (1:06-1:15, APP)

- **VO:** "Click Open diff to review the code, the test, and the ledger line that records who finished the task."
- **Step chip:** Open diff → code · test · ledger.jsonl
- **Shot (APP):**
  1. Click **Open diff** (on the last turn's "N changed files" card; tooltip "Open the full diff").
  2. Step through `src/greeting.js`, `test/greeting.test.js`, `.specweave/increments/0001-…/ledger.jsonl`.
  3. Highlight in ledger.jsonl: `"e":"done" with "by":"claude@demo" and "evidence"`.
- **Sources:**
  - Ledger lines: one JSON object per line, `done` carries evidence (generated AGENTS.md, Rules).
  - Agent id is `SPECWEAVE_AGENT`, else `<tool>@<host>`; `SPECWEAVE_TOOL` and `SPECWEAVE_HOST` override detection (W:src/core/tasks/ledger.ts:95-133).

### 08 Outro (1:15-1:19, MG)

- **VO:** "Next, sw-done verifies and closes the increment."
- **Card:** three lines: "Next: $sw-done · verify and close" / "SpecWithCode is in private pilot · spec-weave.com/studio" / "All tutorials · spec-weave.com/tutorials".
- **Sources:**
  - `sw-done`: "every task done or skipped, specweave verify green, a fresh-context review, then specweave complete" (W:skills/sw-done/SKILL.md:2).
  - Private pilot, no public download: W:docs-site/src/pages/studio.tsx:19,22.

## Narration (read straight through)

Claude Code in SpecWithCode: plan, build, review.
In your repo, run specweave init. It adds AGENTS.md and eleven SpecWeave skills.
Open SpecWithCode. In setup, keep this computer and click Continue. The Claude Code card should say Ready to code. If it says Sign in, click it, then press Enter to run claude auth login.
Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick Claude in the model picker, and set Full access for this demo.
Type a dollar sign, pick sw-increment, and describe the change. Claude writes spec.md: acceptance criteria and a task with its files and test.
Then send sw-do. Claude claims the task, changes the code, and runs the test. The task is marked done only when the test passes.
Click Open diff to review the code, the test, and the ledger line that records who finished the task.
Next, sw-done verifies and closes the increment.

## Claude Code recording notes

Shared rules (demo home, environment, credentials, rename) are in SERIES.md. These apply to this episode only.

1. **Sign-in insert.** Never let `claude auth login` or `claude auth status` run on camera: status prints the account email and org (C:06, redacted, reference only). Sign the demo HOME in off camera before the take and confirm with `claude auth status` off screen.
2. **Skills folder.** Claude ignores `.agents/skills`; only `.claude/skills` entries appear in its `$` menu (S:…/ClaudeSkills.ts:7-9). `specweave init` writes both, so nothing extra is needed.
3. **"All plugins ready".** `specweave init` prints `✔ All plugins ready` (C:03) without installing the `sw@specweave` Claude plugin. Never typeset that line. The project skills used here need no plugin.
4. **Version badge.** The Claude card can show a version advisory (S:apps/web/src/components/settings/ProviderInstanceCard.tsx:794). Claude Code 2.1.296 meets the manifest's `>=2.1.280`; update before recording if a newer one is out.
5. **Old sandbox.** `~/specweave-tutorial-sandbox/claude-code` holds an uncommitted `0001-personal-greeting` from C:07. Record from a fresh seed copy, never from the sandbox.

## Not verified

Shared gaps are listed in SERIES.md. Specific to this episode:

- Whether Claude Code's sign-in carries over to a demo HOME (part of it lives in the macOS keychain). Check with `claude auth status` off camera.

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
