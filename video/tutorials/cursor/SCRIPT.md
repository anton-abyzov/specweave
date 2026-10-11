# Cursor in SpecWithCode

Episode 3 of 6 in **Your agent in SpecWithCode**. Series rules, shared sources, visual system and recording plan: [../SERIES.md](../SERIES.md). How episodes are made: [../PIPELINE.md](../PIPELINE.md).

**Status: not recorded.** On SpecWithCode 0.2.6 Cursor could not be signed in off camera (see "Sign-in on 0.2.6" below). Every label up to the browser hand-off was checked on a running 0.2.6 demo server on 2026-10-11; the shared beats follow episode 1, which was checked on the same build.

**Promise:** in about 79 seconds, connect Cursor to SpecWithCode, plan one small change with a SpecWeave skill, build it, and review the code, the test and the ledger.

- Audience: a developer who already uses Cursor.
- Planned runtime: 78.7 s (episode 1's timing for the shared beats, plus two Connect beats). Narration: 9 lines, about 995 TTS characters.
- Demo repo: `greet-app` (seed in SERIES.md), initialised with `specweave init . --quick --adapter cursor`. Task: "Personal greeting": `greet(name)` returns `Hello, <name>!`, `greet()` still returns `Hello, world!`.
- Source keys: `S:` = specweave-studio at `618bfeca` (v0.2.4), `path:line`. `R:` = the installed 0.2.6 release bundle (`binCli-*.mjs`, `node_modules/@cursor/sdk` 1.0.35). `C:NN` = `captures/NN-*.json`. `W:` = this specweave repo.
- Executable steps: `SHOTLIST.json` (each APP shot says what was verified). VO lines: `scripts/vo-lines.json` (not generated yet).

## Beats

| # | Time | Kind | Chapter | Beat |
|---|---|---|---|---|
| 01 | 0:00-0:04 | MG | Intro | Intro (shared) |
| 02 | 0:04-0:12 | TERM | Set up the repo | Add SpecWeave to the repo (shared, with the Cursor adapter) |
| 03 | 0:12-0:23 | APP | Connect Cursor | Add Cursor as a provider |
| 04 | 0:23-0:34 | APP | Connect Cursor | Sign in to Cursor |
| 05 | 0:34-0:45 | APP | Add the project | Add the project and open a chat (shared) |
| 06 | 0:45-0:56 | APP | Plan | Plan with sw-increment (shared) |
| 07 | 0:56-1:06.7 | APP | Build | Build with sw-do (shared) |
| 08 | 1:06.7-1:14.7 | APP | Review | Review the diff (shared) |
| 09 | 1:14.7-1:18.7 | MG | Next | Outro (shared) |

Shared beats 01, 05-09 use episode 1's wording and timing with the agent name changed; see `../claude-code/SCRIPT.md` for their steps and sources.

### 02 Add SpecWeave to the repo (0:04-0:12, TERM)

- **VO:** "In your repo, run specweave init with the Cursor adapter. It adds AGENTS.md and eleven SpecWeave skills."
- **Step chip:** In your repo: specweave init . --quick --adapter cursor
- **Shot:** typeset from C:02, prompt `greet-app %`, lines 7 and 43: `✓ AGENTS.md created`, `✓ 11 skills installed as sw-* in .claude/skills/ and .agents/skills/`. Never typeset the adapter's "Semi-Automation", "Composer (Cmd+I)" or `specweave validate` lines.
- Without `--adapter cursor`, init detects Claude Code from PATH and reports "Adapter: Claude Code"; the seed for this episode must pass the adapter.

### 03 Add Cursor as a provider (0:12-0:23, APP)

- **VO:** "Open SpecWithCode, then Settings, Providers. Cursor is off by default: click Add provider, pick Cursor, click Next twice, then Add instance."
- **Step chip:** Settings → Providers → + → Cursor → Next → Next → Add instance
- **Shot (checked on 0.2.6):**
  1. Click the sidebar footer account button ("Account: Demo Mac"), then the **Settings** menu item (it opens on General).
  2. Click **Providers** in the settings nav. Only Codex and Claude rows show; a "Cursor account usage" switch sits under Usage providers (leave it off).
  3. Click **Add provider** (the + at the right of the Providers header, next to "Checked just now").
  4. The dialog "Add provider" reads "Add an account or configure a provider on Demo Mac." with steps Provider, Identity, Config.
  5. Click the **Cursor** radio in the Provider row (not "Add Cursor" in the ACP Registry list below it).
  6. Click **Next**. Identity shows Label ("e.g. Work"), Instance ID ("cursor_work") and Accent color; leave them.
  7. Click **Next**. Config reads "This driver has no required configuration. You can add the instance now."
  8. Click **Add instance**. The Cursor row appears: "Not authenticated · Sign in with Cursor or add CURSOR_API_KEY in provider settings."
- **0.2.6 differences from the v0.2.4 draft:** Settings is a menu item under the footer account button, and Providers is a nav button, not a link. No "Provider instance added" toast was seen; the account row reads "Sign in on Demo Mac.".

### 04 Sign in to Cursor (0:23-0:34, APP)

- **VO:** "Click Sign in, then Open browser, and approve. It runs on the Cursor SDK, so you don't need the Cursor CLI."
- **Step chip:** Cursor → Account: Sign in → Open browser · no Cursor CLI needed
- **Shot:**
  1. Click **Select Cursor**. (Checked.)
  2. Click **Sign in** on the Account row ("Sign in on Demo Mac."). (Checked.)
  3. The row reads "Finish signing in in your browser." with **Open browser**, **Copy sign-in link** and **Cancel sign-in**. (Checked.) Hover Open browser; never click it or Copy sign-in link on camera.
  4. Hard cut. The browser page shows the account and is never recorded.
  5. The card reads "Signed in with Cursor." (Not checked: no sign-in was possible.)
  6. The "Cursor API key" field ("Paste API key", "Optional. Overrides browser sign-in for this provider.") stays empty.
- **Sources:** "Signed in with Cursor." and the 5-minute sign-in timeout (R: CursorAuth); the provider runs the in-process `@cursor/sdk`, not `cursor-agent` (R: CursorDriver).
- The VO drops "Select it," from the draft: after Add instance the Cursor card is a click away, and the step is shown, not narrated.

## Narration (read straight through)

Cursor in SpecWithCode: plan, build, review.
In your repo, run specweave init with the Cursor adapter. It adds AGENTS.md and eleven SpecWeave skills.
Open SpecWithCode, then Settings, Providers. Cursor is off by default: click Add provider, pick Cursor, click Next twice, then Add instance.
Click Sign in, then Open browser, and approve. It runs on the Cursor SDK, so you don't need the Cursor CLI.
Add the repo: the plus next to Projects, Local folder, then its path. A new chat opens. Pick Cursor in the model picker, and set Full access for this demo.
Type a dollar sign, pick sw-increment, and describe the change. Cursor writes spec.md: acceptance criteria and a task with its files and test.
Then send sw-do. Cursor claims the task, changes the code, and runs the test. The task is marked done only when the test passes.
Click Open diff to review the code, the test, and the ledger line that records who finished the task.
Next, sw-done verifies and closes the increment.

Narration is to be AI-generated with Anton's cloned voice (same voice, model and settings as episode 1); no music bed.

## Sign-in on 0.2.6 (why this episode is not recorded)

- The 0.2.6 Cursor provider authenticates only with a **Cursor user API key**: either `CURSOR_API_KEY` (server environment or the provider's "Cursor API key" field) or a browser sign-in that mints a key named "SpecWithCode - Cursor" and stores it in the server's state (`<base-dir>/…/secrets`), not in HOME (R: CursorDriver, CursorCredentialStore, CursorAuth). The SDK exchanges that key at `/auth/exchange_user_api_key`; a CLI session token is not accepted (R: @cursor/sdk `auth/credential-store.d.ts`).
- The Cursor CLI login is only read for the optional "Cursor account usage" panel (Keychain items `cursor-access-token` / `cursor-user`), never for running the agent.
- On this Mac `cursor-agent status` reports "Not logged in", the Keychain has no Cursor CLI items, and there is no `~/.cursor/auth.json` or `~/.cursor/sdk/auth.json`. There was nothing to copy.
- A demo server on port 8332 with a fresh HOME confirmed it: after Add instance the card reads "Not authenticated · Sign in with Cursor or add CURSOR_API_KEY in provider settings.".

To record, one of these is needed off camera:

1. Anton completes the Cursor browser sign-in once for the demo server's Cursor instance (Sign in → Open browser on the demo server, outside any recording). The minted key lives in the demo `studio/` folder and is deleted with it. The take then starts at Add project, with beats 03-04 recorded first on a second, unsigned instance or cut from the rehearsal footage up to "Open browser".
2. Or Anton creates a Cursor user API key in the Cursor dashboard and provides it for the demo server as `CURSOR_API_KEY` (never typed on camera). With a key the card shows "Cursor API key" auth and no Sign in button, so beat 04 must then be recorded on a separate unsigned instance.

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

- Everything after the browser hand-off: "Signed in with Cursor.", the Cursor models in the model picker, Cursor's `$` skill list, what Cursor writes for `$sw-increment` and `$sw-do`, whether it stops after "Do T-01, then stop", and whether Cursor threads show the changed-files card and Open diff.
- Whether `specweave` and `git commit` work under the SDK sandbox outside Full access.

## Captures

| File | Command | Exit | Time | Use |
|---|---|---|---|---|
| `captures/01-specweave-version.json` | `specweave --version` | 0 | 0.2 s | evidence |
| `captures/02-specweave-init-cursor.json` | `specweave init . --quick --adapter cursor` | 0 | 0.5 s | on screen |
| `captures/03-ls-skills.json` | `ls .agents/skills .claude/skills` | 0 | 0.1 s | evidence |
| `captures/04-skill-names.json` | `grep -h '^name:' .agents/skills/*/SKILL.md` | 0 | 0.1 s | evidence |
