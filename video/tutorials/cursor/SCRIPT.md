# Cursor in SpecWithCode

Episode 3 of 6 in **Your agent in SpecWithCode**. Series rules, shared sources, visual system and recording plan: [../SERIES.md](../SERIES.md).

**Promise:** in 88 seconds, connect Cursor to SpecWithCode, plan one small change with a SpecWeave skill, build it, and review the code, the test and the ledger.

- Audience: a developer who already uses Cursor.
- Runtime: 88 s. Narration: 192 spoken words, about 76.8 s at 150 wpm.
- Demo repo: `greet-app` (seed in SERIES.md). Task: "Personal greeting": `greet(name)` returns `Hello, <name>!`, `greet()` still returns `Hello, world!`.
- Source keys: `S:` = specweave-studio at `618bfeca` (v0.2.4), `path:line`. `C:NN` = `captures/NN-*.json` (real runs, 2026-10-11, specweave 3.0.12, Node 22.20.0; home, user and host redacted). `W:` = this specweave repo. Labels used by every episode are sourced once in SERIES.md, "Shared beats".
- App name: written as SpecWithCode. v0.2.4 still renders "SpecWeave Studio"; record only on the renamed build.

## Beats

| # | Time | Kind | Chapter | Beat | Spoken |
|---|---|---|---|---|---|
| 01 | 0:00-0:04 | MG | Intro | Intro (shared) | 3.2 s / 4 s |
| 02 | 0:04-0:14 | TERM | Set up the repo | Add SpecWeave to the repo (shared) | 8.8 s / 10 s |
| 03 | 0:14-0:25 | APP | Connect Cursor | Turn on Cursor | 9.2 s / 11 s |
| 04 | 0:25-0:37 | APP | Connect Cursor | Sign in to Cursor | 11.2 s / 12 s |
| 05 | 0:37-0:50 | APP | Add the project | Add the project and open a chat (shared) | 11.6 s / 13 s |
| 06 | 0:50-1:03 | APP | Plan | Plan with sw-increment (shared) | 11.2 s / 13 s |
| 07 | 1:03-1:15 | APP | Build | Build with sw-do (shared) | 10.4 s / 12 s |
| 08 | 1:15-1:24 | APP | Review | Review the diff (shared) | 7.6 s / 9 s |
| 09 | 1:24-1:28 | MG | Next | Outro (shared) | 3.6 s / 4 s |

Total: 88 s.

### 01 Intro (0:00-0:04, MG)

- **VO:** "Cursor in SpecWithCode: plan, build, review."
- **Card:** eyebrow "SpecWithCode tutorial 03", title "Cursor in SpecWithCode", subtitle "Plan, build and review one task. The plan stays in your repo.".
- **Sources:**
  - Shared card, see SERIES.md "Intro and outro".

### 02 Add SpecWeave to the repo (0:04-0:14, TERM)

- **VO:** "In your repo, run specweave init with the Cursor adapter. It adds AGENTS.md and eleven SpecWeave skills."
- **Step chip:** In your repo: specweave init . --quick --adapter cursor
- **Shot (TERM):**
  1. Typeset `specweave init . --quick --adapter cursor` from `captures/02-specweave-init-cursor.json`, prompt `greet-app %`. Show `✓ AGENTS.md created`, `✓ 11 skills installed as sw-* in .claude/skills/ and .agents/skills/`.
- **Sources:**
  - C:02 (exit 0): the command and both lines, stdout lines 7 and 43.
  - Cursor reads `.cursor/skills`, `.agents/skills`, `.codex/skills` and `.claude/skills` in the project and the user home (S:apps/server/src/provider/Drivers/CursorSkills.ts:220-231). Names it will list: C:04.

### 03 Turn on Cursor (0:14-0:25, APP)

- **VO:** "Open SpecWithCode, then Settings, Providers. Cursor is off by default: click Add provider, pick Cursor, click Next twice, then Add instance."
- **Step chip:** Settings → Providers → Add provider → Cursor → Next → Next → Add instance
- **Shot (APP):**
  1. Click **Settings** (sidebar footer).
  2. Click **Providers** (route /settings/providers; only Codex and Claude rows show).
  3. Click **Add provider** (the + in the section header).
  4. Check: "Add provider" (dialog title; steps Provider, Identity, Config).
  5. Click **Cursor**.
  6. Click **Next**.
  7. Click **Next** (leave Label as is).
  8. Click **Add instance**.
  9. Check: "Provider instance added" (toast).
