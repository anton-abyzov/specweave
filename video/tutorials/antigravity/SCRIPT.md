# Antigravity in SpecWithCode

Episode 6 of 6 in **Your agent in SpecWithCode**. Series rules, shared sources, visual system and recording plan: [../SERIES.md](../SERIES.md).

**As recorded (SpecWithCode 0.2.8, 11 October 2026):** 75 s in eight beats. Beats 03 and 04 below became one "Connect Antigravity" beat, because the instance was added, installed and signed in off camera: the take opens the Add provider dialog, closes it, and shows the signed-in row. The model is Gemini 3.8 Flash (High). `SHOTLIST.json`, `edit.json` and `scripts/vo-lines.json` are the source of truth for what was recorded and said.

**Promise (planned):** in 89 seconds, connect Antigravity to SpecWithCode, plan one small change with a SpecWeave skill, build it, and review the code, the test and the ledger.

- Audience: a developer who already uses Antigravity.
- Runtime: 89 s. Narration: 190 spoken words, about 76.0 s at 150 wpm.
- Demo repo: `greet-app` (seed in SERIES.md). Task: "Personal greeting": `greet(name)` returns `Hello, <name>!`, `greet()` still returns `Hello, world!`.
- Source keys: `S:` = specweave-studio at `618bfeca` (v0.2.4), `path:line`. `C:NN` = `captures/NN-*.json` (real runs, 2026-10-11, specweave 3.0.12, Node 22.20.0; home, user and host redacted). `W:` = this specweave repo. Labels used by every episode are sourced once in SERIES.md, "Shared beats".
- App name: written as SpecWithCode. v0.2.4 still renders "SpecWeave Studio"; record only on the renamed build.

## Beats

| # | Time | Kind | Chapter | Beat | Spoken |
|---|---|---|---|---|---|
| 01 | 0:00-0:04 | MG | Intro | Intro (shared) | 3.2 s / 4 s |
| 02 | 0:04-0:14 | TERM | Set up the repo | Add SpecWeave to the repo (shared) | 8.8 s / 10 s |
| 03 | 0:14-0:25 | APP | Connect Antigravity | Turn on Antigravity | 9.2 s / 11 s |
| 04 | 0:25-0:38 | APP | Connect Antigravity | Install and sign in | 10.4 s / 13 s |
| 05 | 0:38-0:51 | APP | Add the project | Add the project and open a chat (shared) | 11.6 s / 13 s |
| 06 | 0:51-1:04 | APP | Plan | Plan with sw-increment (shared) | 11.2 s / 13 s |
| 07 | 1:04-1:16 | APP | Build | Build with sw-do (shared) | 10.4 s / 12 s |
| 08 | 1:16-1:25 | APP | Review | Review the diff (shared) | 7.6 s / 9 s |
| 09 | 1:25-1:29 | MG | Next | Outro (shared) | 3.6 s / 4 s |

Total: 89 s.

### 01 Intro (0:00-0:04, MG)

- **VO:** "Antigravity in SpecWithCode: plan, build, review."
- **Card:** eyebrow "SpecWithCode tutorial 06", title "Antigravity in SpecWithCode", subtitle "Plan, build and review one task. The plan stays in your repo.".
- **Sources:**
  - Shared card, see SERIES.md "Intro and outro".

### 02 Add SpecWeave to the repo (0:04-0:14, TERM)

- **VO:** "In your repo, run specweave init with the Antigravity adapter. It adds AGENTS.md and eleven SpecWeave skills."
- **Step chip:** In your repo: specweave init . --quick --adapter antigravity
- **Shot (TERM):**
  1. Typeset `specweave init . --quick --adapter antigravity` from `captures/03-specweave-init.json`, prompt `greet-app %`. Show `✓ AGENTS.md created`, `✓ 11 skills installed as sw-* in .claude/skills/ and .agents/skills/`.
- **Sources:**
  - C:03 (exit 0): the command and both lines, stdout lines 7 and 120.
  - Antigravity reads project skills from `.gemini/skills`, `.agents/skills` and `.agent/skills` (S:apps/server/src/provider/Drivers/AntigravitySkills.ts:174-180). Names it will list: C:05.

### 03 Turn on Antigravity (0:14-0:25, APP)

