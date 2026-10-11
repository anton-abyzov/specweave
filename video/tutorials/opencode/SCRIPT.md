# OpenCode in SpecWithCode

Episode 4 of 6 in **Your agent in SpecWithCode**. Series rules, shared sources, visual system and recording plan: [../SERIES.md](../SERIES.md).

**Promise:** in 80 seconds, connect OpenCode to SpecWithCode, plan one small change with a SpecWeave skill, build it, and review the code, the test and the ledger.

- Audience: a developer who already uses OpenCode.
- Runtime: 80 s. Narration: 179 spoken words, about 71.6 s at 150 wpm.
- Demo repo: `greet-app` (seed in SERIES.md). Task: "Personal greeting": `greet(name)` returns `Hello, <name>!`, `greet()` still returns `Hello, world!`.
- Source keys: `S:` = specweave-studio at `618bfeca` (v0.2.4), `path:line`. `C:NN` = `captures/NN-*.json` (real runs, 2026-10-11, specweave 3.0.12, Node 22.20.0; home, user and host redacted). `W:` = this specweave repo. Labels used by every episode are sourced once in SERIES.md, "Shared beats".
- App name: written as SpecWithCode. v0.2.4 still renders "SpecWeave Studio"; record only on the renamed build.

## Beats

| # | Time | Kind | Chapter | Beat | Spoken |
|---|---|---|---|---|---|
| 01 | 0:00-0:04 | MG | Intro | Intro (shared) | 3.6 s / 4 s |
| 02 | 0:04-0:12 | TERM | Set up the repo | Add SpecWeave to the repo (shared) | 7.2 s / 8 s |
| 03 | 0:12-0:18 | MG | Connect OpenCode | Sign OpenCode in to a model provider | 5.2 s / 6 s |
| 04 | 0:18-0:29 | APP | Connect OpenCode | Turn on OpenCode | 10.0 s / 11 s |
| 05 | 0:29-0:42 | APP | Add the project | Add the project and open a chat (shared) | 12.0 s / 13 s |
| 06 | 0:42-0:55 | APP | Plan | Plan with sw-increment (shared) | 11.6 s / 13 s |
| 07 | 0:55-1:07 | APP | Build | Build with sw-do (shared) | 10.8 s / 12 s |
| 08 | 1:07-1:16 | APP | Review | Review the diff (shared) | 7.6 s / 9 s |
| 09 | 1:16-1:20 | MG | Next | Outro (shared) | 3.6 s / 4 s |

Total: 80 s.

### 01 Intro (0:00-0:04, MG)

- **VO:** "OpenCode in SpecWithCode: plan, build, review."
- **Card:** eyebrow "SpecWithCode tutorial 04", title "OpenCode in SpecWithCode", subtitle "Plan, build and review one task. The plan stays in your repo.".
- **Sources:**
  - Shared card, see SERIES.md "Intro and outro".

### 02 Add SpecWeave to the repo (0:04-0:12, TERM)

- **VO:** "In your repo, run specweave init. It adds AGENTS.md and eleven SpecWeave skills."
- **Step chip:** In your repo: specweave init . --quick
- **Shot (TERM):**
  1. Typeset `specweave init . --quick` from `captures/02-specweave-init.json`, prompt `greet-app %`. Show `✓ AGENTS.md created`, `✓ 11 skills installed as sw-* in .claude/skills/ and .agents/skills/`.
- **Sources:**
  - C:02 (exit 0): the command and both lines, stdout lines 12 and 16.
  - OpenCode sees all 11 `sw-*` skills from the project folders: `opencode debug skill` (C:04, evidence only).

### 03 Sign OpenCode in to a model provider (0:12-0:18, MG)

- **VO:** "OpenCode uses its own model sign-in. Run opencode auth login once."
- **Card:** command card `opencode auth login` (the command only, no output), subtitle "Once per machine. SpecWithCode lists models from connected providers only.".
- **Step chip:** Sign in once: opencode auth login
- **Sources:**
  - `opencode auth login` (S:docs/user/install.md:123).
  - Models come only from connected upstream providers (S:apps/server/src/provider/OpenCodeProvider.ts:253-262).
  - This Mac has one connected credential (C:06, never on screen).