- **Sources:**
  - Settings (S:apps/web/src/components/sidebar/SidebarChrome.tsx:218); Providers (S:apps/web/src/components/settings/settingsSearch.ts:98).
  - A default-off provider has no row until it is added or enabled; Codex and Claude always show (S:apps/web/src/components/settings/ProviderSettingsPanel.tsx:788-806).
  - Add provider button (S:…/ProviderSettingsPanel.tsx:1215), dialog title (S:…/AddProviderInstanceDialog.tsx:383), steps Provider, Identity, Config (S:…/AddProviderInstanceDialog.logic.ts:8), Next (:699), Add instance (:711), toast (:364), saved with enabled: true (:328).
  - Cursor is off by default (S:packages/contracts/src/settings.ts:733-735).

### 04 Sign in to Cursor (0:25-0:37, APP)

- **VO:** "Select it, click Sign in, then Open browser, and approve. It runs on the Cursor SDK, so you don't need the Cursor CLI."
- **Step chip:** Cursor → Account → Sign in → Open browser · no Cursor CLI needed
- **Shot (APP):**
  1. Click **Select Cursor**.
  2. Click **Sign in** (Account row).
  3. Click **Open browser**.
  4. Hard cut: never record the Cursor browser page; it shows the account.
  5. Check: "Signed in with Cursor.".
  6. Pan to the Cursor API key field ("Paste API key"), left empty.
- **Sources:**
  - "Select Cursor" (S:apps/web/src/components/settings/ProviderInstanceCard.tsx:896); Account row (S:apps/web/src/components/settings/ProviderAuthenticationSection.tsx:164), "Open browser" (:221), "Sign in" (:295-298); "Signed in with Cursor." (S:apps/server/src/provider/CursorAuth.ts:244).
  - Runs the in-process `@cursor/sdk`, never `cursor-agent` (S:apps/server/src/provider/Drivers/CursorDriver.ts:1-8; S:docs/user/cursor.md:3-4,67).
  - Optional "Cursor API key" field (S:apps/web/src/components/settings/providerDriverMeta.ts:66-69).

### 05 Add the project and open a chat (0:37-0:50, APP)

- **VO:** "Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick Cursor in the model picker, and set Full access for this demo."
- **Step chip:** Projects + → Local folder → ~/greet-app · New chat → Cursor · Full access
- **Shot (APP):**
  1. Click **Add project** (the + next to Projects; tooltip "New project or assistant").
  2. Click **Local folder** ("New project" and "Personal assistant" rows can sit above it).
  3. Type `~/greet-app` into "Enter path (e.g. ~/projects/my-app)".
  4. Press Enter.
  5. Check: "greet-app" (listed under Projects).
  6. Click **New chat**.
  7. Check: "What should we build in greet-app?".
  8. Click the model picker (labelled with the current model).
  9. Click the Providers rail → Cursor → Auto.
  10. Click the Runtime mode → Full access.
  11. Check: "Current checkout" (leave the workspace on the current checkout).
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - "Auto" is sent to the SDK as `default` (S:apps/server/src/provider/cursorSdkModel.ts:40); the label "Auto" appears only in a driver test (S:apps/server/src/provider/Drivers/CursorDriver.test.ts:81).

### 06 Plan with sw-increment (0:50-1:03, APP)

- **VO:** "Type a dollar sign, pick sw-increment, and describe the change. Cursor writes spec.md: acceptance criteria and a task with its files and test."
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
  - `$name` is rewritten to Cursor's `/name` skill call (S:apps/server/src/provider/Drivers/CursorSkills.ts:278-288).

### 07 Build with sw-do (1:03-1:15, APP)

- **VO:** "Then send sw-do. Cursor claims the task, changes the code, and runs the test. The task is marked done only when the test passes."
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
  - Not captured: no Cursor run was made (it needs a Cursor sign-in); the recording is the evidence.

### 08 Review the diff (1:15-1:24, APP)

