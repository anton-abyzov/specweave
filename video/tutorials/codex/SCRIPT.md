# Codex in SpecWithCode

Episode 2 of 6 in **Your agent in SpecWithCode**. Series rules, shared sources, visual system and recording plan: [../SERIES.md](../SERIES.md).

**Promise:** in 80 seconds, connect Codex to SpecWithCode, plan one small change with a SpecWeave skill, build it, and review the code, the test and the ledger.

- Audience: a developer who already uses Codex.
- Runtime: 80 s. Narration: 175 spoken words, about 70.0 s at 150 wpm.
- Demo repo: `greet-app` (seed in SERIES.md). Task: "Personal greeting": `greet(name)` returns `Hello, <name>!`, `greet()` still returns `Hello, world!`.
- Source keys: `S:` = specweave-studio at `618bfeca` (v0.2.4), `path:line`. `C:NN` = `captures/NN-*.json` (real runs, 2026-10-11, specweave 3.0.12, Node 22.20.0; home, user and host redacted). `W:` = this specweave repo. Labels used by every episode are sourced once in SERIES.md, "Shared beats".
- App name: written as SpecWithCode. v0.2.4 still renders "SpecWeave Studio"; record only on the renamed build.

## Beats

| # | Time | Kind | Chapter | Beat | Spoken |
|---|---|---|---|---|---|
| 01 | 0:00-0:04 | MG | Intro | Intro (shared) | 3.2 s / 4 s |
| 02 | 0:04-0:14 | TERM | Set up the repo | Add SpecWeave to the repo (shared) | 8.8 s / 10 s |
| 03 | 0:14-0:29 | APP | Connect Codex | Connect Codex | 13.6 s / 15 s |
| 04 | 0:29-0:42 | APP | Add the project | Add the project and open a chat (shared) | 11.6 s / 13 s |
| 05 | 0:42-0:55 | APP | Plan | Plan with sw-increment (shared) | 11.2 s / 13 s |
| 06 | 0:55-1:07 | APP | Build | Build with sw-do (shared) | 10.4 s / 12 s |
| 07 | 1:07-1:16 | APP | Review | Review the diff (shared) | 7.6 s / 9 s |
| 08 | 1:16-1:20 | MG | Next | Outro (shared) | 3.6 s / 4 s |

Total: 80 s.

### 01 Intro (0:00-0:04, MG)

- **VO:** "Codex in SpecWithCode: plan, build, review."
- **Card:** eyebrow "SpecWithCode tutorial 02", title "Codex in SpecWithCode", subtitle "Plan, build and review one task. The plan stays in your repo.".
- **Sources:**
  - Shared card, see SERIES.md "Intro and outro".

### 02 Add SpecWeave to the repo (0:04-0:14, TERM)

- **VO:** "In your repo, run specweave init with the Codex adapter. It adds AGENTS.md and eleven SpecWeave skills."
- **Step chip:** In your repo: specweave init . --quick --adapter codex
- **Shot (TERM):**
  1. Typeset `specweave init . --quick --adapter codex` from `captures/02-specweave-init.json`, prompt `greet-app %`. Show `✓ AGENTS.md created`, `✓ 11 skills installed as sw-* in .claude/skills/ and .agents/skills/`.
- **Sources:**
  - C:02 (exit 0): the command and both lines, stdout lines 7 and 40.
  - Codex reads the project's `.agents/skills`: run in the sandbox, Codex's own prompt input lists that folder and the 11 `sw-*` skills (C:04).

### 03 Connect Codex (0:14-0:29, APP)

- **VO:** "Open SpecWithCode. In setup, keep this computer and click Continue. On the Codex card, click Continue with ChatGPT, or Use existing CLI if you already run Codex."
- **Step chip:** Setup → Continue → Codex: Continue with ChatGPT (or Use existing CLI) → Continue → Do not import projects
- **Shot (APP):**
  1. Check: "Set up SpecWithCode" (v0.2.4 says "Set up SpecWeave Studio").
  2. Blur the computer row label (host name).
  3. Click **Continue**.
  4. Check: "Code with your ChatGPT subscription.".
  5. Hover **Use existing CLI** (pre-sign-in take).
  6. Click **Continue with ChatGPT**.
  7. Hard cut: browser sign-in happens off camera; never record the OpenAI page or the account.
  8. Check: "Ready".
  9. Click **Continue**.
  10. Click **Do not import projects**.