- **VO:** "Open SpecWithCode, then Settings, Providers. Antigravity is off by default: click Add provider, pick Antigravity, click Next twice, then Add instance."
- **Step chip:** Settings → Providers → Add provider → Antigravity → Next → Next → Add instance
- **Shot (APP):**
  1. Click **Settings** (sidebar footer).
  2. Click **Providers** (route /settings/providers; only Codex and Claude rows show).
  3. Click **Add provider** (the + in the section header).
  4. Check: "Add provider" (dialog title; steps Provider, Identity, Config).
  5. Click **Antigravity**.
  6. Click **Next**.
  7. Click **Next** (leave Label as is).
  8. Check: "Sign-in method" (keep "Google account").
  9. Click **Add instance**.
  10. Check: "Provider instance added" (toast).
- **Sources:**
  - Settings (S:apps/web/src/components/sidebar/SidebarChrome.tsx:218); Providers (S:apps/web/src/components/settings/settingsSearch.ts:98).
  - A default-off provider has no row until it is added or enabled; Codex and Claude always show (S:apps/web/src/components/settings/ProviderSettingsPanel.tsx:788-806).
  - Add provider button (S:…/ProviderSettingsPanel.tsx:1215), dialog title (S:…/AddProviderInstanceDialog.tsx:383), steps Provider, Identity, Config (S:…/AddProviderInstanceDialog.logic.ts:8), Next (:699), Add instance (:711), toast (:364), saved with enabled: true (:328).
  - Off by default (S:packages/contracts/src/settings.ts:801-802); Sign-in method defaults to Google account (:788-793,805-808).

### 04 Install and sign in (0:25-0:38, APP)

- **VO:** "Click Install Antigravity. SpecWithCode downloads its own Antigravity agent, separate from your IDE. Then click Sign in and finish in your browser."
- **Step chip:** Runtime → Install Antigravity · Account → Sign in
- **Shot (APP):**
  1. Check: "112 MB download.".
  2. Click **Install Antigravity**.
  3. Speed-ramp to about 3 s until Installed., with the "sped up" chip.
  4. Click **Sign in** (Account row).
  5. Check: "Finish signing in in your browser.".
  6. Hard cut: never record the Google page, the account picker or the 127.0.0.1 return URL.
  7. Check: "Signed in." ("Signed in as" stays masked).
- **Sources:**
  - "Install Antigravity", "112 MB download.", progress and "Installed." (S:apps/web/src/components/settings/ProviderSetupSection.tsx:52,136-150,191-193,267).
  - Version 1.3.0 archive from dl.google.com (S:apps/server/src/provider/antigravityRelease.ts:1,22-29); separate from the IDE (S:docs/user/providers-antigravity.md:3-4).
  - "Sign in", "Finish signing in in your browser.", "Signed in." (S:apps/web/src/components/settings/ProviderAuthenticationSection.tsx:86,88,164-174,298); sign-in needs the runtime installed (:279).

### 05 Add the project and open a chat (0:38-0:51, APP)

- **VO:** "Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick Antigravity in the model picker, and set Full access for this demo."
- **Step chip:** Projects + → Local folder → ~/greet-app · New chat → Antigravity · Full access
- **Shot (APP):**
  1. Click **Add project** (the + next to Projects; tooltip "New project or assistant").
  2. Click **Local folder** ("New project" and "Personal assistant" rows can sit above it).
  3. Type `~/greet-app` into "Enter path (e.g. ~/projects/my-app)".
  4. Press Enter.
  5. Check: "greet-app" (listed under Projects).
  6. Click **New chat**.
  7. Check: "What should we build in greet-app?".
  8. Click the model picker (labelled with the current model).
  9. Click the Providers rail → Antigravity → a Gemini model.
  10. Click the Runtime mode → Full access.
  11. Check: "Current checkout" (leave the workspace on the current checkout).
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - Gemini models come from the signed-in account (S:docs/user/providers-antigravity.md:71-73).

### 06 Plan with sw-increment (0:51-1:04, APP)

- **VO:** "Type a dollar sign, pick sw-increment, and describe the change. Antigravity writes spec.md: acceptance criteria and a task with its files and test."
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
  - Increment layout from a real `specweave create-increment` (C:06, reference only).

### 07 Build with sw-do (1:04-1:16, APP)

- **VO:** "Then send sw-do. Antigravity claims the task, changes the code, and runs the test. The task is marked done only when the test passes."
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
  - Not captured: no Antigravity run was made (its runtime needs its own Google sign-in); the recording is the evidence.

### 08 Review the diff (1:16-1:25, APP)