### 04 Turn on OpenCode (0:18-0:29, APP)

- **VO:** "Open SpecWithCode, then Settings, Providers. OpenCode is off by default: click Add provider, pick OpenCode, click Next twice, then Add instance."
- **Step chip:** Settings → Providers → Add provider → OpenCode → Next → Next → Add instance
- **Shot (APP):**
  1. Click **Settings** (sidebar footer).
  2. Click **Providers** (route /settings/providers; only Codex and Claude rows show).
  3. Click **Add provider** (the + in the section header).
  4. Check: "Add provider" (dialog title; steps Provider, Identity, Config).
  5. Click **OpenCode**.
  6. Click **Next**.
  7. Click **Next** (leave Label as is).
  8. Check: "Server URL" (leave it empty: SpecWithCode starts its own OpenCode server).
  9. Click **Add instance**.
  10. Check: "Provider instance added" (toast).
  11. Check: "1 upstream provider connected through OpenCode." (click Refresh provider status if it is stale).
- **Sources:**
  - Settings (S:apps/web/src/components/sidebar/SidebarChrome.tsx:218); Providers (S:apps/web/src/components/settings/settingsSearch.ts:98).
  - A default-off provider has no row until it is added or enabled; Codex and Claude always show (S:apps/web/src/components/settings/ProviderSettingsPanel.tsx:788-806).
  - Add provider button (S:…/ProviderSettingsPanel.tsx:1215), dialog title (S:…/AddProviderInstanceDialog.tsx:383), steps Provider, Identity, Config (S:…/AddProviderInstanceDialog.logic.ts:8), Next (:699), Add instance (:711), toast (:364), saved with enabled: true (:328).
  - OpenCode is off by default (S:packages/contracts/src/settings.ts:966-970).
  - Empty Server URL means the app starts the server (S:…/settings.ts:986; S:docs/user/providers-opencode.md:27).
  - After adding, hold on "1 upstream provider connected through OpenCode." (S:apps/server/src/provider/OpenCodeProvider.ts:739-744); refresh with "Refresh provider status" (S:apps/web/src/components/settings/ProviderSettingsPanel.tsx:1194,1205) if it is stale.

### 05 Add the project and open a chat (0:29-0:42, APP)

- **VO:** "Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick OpenCode in the model picker, and set Full access for this demo."
- **Step chip:** Projects + → Local folder → ~/greet-app · New chat → OpenCode · Full access
- **Shot (APP):**
  1. Click **Add project** (the + next to Projects; tooltip "New project or assistant").
  2. Click **Local folder** ("New project" and "Personal assistant" rows can sit above it).
  3. Type `~/greet-app` into "Enter path (e.g. ~/projects/my-app)".
  4. Press Enter.
  5. Check: "greet-app" (listed under Projects).
  6. Click **New chat**.
  7. Check: "What should we build in greet-app?".
  8. Click the model picker (labelled with the current model).
  9. Click the Providers rail → OpenCode → an OpenCode model.
  10. Click the Runtime mode → Full access.
  11. Check: "Current checkout" (leave the workspace on the current checkout).
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - Models are listed only for upstream providers OpenCode reports as connected (S:apps/server/src/provider/OpenCodeProvider.ts:253-262).

### 06 Plan with sw-increment (0:42-0:55, APP)

- **VO:** "Type a dollar sign, pick sw-increment, and describe the change. OpenCode writes spec.md: acceptance criteria and a task with its files and test."
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
  - The `$` menu lists OpenCode skills from the OpenCode server (S:apps/server/src/provider/Drivers/OpenCodeDriver.ts:397-409).
  - Only the OpenCode 2 adapter resolves `$skill` tokens (S:apps/server/src/orchestration-v2/Adapters/OpenCode2AdapterV2.ts:795-796).
  - `sw-increment` through `opencode run` created an increment and a spec with ACs and T-01 (C:05, a different task: hello.sh).

### 07 Build with sw-do (0:55-1:07, APP)

