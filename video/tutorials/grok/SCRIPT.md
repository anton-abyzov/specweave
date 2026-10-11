# Grok in SpecWithCode

Episode 5 of 6 in **Your agent in SpecWithCode**. Series rules, shared sources, visual system and recording plan: [../SERIES.md](../SERIES.md).

**Promise:** in 88 seconds, connect Grok to SpecWithCode, plan one small change with a SpecWeave skill, build it, and review the code, the test and the ledger.

- Audience: a developer who already uses the Grok CLI.
- Runtime: 88 s. Narration: 193 spoken words, about 77.2 s at 150 wpm.
- Demo repo: `greet-app` (seed in SERIES.md). Task: "Personal greeting": `greet(name)` returns `Hello, <name>!`, `greet()` still returns `Hello, world!`.
- Source keys: `S:` = specweave-studio at `618bfeca` (v0.2.4), `path:line`. `C:NN` = `captures/NN-*.json` (real runs, 2026-10-11, specweave 3.0.12, Node 22.20.0; home, user and host redacted). `W:` = this specweave repo. Labels used by every episode are sourced once in SERIES.md, "Shared beats".
- App name: written as SpecWithCode. v0.2.4 still renders "SpecWeave Studio"; record only on the renamed build.

## Beats

| # | Time | Kind | Chapter | Beat | Spoken |
|---|---|---|---|---|---|
| 01 | 0:00-0:04 | MG | Intro | Intro (shared) | 3.2 s / 4 s |
| 02 | 0:04-0:14 | TERM | Set up the repo | Add SpecWeave to the repo (shared) | 8.8 s / 10 s |
| 03 | 0:14-0:25 | TERM | Set up the repo | Trust the folder | 10.0 s / 11 s |
| 04 | 0:25-0:37 | APP | Connect Grok | Turn on Grok | 10.8 s / 12 s |
| 05 | 0:37-0:50 | APP | Add the project | Add the project and open a chat (shared) | 11.6 s / 13 s |
| 06 | 0:50-1:03 | APP | Plan | Plan with sw-increment (shared) | 11.2 s / 13 s |
| 07 | 1:03-1:15 | APP | Build | Build with sw-do (shared) | 10.4 s / 12 s |
| 08 | 1:15-1:24 | APP | Review | Review the diff (shared) | 7.6 s / 9 s |
| 09 | 1:24-1:28 | MG | Next | Outro (shared) | 3.6 s / 4 s |

Total: 88 s.

### 01 Intro (0:00-0:04, MG)

- **VO:** "Grok in SpecWithCode: plan, build, review."
- **Card:** eyebrow "SpecWithCode tutorial 05", title "Grok in SpecWithCode", subtitle "Plan, build and review one task. The plan stays in your repo.".
- **Sources:**
  - Shared card, see SERIES.md "Intro and outro".

### 02 Add SpecWeave to the repo (0:04-0:14, TERM)

- **VO:** "In your repo, run specweave init with the generic adapter. It adds AGENTS.md and eleven SpecWeave skills."
- **Step chip:** In your repo: specweave init . --quick --adapter generic
- **Shot (TERM):**
  1. Typeset `specweave init . --quick --adapter generic` from `captures/02-specweave-init-generic.json`, prompt `greet-app %`. Show `✓ AGENTS.md created`, `✓ 11 skills installed as sw-* in .claude/skills/ and .agents/skills/`.
- **Sources:**
  - C:02 (exit 0): the command and both lines, stdout lines 7 and 58.
  - The init tool picker has no Grok entry, so the episode uses `--adapter generic`; plain `--quick` auto-detected Claude Code on this Mac (C:02b). The skills are the same either way.

### 03 Trust the folder (0:14-0:25, TERM)

- **VO:** "Grok skips project skills in folders it doesn't trust. In the repo, run grok --trust once. Signed out? Run grok login first."
- **Step chip:** Trust the folder once: grok --trust · signed out: grok login
- **Shot (TERM):**
  1. Typeset `grok --trust inspect --json | jq -r '.skills[].name | select(startswith("sw-"))'` from `captures/04-grok-trust-skills.json`, prompt `greet-app %`. Show all 11 lines (sw-auto … sw-team).
- **Sources:**
  - C:04 (exit 0). Before the grant, `grok inspect --json` reported `projectTrusted: false` and no `sw-*` skills (observed, not kept as a capture).
  - Grok: "Startup discovery skips project skills and commands in untrusted folders" (grok 1.0.50 `~/.grok/docs/user-guide/08-skills.md:3`; `--trust` covers project skills, `10-hooks.md:81`).
  - SpecWithCode lists skills with `grok inspect --json` and starts `grok agent stdio` without `--trust` (S:apps/server/src/provider/GrokProvider.ts:501; S:apps/server/src/provider/Drivers/GrokSkills.ts:1-14; S:apps/server/src/provider/acp/GrokAcpSupport.ts:56-67).
  - Signed out: "Grok CLI is installed but not logged in. Run `grok login`." (S:…/GrokProvider.ts:537).

### 04 Turn on Grok (0:25-0:37, APP)

- **VO:** "Open SpecWithCode, then Settings, Providers. Grok is off by default: click Add provider, pick Grok, existing CLI, click Next twice, then Add instance."
- **Step chip:** Settings → Providers → Add provider → Grok (existing CLI) → Next → Next → Add instance
- **Shot (APP):**
  1. Click **Settings** (sidebar footer).
  2. Click **Providers** (route /settings/providers; only Codex and Claude rows show).
  3. Click **Add provider** (the + in the section header).
  4. Check: "Add provider" (dialog title; steps Provider, Identity, Config).
  5. Click **Grok (existing CLI)** (not the "Grok Build" registry card).
  6. Click **Next**.
  7. Click **Next** (leave Label as is).
  8. Click **Add instance**.
  9. Check: "Provider instance added" (toast).
  10. Check: "Authenticated · Grok account".