- **VO:** "Click Open diff to review the code, the test, and the ledger line that records who finished the task."
- **Step chip:** Open diff → code · test · ledger.jsonl
- **Shot (APP):**
  1. Click **Open diff** (on the last turn's "N changed files" card; tooltip "Open the full diff").
  2. Step through `src/greeting.js`, `test/greeting.test.js`, `.specweave/increments/0001-…/ledger.jsonl`.
  3. Highlight in ledger.jsonl: `"e":"done" with "by":"antigravity@demo" and "evidence"`.
- **Sources:**
  - Ledger lines: one JSON object per line, `done` carries evidence (generated AGENTS.md, Rules).
  - Agent id is `SPECWEAVE_AGENT`, else `<tool>@<host>`; `SPECWEAVE_TOOL` and `SPECWEAVE_HOST` override detection (W:src/core/tasks/ledger.ts:95-133).

### 09 Outro (1:25-1:29, MG)

- **VO:** "Next, sw-done verifies and closes the increment."
- **Card:** three lines: "Next: $sw-done · verify and close" / "SpecWithCode · spec-weave.com/studio" / "All tutorials · spec-weave.com/tutorials".
- **Sources:**
  - `sw-done`: "every task done or skipped, specweave verify green, a fresh-context review, then specweave complete" (W:skills/sw-done/SKILL.md:2).
  - Private pilot, no public download: W:docs-site/src/pages/studio.tsx:19,22.

## Narration (read straight through)

Antigravity in SpecWithCode: plan, build, review.
In your repo, run specweave init with the Antigravity adapter. It adds AGENTS.md and eleven SpecWeave skills.
Open SpecWithCode, then Settings, Providers. Antigravity is off by default: click Add provider, pick Antigravity, click Next twice, then Add instance.
Click Install Antigravity. SpecWithCode downloads its own Antigravity agent, separate from your IDE. Then click Sign in and finish in your browser.
Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick Antigravity in the model picker, and set Full access for this demo.
Type a dollar sign, pick sw-increment, and describe the change. Antigravity writes spec.md: acceptance criteria and a task with its files and test.
Then send sw-do. Antigravity claims the task, changes the code, and runs the test. The task is marked done only when the test passes.
Click Open diff to review the code, the test, and the ledger line that records who finished the task.
Next, sw-done verifies and closes the increment.

## Antigravity recording notes

Shared rules (demo home, environment, credentials, rename) are in SERIES.md. These apply to this episode only.

1. **Account.** Use a demo Google account allowed to use Antigravity; Google can answer `SUBSCRIPTION_REQUIRED` (S:docs/user/providers-antigravity.md:135-137).
2. **Credentials.** The `127.0.0.1` return URL holds a temporary sign-in code (S:docs/user/providers-antigravity.md:31-33). Never open the API-key sign-in methods; that key is stored in plain text (S:packages/contracts/src/settings.ts:822).
3. **Version badge.** The manifest recommends Antigravity `=1.1.1` while the installer ships 1.3.0 (S:apps/server/src/provider/model-manifest.json:78), so a Limited badge may show. Fix the manifest or crop it.
4. **Init output is partly wrong.** C:03 tells you to `npm install -g @anthropic-ai/antigravity`, shows "Model | Opus 4.6" and "No native skills/agents". Typeset only the two shared lines; fix the text in `src/adapters/antigravity/`.
5. **AGENTS.md says "SpecWeave Studio".** Line 18 of the generated AGENTS.md reads "(outside SpecWeave Studio)". Keep it out of frame until the template is renamed.
6. **Ledger name.** The ledger has no Antigravity detection (W:src/core/tasks/ledger.ts:111-125); the series sets `SPECWEAVE_TOOL=antigravity`.
7. **No Plan mode.** Antigravity has no Build/Plan toggle, revert or edit-and-resubmit (S:docs/user/providers-antigravity.md:75-82). Do not show them.

## Not verified

Shared gaps are listed in SERIES.md. The plan and build beats were verified by the recording: Gemini 3.8 Flash wrote spec.md, claimed T-01, changed `src/greeting.js` and its test, ran `npm test` (2 passing) and recorded `specweave task done` as `antigravity@demo`.

## Captures

| File | Command | Exit | Time | Use |
|---|---|---|---|---|
| `captures/01-specweave-version.json` | `specweave --version` | 0 | 4.0 s | evidence |
| `captures/02-git-init.json` | `git init -b main` | 0 | 0.1 s | evidence |
| `captures/03-specweave-init.json` | `specweave init . --quick --adapter antigravity` | 0 | 4.3 s | on screen |
| `captures/04-ls-skills.json` | `ls .agents/skills .claude/skills` | 0 | 0.0 s | evidence |
| `captures/05-skill-names.json` | `grep -h '^name:' .agents/skills/*/SKILL.md` | 0 | 0.0 s | evidence |
| `captures/06-create-increment-reference.json` | `specweave create-increment "Add a greet function"` | 0 | 0.2 s | evidence |