- **Sources:**
  - "Connect your agents" (S:apps/web/src/components/onboarding/WelcomeWizard.tsx:665-666); Codex uses `CodexSetupSection` in setup (:930-941).
  - "Code with your ChatGPT subscription." (S:apps/web/src/components/settings/CodexSetupSection.tsx:93,807), "Continue with ChatGPT" (:115,835), "Use existing CLI" (:122,876), "Ready" (:100,814), "Managed by SpecWithCode · v<ver>" (:580, renamed). Managed Codex is 0.156.1 (S:apps/server/src/provider/CodexInstallation.ts:59).
  - Existing CLI that is signed out: "Codex CLI is not authenticated. Run `codex login` and try again." (S:apps/server/src/provider/CodexProvider.ts:692).
  - Codex is on by default (S:packages/contracts/src/settings.ts:601-602).

### 04 Add the project and open a chat (0:29-0:42, APP)

- **VO:** "Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick Codex in the model picker, and set Full access for this demo."
- **Step chip:** Projects + → Local folder → ~/greet-app · New chat → Codex · Full access
- **Shot (APP):**
  1. Click **Add project** (the + next to Projects; tooltip "New project or assistant").
  2. Click **Local folder** ("New project" and "Personal assistant" rows can sit above it).
  3. Type `~/greet-app` into "Enter path (e.g. ~/projects/my-app)".
  4. Press Enter.
  5. Check: "greet-app" (listed under Projects).
  6. Click **New chat**.
  7. Check: "What should we build in greet-app?".
  8. Click the model picker (labelled with the current model).
  9. Click the Providers rail → Codex → the default Codex model.
  10. Click the Runtime mode → Full access.
  11. Check: "Current checkout" (leave the workspace on the current checkout).
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - Driver label "Codex" (S:apps/web/src/components/settings/providerDriverMeta.ts:52).

### 05 Plan with sw-increment (0:42-0:55, APP)

- **VO:** "Type a dollar sign, pick sw-increment, and describe the change. Codex writes spec.md: acceptance criteria and a task with its files and test."
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
  - Codex lists skills through its app server with the project folder as cwd (S:apps/server/src/provider/CodexProvider.ts:530).
  - The same task through `codex exec` wrote AC-01, AC-02 and T-01 (C:09).

### 06 Build with sw-do (0:55-1:07, APP)

- **VO:** "Then send sw-do. Codex claims the task, changes the code, and runs the test. The task is marked done only when the test passes."
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
  - Real run (C:05, one combined `$sw-increment … Then $sw-do it.` prompt): commits `31a4a7d` and `c5b3b55` (C:07), T-01 done by `codex@<host>` with `npm test → exit 0` evidence (C:06), `specweave verify 0001`: ACs 2/2, PASS (C:08).

### 07 Review the diff (1:07-1:16, APP)