- **VO:** "Click Open diff to review the code, the test, and the ledger line that records who finished the task."
- **Step chip:** Open diff → code · test · ledger.jsonl
- **Shot (APP):**
  1. Click **Open diff** (on the last turn's "N changed files" card; tooltip "Open the full diff").
  2. Step through `src/greeting.js`, `test/greeting.test.js`, `.specweave/increments/0001-…/ledger.jsonl`.
  3. Highlight in ledger.jsonl: `"e":"done" with "by":"cursor@demo" and "evidence"`.
- **Sources:**
  - Ledger lines: one JSON object per line, `done` carries evidence (generated AGENTS.md, Rules).
  - Agent id is `SPECWEAVE_AGENT`, else `<tool>@<host>`; `SPECWEAVE_TOOL` and `SPECWEAVE_HOST` override detection (W:src/core/tasks/ledger.ts:95-133).

### 09 Outro (1:24-1:28, MG)

- **VO:** "Next, sw-done verifies and closes the increment."
- **Card:** three lines: "Next: $sw-done · verify and close" / "SpecWithCode is in private pilot · spec-weave.com/studio" / "All tutorials · spec-weave.com/tutorials".
- **Sources:**
  - `sw-done`: "every task done or skipped, specweave verify green, a fresh-context review, then specweave complete" (W:skills/sw-done/SKILL.md:2).
  - Private pilot, no public download: W:docs-site/src/pages/studio.tsx:19,22.

## Narration (read straight through)

Cursor in SpecWithCode: plan, build, review.
In your repo, run specweave init with the Cursor adapter. It adds AGENTS.md and eleven SpecWeave skills.
Open SpecWithCode, then Settings, Providers. Cursor is off by default: click Add provider, pick Cursor, click Next twice, then Add instance.
Select it, click Sign in, then Open browser, and approve. It runs on the Cursor SDK, so you don't need the Cursor CLI.
Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick Cursor in the model picker, and set Full access for this demo.
Type a dollar sign, pick sw-increment, and describe the change. Cursor writes spec.md: acceptance criteria and a task with its files and test.
Then send sw-do. Cursor claims the task, changes the code, and runs the test. The task is marked done only when the test passes.
Click Open diff to review the code, the test, and the ledger line that records who finished the task.
Next, sw-done verifies and closes the increment.

## Cursor recording notes

Shared rules (demo home, environment, credentials, rename) are in SERIES.md. These apply to this episode only.

1. **Wrong doc.** `docs/user/install.md` says `agent login` and `cursor-agent` (S:docs/user/install.md:121,129-130). Neither applies; never show them.
2. **Credentials.** Never type into "Cursor API key" on camera, never click the email reveal, never paste "Copy sign-in link" anywhere visible.
3. **Node version.** The Cursor SDK needs Node 22.13 or newer on the machine that runs SpecWithCode (S:docs/user/cursor.md:8).
4. **Limits.** The SDK exposes no fork, rollback or approval prompts (S:docs/user/cursor.md:45-46); do not show them.
5. **Version badge.** The manifest's Cursor range describes the old CLI, not the SDK. Keep any advisory out of frame.
6. **Stale init text.** C:02 also prints "Semi-Automation", "Use Composer (Cmd+I)" and `specweave validate`. Typeset only the two shared lines.

## Not verified

Shared gaps are listed in SERIES.md. Specific to this episode:

- The whole Cursor run: what Cursor writes for `$sw-increment` and `$sw-do`, and whether the changed-files card appears for Cursor threads.
- The exact model names Cursor's catalog returns.
- Whether `specweave` and `git commit` work under the SDK sandbox in modes other than Full access.

## Captures

| File | Command | Exit | Time | Use |
|---|---|---|---|---|
| `captures/01-specweave-version.json` | `specweave --version` | 0 | 0.2 s | evidence |
| `captures/02-specweave-init-cursor.json` | `specweave init . --quick --adapter cursor` | 0 | 0.5 s | on screen |
| `captures/03-ls-skills.json` | `ls .agents/skills .claude/skills` | 0 | 0.1 s | evidence |
| `captures/04-skill-names.json` | `grep -h '^name:' .agents/skills/*/SKILL.md` | 0 | 0.1 s | evidence |