- **Sources:**
  - Settings (S:apps/web/src/components/sidebar/SidebarChrome.tsx:218); Providers (S:apps/web/src/components/settings/settingsSearch.ts:98).
  - A default-off provider has no row until it is added or enabled; Codex and Claude always show (S:apps/web/src/components/settings/ProviderSettingsPanel.tsx:788-806).
  - Add provider button (S:…/ProviderSettingsPanel.tsx:1215), dialog title (S:…/AddProviderInstanceDialog.tsx:383), steps Provider, Identity, Config (S:…/AddProviderInstanceDialog.logic.ts:8), Next (:699), Add instance (:711), toast (:364), saved with enabled: true (:328).
  - "Grok (existing CLI)" (S:apps/web/src/components/settings/AddProviderInstanceDialog.tsx:450). Grok is off by default (S:packages/contracts/src/settings.ts:757-764).
  - After adding, the row reads "Authenticated · Grok account" (S:apps/web/src/components/settings/providerStatus.ts:79; S:apps/server/src/provider/GrokProvider.ts:494-496).

### 05 Add the project and open a chat (0:37-0:50, APP)

- **VO:** "Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick Grok in the model picker, and set Full access for this demo."
- **Step chip:** Projects + → Local folder → ~/greet-app · New chat → Grok · Full access
- **Shot (APP):**
  1. Click **Add project** (the + next to Projects; tooltip "New project or assistant").
  2. Click **Local folder** ("New project" and "Personal assistant" rows can sit above it).
  3. Type `~/greet-app` into "Enter path (e.g. ~/projects/my-app)".
  4. Press Enter.
  5. Check: "greet-app" (listed under Projects).
  6. Click **New chat**.
  7. Check: "What should we build in greet-app?".
  8. Click the model picker (labelled with the current model).
  9. Click the Providers rail → Grok → the default Grok model.
  10. Click the Runtime mode → Full access.
  11. Check: "Current checkout" (leave the workspace on the current checkout).
- **Sources:**
  - Shared labels, see SERIES.md "Shared beats".
  - Models come from the Grok CLI; this machine's default is grok-4.7 (C:10). The picker label comes from ACP at run time.

### 06 Plan with sw-increment (0:50-1:03, APP)

- **VO:** "Type a dollar sign, pick sw-increment, and describe the change. Grok writes spec.md: acceptance criteria and a task with its files and test."
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
  - `/sw-increment` through `grok -p` (85 s) wrote a spec with AC-01, AC-02 and T-01 (C:05, C:07; a different task, a shout flag), and `specweave task next` showed T-01 open (C:09).

### 07 Build with sw-do (1:03-1:15, APP)

- **VO:** "Then send sw-do. Grok claims the task, changes the code, and runs the test. The task is marked done only when the test passes."
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
  - Not captured: no `sw-do` run was made through Grok; the recording is the evidence.

### 08 Review the diff (1:15-1:24, APP)

- **VO:** "Click Open diff to review the code, the test, and the ledger line that records who finished the task."
- **Step chip:** Open diff → code · test · ledger.jsonl
- **Shot (APP):**
  1. Click **Open diff** (on the last turn's "N changed files" card; tooltip "Open the full diff").
  2. Step through `src/greeting.js`, `test/greeting.test.js`, `.specweave/increments/0001-…/ledger.jsonl`.
  3. Highlight in ledger.jsonl: `"e":"done" with "by":"grok@demo" and "evidence"`.
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

Grok in SpecWithCode: plan, build, review.
In your repo, run specweave init with the generic adapter. It adds AGENTS.md and eleven SpecWeave skills.
Grok skips project skills in folders it doesn't trust. In the repo, run grok --trust once. Signed out? Run grok login first.
Open SpecWithCode, then Settings, Providers. Grok is off by default: click Add provider, pick Grok, existing CLI, click Next twice, then Add instance.
Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick Grok in the model picker, and set Full access for this demo.
Type a dollar sign, pick sw-increment, and describe the change. Grok writes spec.md: acceptance criteria and a task with its files and test.
Then send sw-do. Grok claims the task, changes the code, and runs the test. The task is marked done only when the test passes.
Click Open diff to review the code, the test, and the ledger line that records who finished the task.
Next, sw-done verifies and closes the increment.

## Grok recording notes

Shared rules (demo home, environment, credentials, rename) are in SERIES.md. These apply to this episode only.

1. **Trust lives in HOME.** The grant is saved in `~/.grok/trusted_folders.toml`. Run the trust step (and `grok login`) in the demo HOME, in the demo repo, before the app take.
2. **Full access matters.** Grok has no Auto-accept edits, and Supervised stops on every command (S:docs/user/permission-modes.md at 618bfeca).
3. **Grok Build.** Do not use the "Grok Build" registry card; it is a different install (S:docs/studio/copilot-and-grok.md at 618bfeca).
4. **Credentials.** The Grok row hides the account email behind "Click to reveal email" (S:apps/web/src/components/settings/ProviderInstanceCard.tsx:192-198); never click it. Never type an `XAI_API_KEY` on screen.
5. **Version badge.** The row can show an update or Limited support advisory (S:apps/server/src/provider/GrokProvider.ts:575-585). Update the CLI first.

## Not verified

Shared gaps are listed in SERIES.md. Specific to this episode:

- How the `$` skill pick reaches Grok over ACP, and the picker's model label.
- The `sw-do` step through Grok.
- Whether adding "Grok (existing CLI)" next to the hidden default slot gives a suffixed instance id (cosmetic).

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