- **VO:** "Click Open diff to review the code, the test, and the ledger line that records who finished the task."
- **Step chip:** Open diff → code · test · ledger.jsonl
- **Shot (APP):**
  1. Click **Open diff** (on the last turn's "N changed files" card; tooltip "Open the full diff").
  2. Step through `src/greeting.js`, `test/greeting.test.js`, `.specweave/increments/0001-…/ledger.jsonl`.
  3. Highlight in ledger.jsonl: `"e":"done" with "by":"codex@demo" and "evidence"`.
- **Sources:**
  - Ledger lines: one JSON object per line, `done` carries evidence (generated AGENTS.md, Rules).
  - Agent id is `SPECWEAVE_AGENT`, else `<tool>@<host>`; `SPECWEAVE_TOOL` and `SPECWEAVE_HOST` override detection (W:src/core/tasks/ledger.ts:95-133).

### 08 Outro (1:16-1:20, MG)

- **VO:** "Next, sw-done verifies and closes the increment."
- **Card:** three lines: "Next: $sw-done · verify and close" / "SpecWithCode is in private pilot · spec-weave.com/studio" / "All tutorials · spec-weave.com/tutorials".
- **Sources:**
  - `sw-done`: "every task done or skipped, specweave verify green, a fresh-context review, then specweave complete" (W:skills/sw-done/SKILL.md:2).
  - Private pilot, no public download: W:docs-site/src/pages/studio.tsx:19,22.

## Narration (read straight through)

Codex in SpecWithCode: plan, build, review.
In your repo, run specweave init with the Codex adapter. It adds AGENTS.md and eleven SpecWeave skills.
Open SpecWithCode. In setup, keep this computer and click Continue. On the Codex card, click Continue with ChatGPT, or Use existing CLI if you already run Codex.
Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick Codex in the model picker, and set Full access for this demo.
Type a dollar sign, pick sw-increment, and describe the change. Codex writes spec.md: acceptance criteria and a task with its files and test.
Then send sw-do. Codex claims the task, changes the code, and runs the test. The task is marked done only when the test passes.
Click Open diff to review the code, the test, and the ledger line that records who finished the task.
Next, sw-done verifies and closes the increment.

## Codex recording notes

Shared rules (demo home, environment, credentials, rename) are in SERIES.md. These apply to this episode only.

1. **Long runs.** The captured `codex exec` run passed 3 minutes and was killed in its closing review step, after the work was committed (C:05-C:08). Speed-ramp the plan and build beats; never show waiting.
2. **Branching.** In the capture Codex tried to create a branch, the `workspace-write` sandbox blocked it, and it committed on `main`. Keep the workspace on **Current checkout** (S:apps/web/src/components/BranchToolbar.logic.ts:98).
3. **Version badge.** Managed Codex is 0.156.1; this Mac's CLI is 0.162.1. Record the managed path so no version advisory shows.
4. **Stale init text.** `specweave init` still mentions `specweave validate`, which does not exist in 3.0.12, and `init --help` lists only claude, cursor, copilot and generic for `--adapter` although `codex` works (C:02). Show neither.
5. **`$` key.** The skill trigger is any currency symbol starting a token (S:apps/web/src/composer-logic.ts:273). Type `$` on a US layout.

## Not verified

Shared gaps are listed in SERIES.md. Specific to this episode:

- The Codex `$` menu was not rendered; C:04 shows Codex reads the project skills, and the driver asks for the same list (S:…/CodexProvider.ts:530).
- C:05 ran plan and build in one prompt; the episode sends `$sw-increment` and `$sw-do` separately, which was not run.

## Captures

| File | Command | Exit | Time | Use |
|---|---|---|---|---|
| `captures/01-specweave-version.json` | `specweave --version` | 0 | 2.4 s | evidence |
| `captures/02-specweave-init.json` | `specweave init . --quick --adapter codex` | 0 | 2.2 s | on screen |
| `captures/03-ls-skills.json` | `ls .agents/skills .claude/skills` | 0 | 0.0 s | evidence |
| `captures/04-codex-skills.json` | `codex debug prompt-input \| grep -oE -- '- sw-[a-z]+:\|[^ `]*/\.agent…` | 0 | 3.0 s | evidence |
| `captures/05-codex-exec-sw-increment-do.json` | `codex exec -s workspace-write "\$sw-increment personal greeting: gr…` | timed out | 180.0 s | evidence |
| `captures/06-task-list.json` | `specweave task list` | 0 | 2.0 s | evidence |
| `captures/07-git-log.json` | `git log --oneline` | 0 | 0.0 s | evidence |
| `captures/08-verify.json` | `specweave verify 0001` | 0 | 2.2 s | evidence |
| `captures/09-spec-acs-tasks.json` | `grep -E '^# \|^- \[.\] AC-\|^### T-\|^- AC:' .specweave/increments/000…` | 0 | 0.0 s | evidence |