- **VO:** "Then send sw-do. OpenCode claims the task, changes the code, and runs the test. The task is marked done only when the test passes."
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
  - `sw-do` through `opencode run`: claim, write, test, commit, `task done` (C:07, C:08; different task).

### 08 Review the diff (1:07-1:16, APP)

- **VO:** "Click Open diff to review the code, the test, and the ledger line that records who finished the task."
- **Step chip:** Open diff → code · test · ledger.jsonl
- **Shot (APP):**
  1. Click **Open diff** (on the last turn's "N changed files" card; tooltip "Open the full diff").
  2. Step through `src/greeting.js`, `test/greeting.test.js`, `.specweave/increments/0001-…/ledger.jsonl`.
  3. Highlight in ledger.jsonl: `"e":"done" with "by":"opencode@demo" and "evidence"`.
- **Sources:**
  - Ledger lines: one JSON object per line, `done` carries evidence (generated AGENTS.md, Rules).
  - Agent id is `SPECWEAVE_AGENT`, else `<tool>@<host>`; `SPECWEAVE_TOOL` and `SPECWEAVE_HOST` override detection (W:src/core/tasks/ledger.ts:95-133).

### 09 Outro (1:16-1:20, MG)

- **VO:** "Next, sw-done verifies and closes the increment."
- **Card:** three lines: "Next: $sw-done · verify and close" / "SpecWithCode is in private pilot · spec-weave.com/studio" / "All tutorials · spec-weave.com/tutorials".
- **Sources:**
  - `sw-done`: "every task done or skipped, specweave verify green, a fresh-context review, then specweave complete" (W:skills/sw-done/SKILL.md:2).
  - Private pilot, no public download: W:docs-site/src/pages/studio.tsx:19,22.

## Narration (read straight through)

OpenCode in SpecWithCode: plan, build, review.
In your repo, run specweave init. It adds AGENTS.md and eleven SpecWeave skills.
OpenCode uses its own model sign-in. Run opencode auth login once.
Open SpecWithCode, then Settings, Providers. OpenCode is off by default: click Add provider, pick OpenCode, click Next twice, then Add instance.
Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick OpenCode in the model picker, and set Full access for this demo.
Type a dollar sign, pick sw-increment, and describe the change. OpenCode writes spec.md: acceptance criteria and a task with its files and test.
Then send sw-do. OpenCode claims the task, changes the code, and runs the test. The task is marked done only when the test passes.
Click Open diff to review the code, the test, and the ledger line that records who finished the task.
Next, sw-done verifies and closes the increment.

## OpenCode recording notes

Shared rules (demo home, environment, credentials, rename) are in SERIES.md. These apply to this episode only.

1. **Use OpenCode 2.** Record on OpenCode 2.0.18 or newer. 1.14.19 up to 2.0 shows a **Limited support** badge (S:docs/user/providers-opencode.md:8-12), and on 1.x the `$sw-increment` token is sent as plain text. If you must record on 1.x, start the plan prompt with "Use the sw-increment skill." OpenCode 2 converts its database; the demo HOME keeps that away from your own OpenCode data.
2. **Sign-in in the demo HOME.** `opencode auth login` writes to the demo HOME's `~/.local/share/opencode`. Do it off camera, before the take; never open `auth.json` or the Server password field.
3. **Cost.** Every OpenCode turn bills the connected provider. Rehearse on a cheap model, film on a strong one, and check the thread shows a skill load or a `SKILL.md` read.
4. **Captured ledger name.** C:05, C:07 and C:08 record `claude@<host>`: they ran under a Claude Code parent, and the ledger reads `CLAUDECODE` before any `OPENCODE*` variable (W:src/core/tasks/ledger.ts:116,122). The series server environment fixes this; never typeset those lines.
5. **Cut from the first draft.** The `opencode debug skill` terminal beat and the read-only Plan dialog beat. Neither changes what the viewer does.

## Not verified

Shared gaps are listed in SERIES.md. Specific to this episode:

- The `$` skill pick on OpenCode 2 inside the app (captures ran OpenCode 1.14.33 from the terminal).
- What OpenCode writes for the greet-app prompts (captures used a hello.sh task).

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
