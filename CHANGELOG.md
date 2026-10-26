## [3.1.13] - 2026-10-26

### Changed

- Fold subagent leftovers into the single loop (#2164)

## [3.1.12] - 2026-10-26

### Changed

- chore(deps)(deps): bump the production-dependencies group with 2 updates (#2161)
- chore(deps)(deps-dev): bump @playwright/test (#2160)
- chore(deps)(deps-dev): bump the development-dependencies group with 2 updates (#2162)
- chore(deps)(deps-dev): bump the vitest-ecosystem group with 3 updates (#2159)

## [3.1.11] - 2026-10-26

### Changed

- 1080: archive older release notes before publishing templates (#2157)
- spec-weave.com: fix 404s, index tutorial pages, strengthen /code (#2156)
- 1080: remove blanket license claims from SpecWithCode guides (#2154)
- docs: changelog page through 3.1.10, durable release lines (#2150)
- docs: keep inline code in tutorial steps in the text column (#2151)
- 1080: preserve product identity in templates and download pages (#2153)
- Add SpecWithCode Windows and Linux downloads (1.0.76) (#2145)

## [3.1.10] - 2026-10-24

### Added

- Opt-in auto-commit of increment files (#2144). `git.autoCommitIncrement` (default false) commits only the increment's `spec.md`, `ledger.jsonl` and `metadata.json` (plus a tracked `handoff.md`) after `task claim|done|skip|block|release`, `card start|done|wait`, `create-increment` and `handoff`, with the subject `NNNN: <action> T-xx`. Hooks run; a failure is one warning and never changes the exit code; `--no-commit` skips it. `git.autoPushIncrement` (default false) pushes only to a same-name upstream and only when every unpushed commit is an auto-commit.

### Changed

- TDD and coverage are fully opt-in. Increments no longer get `testMode: "test-after"` and `coverageTarget: 80` written into `metadata.json`; `specweave complete` checks coverage only when `testing.coverage.unit` is set (a stamped metadata target is ignored) and never assumes TDD; `generate-rubric` adds the coverage criterion only with a configured target. The packaged config schema now describes the 2.0 `testing.commands`, `testing.mode` and `testing.coverage` keys instead of the removed `tddEnforcement` and `defaultTestMode`. The sw-do skill says test-first order is optional instead of forbidding it. (#2147)

### Fixed

- PreCompact and Stop auto-handoffs now resume the increment this session works on (its work-session marker, then its SpecWithCode thread binding) instead of the first active increment (#2143).

## [3.1.9] - 2026-10-24

### Changed

- `specweave reopen --json` now includes `next: "specweave start <id>"`, so scripts see the separate activation step that the plain output already prints.

## [3.1.8] - 2026-10-24

### Added

- `specweave --workspace <root> reopen <id> --reason "<text>"` moves a completed increment back to `planned`; it never activates it. It refuses to run without a reason, without an explicit workspace, for an increment outside that workspace, for any status other than completed, and while another agent holds a claimed, stale or blocked task. The closure (`approvedAt`, `closeReason`, `readyForReviewAt`) moves into `metadata.reopened`, and the ledger and reports are left untouched. Activation stays a separate step: `specweave start <id>`.

## [3.1.7] - 2026-10-23

### Changed

- Increments are recommended, not required. The `remind` message now says so and tells the agent to carry on when a change does not need one; `enforce` stays an explicit opt-in. The AGENTS.md loop text says the same.

## [3.1.6] - 2026-10-22

### Added

- Dashboard Timeline page (`specweave dashboard`, then Timeline): a Gantt chart of every increment with uninterrupted-work forecasts from the project's measured pace, throughput, latest ledger activity and filters for status, agent, window and text.
- `specweave require-increment off|remind|enforce` and `specweave small-fix "<why>"`: an opt-in Claude Code edit guard that asks for an increment before code changes.
- Work board filters for agent and how long finished work stays visible.

### Changed

- `create-increment`, `verify` and `complete` bind the SpecWithCode thread and the agent session to the increment, not only ledger appends.
- Ledger events record the model (`SPECWEAVE_MODEL`, or `ANTHROPIC_MODEL` under Claude Code), so the Work board no longer says "Model unknown" for new work.
- SpecWithCode worktrees outside the project resolve to their main checkout's planning root; `small-fix` with only `SPECWEAVE_STUDIO_THREAD_ID` exempts the thread; `require-increment` also writes the edit hook to `~/.claude/settings.json` (`off` removes it); that entry runs `pre-tool-use --scope user`, which guards nothing, increment files included, unless an opted-in project's marker is found.

## [3.1.5] - 2026-10-21

### Changed

- Count legacy plain-bullet acceptance criteria in verification (#2127)
- fix(complete): count open ACs from the ledger like verify (#2126)
- docs: keep tracker sync a brief optional mention (#2124)
- docs-site: keep one scroll sequence, home handoff only (#2122)
- Expire session checkpoint folders after 7 days (#2121)
- 0938: SpecWithCode 1.0.62, Organization sameAs, switching title (#2120)
- docs: add missing still and helper scripts to browser tutorial (#2119)

## [3.1.4] - 2026-10-20

### Changed

- Close gate counts plain-bullet ACs as declared (#2116)

## [3.1.3] - 2026-10-20

### Added

- Task cards. Ledger events may carry `line` (one line, at most 100 characters; longer text is truncated with a warning) and `link`. `specweave task claim|done|block` take `--line` and `--link`; `specweave cards [id] --md` prints a header, a blank line and one `✓ / ✱ / ○ / ⏸ / –` line per task with its link, falling back to the task title and to the first PR URL, `log:` report or `HEAD` commit in the evidence. `specweave pickup` prints the checklist before the next task.
- `specweave card add|start|done|wait|list`. On an increment, `start|done|wait T-NN` are `task claim|done|block`; without one, `card add "<text>"` writes `C-NN` cards to `.specweave/cards/<branch>.jsonl`.

### Changed

- `specweave verify` fails with "no test commands configured" when there is nothing to run, unless `--reason` is given (recorded in `verify.json`).
- `specweave complete` refuses an increment whose spec.md declares no acceptance criteria, unless `--reason` is given.
- On completion, living docs are skipped with one log line for a spec without user stories; the JIRA/ADO closure runs whether living docs synced, were skipped or failed.

## [3.1.2] - 2026-10-19

### Changed

- 0940: threads verify and close the increment they finish (#2108)
- 0939: Cursor copy for the X Subscription and SDK sign-in (#2107)
- docs: SpecWithCode Browser tutorial (Copilot and Codex share Chrome) (#2105)
- Docs: install SpecWithCode Browser from the Chrome Web Store (#2100)
- 0938: SpecWithCode SEO fix batch (#2103)
- Explain how to restore the silent sources for narration reruns (#2104)
- Narrate the six silent site videos (#2102)
- docs: SpecWithCode runs Cursor through its SDK, not a CLI (#2101)
- Set the publish time for agents-use-a-browser (#2099)
- Add the agents-use-a-browser tutorial (#2098)
- Set publish times for add-a-machine and finish-a-thread (#2097)
- Add the add-a-machine and finish-a-thread tutorials (#2096)
- docs(site): cover the iPhone app in privacy, add a support page (#2094)
- Embed SpecWithCode tutorials in their docs and set publish times (#2093)
- Add narrated SpecWithCode tutorials: start, provider fallback (#2092)
- verify-live: check hidden tab images by fetching them (#2091)

## [3.1.1] - 2026-10-18

### Changed

- Fix CLI rough edges found while recording tutorials (#2089)
- Embed CLI tutorials in their guides and set publish times (#2088)
- Add narrated CLI tutorials: install, daily loop, review (#2087)
- Embed handoff tutorial in guide and set its publish time (#2086)
- Add narrated handoff tutorial and fix handoff AC counts (#2085)
- Reorganize site content with scroll sequences and tutorial guides (#2084)
- Load lazy images in hidden panels in the live docs check (#2083)
- Weave design system for spec-weave.com and /code (#2081)

## [3.1.0] - 2026-10-17

### Added

- Opt-in skills. Every project gets six core skills (sw-increment, sw-do, sw-auto, sw-done, sw-review, sw-handoff); sw-grill-me, sw-glossary, sw-sync, sw-project and sw-jev install when `skills.enabled` in `.specweave/config.json` lists them or the project's files call for them (a `GLOSSARY.md`, a tracker, `hub.json`, `jev.enabled`, `planning.deepInterview: deep`). `specweave skills list|enable|disable` shows and changes them; `skills.disabled` keeps a detected one out.
- sw-grill-me interviews you in rounds until every decision in a plan is settled, each question with a recommended answer, and records them under `## Decisions`.
- sw-glossary builds `GLOSSARY.md`, the project's shared language: what each domain term means in the business, the data, the code and the UI, and the words to avoid. `specweave glossary check` lists avoided words used as identifiers and Data/Code names that no longer exist (`--strict` exits 1 for CI).
- `specweave review` hands an increment's diff to a reviewer from another model family than the one that wrote it (Codex with GPT-6.1-Sol for Claude-written code, Claude Opus for OpenAI-written code), writes `reports/review-<reviewer>.md` and exits 0 for ship, 3 for fix first. `--brief` prints the brief to paste anywhere; `review.crossModel` makes sw-review and sw-done run it unprompted.

### Removed

- sw-brainstorm (its Decide step is sw-increment's; the full interview is sw-grill-me), sw-team (now sw-do's "Parallel lanes") and the unused `skills-optional/` skills (debug, diagrams, e2e, release-expert, tdd-cycle). `specweave update` removes SpecWeave's own copies and never a folder you changed.

## [3.0.23] - 2026-10-16

### Changed

- Skip re-testing release bumps and gate publishes on green CI (#2072)
- Switch: card dashboard and one-command machine onboarding (#2049)
- docs: correct competitor facts and links in SpecWithCode comparison (#2073)
- Add Why SpecWithCode section and competitor comparison (#2071)

## [3.0.22] - 2026-10-16

### Changed

- `specweave pickup` finds the project's latest session checkpoint by reading receipts newest-first and stopping at the first older than its best match, instead of reading every receipt ever saved (129 ms to 25 ms with 2,660 checkpoints) (#2070).

## [3.0.21] - 2026-10-16

### Changed

- sw-increment now runs a Decide step from sw-brainstorm before writing spec.md: it asks only the user's critical decisions, one at a time with a recommended answer, and records them under `## Decisions`. `planning.deepInterview` is now `off`, `critical` (default, at most 5 questions) or `deep` (no cap); a 2.x `warn` migrates to `critical`, and the unused `interview` command module is removed (#2067).
- The /code page uses real SpecWithCode 1.0.21 captures and a short recorded run (#2065).
- The docs site adds the SpecWithCode Browser privacy policy page (#2068).

## [3.0.20] - 2026-10-15

### Changed

- The docs site versions its icon links so browsers drop the old logo (#2063).
- Dependency updates: production dependencies, `memfs` and `@types/node` (#2043, #2044, #2045).

## [3.0.19] - 2026-10-15

### Changed

- Docs, the AGENTS.md template, the handoff skill and `specweave auto-handoff` output call the app SpecWithCode instead of Studio. Paths, environment variables and identifiers are unchanged (#2061).

## [3.0.18] - 2026-10-15

### Added

- Inside a SpecWithCode thread, every ledger write (`specweave task claim|done|block|skip|release`, auto-claim, `pickup`, `note`, handoff) records the thread's increment in `~/.specweave/studio/threads/<thread>.json`. SpecWithCode reads it to show the thread's plan card from that increment's spec and ledger. It lives outside the repository and holds no task state, and a failed write never fails the command (#2059).

## [3.0.17] - 2026-10-15

### Fixed

- The startup duplicate check (shown by `specweave status` and other commands) no longer reports suffixed increments such as `0657E-*` or `0713B-*` as duplicates of their base number. This was a 3.0.16 regression. Two folders with the same number and suffix are still reported. Archive, restore and create checks also treat suffixed IDs as distinct (#2056).

## [3.0.16] - 2026-10-15

- Patch release

## [3.0.15] - 2026-10-13

### Changed

- Generated agent instructions require headless Chrome/Playwright CLI for browser tests and automation, saved evidence, and explicit user approval before opening an essential visible browser. The rule applies to subagents and is installed or refreshed through the shared AGENTS.md template.

## [3.0.14] - 2026-10-11

### Changed

- Task Tests now check the acceptance criterion the way a user or caller would (CLI, HTTP, UI or public API). The `AGENTS.md` that `specweave init` writes and the `sw-increment`, `sw-do` and `sw-review` skills no longer pair every task with a new unit-test file; agents reuse existing tests and add unit tests only when asked or when the project's config or conventions require them. `sw-review` flags tests that only restate the implementation (#2019).
- No test mode or coverage target is set by default any more: the built-in `testing` config is empty instead of TDD with 95/90/100 coverage, and the legacy `defaultTestMode` schema default is `test-after` (#2019).

### Fixed

- After a plugin update, `refresh-plugins` mirrors the plugin into each Claude Code plugin cache path, so skills and files the new version no longer ships (such as the retired 2.x `sw:qa` skill) disappear instead of lingering (#2016).
- `update` and `refresh-plugins` remove retired `sw-*` project skills that SpecWeave installed (`sw-qa` and `sw-task` in projects upgraded from 2.x) and files a shipped skill no longer has (such as `sw-team/agents/`), and leave a user's own `sw-*` skills alone (#2016).

### Docs

- spec-weave.com has a privacy policy page, linked from the footer, covering the SpecWeave CLI, the SpecWithCode desktop app and the website (#2018, #2022).
- The docs link check skips the Google account permissions link on that page, which only answers a signed-in browser (#2024).

## [3.0.13] - 2026-10-11

### Changed

- Runtime dependencies updated: `@anthropic-ai/sdk` ^0.131.0 (was ^0.122.0), `@inquirer/prompts` 8.7.2, `fs-extra` 11.4.1, `open` 11.0.4, `yaml` 2.9.1 and `zod` 4.6.5.
- Development dependencies updated (Playwright 1.63, React 19.3, mermaid-cli 11.17, memfs, react-router-dom, @types/node) and CI actions moved to `actions/checkout@v7` and `actions/setup-node@v7`.

### Added

- `contrib/subscription-switch`: a local companion for choosing which native coding subscription runs a task and restoring reviewed Git work. It lives in the repository only and is not part of the npm package.

### Docs

- Studio setup guide matches the project control labels; Studio tutorials, walkthrough page and homepage story panels updated on spec-weave.com.

## [3.0.12] - 2026-10-10

### Added

- Pick up a specific handoff. When several sessions handed off in one project, `specweave handoff list` (also `specweave pickup --list`) shows them newest first, each with a short id: the increment's four-digit number (the folder name when two share it), or the worktree's folder name for a session handoff. `specweave pickup <id>` takes that one; it also accepts an increment number such as `874`, the folder name, or words from the title (`specweave pickup studio release`). Plain `pickup` takes the newest and lists the others, so the next session's "pick up" gets the next one; when the words fit more than one, it lists those and changes nothing. A pushed handoff from another machine is applied only when it belongs to the increment named. The SessionStart hook names the pending handoffs, and `AGENTS.md` and the handoff skill teach "pick up <id or title>". Run `specweave update` in a project to refresh its `AGENTS.md`.

### Fixed

- A session that hit the usage limit in a worktree or nested repository inside a project, or while several increments were active, wrote no handoff: the limit hook asked `specweave handoff` for the one active increment and gave up when there were several, and a worktree's edits were not in the root checkout it captured. The hook now saves a fresh local checkpoint of the session's own checkout and marks it as a handoff, which `handoff list` shows under the folder's name until `pickup` takes it. The mark is dropped when the same session goes back to work after its limit resets.

## [3.0.11] - 2026-10-10

### Changed

- Auto-handoff no longer stops a session at the threshold by default. The new default mode, `suggest`, gives one heads-up per usage window instead: the session tells you in one line that usage is at 96% of the 5-hour limit, when it resets, and that you can say "hand off", then keeps working. On 2026-10-10 three sessions on one account stopped at 91% of the weekly limit with their work half done and hours of usage left; a turn that really runs out still hands off by itself through the StopFailure hook, and local checkpoints cover the turns in between. `specweave auto-handoff on --mode enforce` keeps the old stop; `--mode checkpoint` (or `--checkpoint-only`) never acts on usage.
- The default threshold is 95% (was 90%).
- The reset rule: when every window at or past the threshold resets within 30 minutes (`--wait-under <minutes>`, 0 turns it off), the session neither suggests nor enforces a handoff, and a turn that hits the limit saves only a local checkpoint. Waiting a few minutes beats moving the work. The heads-up and the stop both say when the limit resets ("which resets in 2 h 10 min"). Desktop and Remote Control sessions, whose usage samples carry no reset time, borrow it from Claude Code's usage cache while it is still ahead.
- Settings written before this version move to the new defaults on upgrade: `suggest`, and 95 if the file held the old default of 90. A threshold you set yourself and checkpoint-only mode are kept.
- The status line shows "handoff available" in suggest mode, "hand off" in enforce mode, and "resets in 12 min" while it waits. `auto-handoff status` names the mode and the wait.
- `AGENTS.md` and the handoff skill treat Claude Code's "[Usage limit approaching" note as a heads-up to mention and keep working; "[Usage limit reached" is still the moment to hand off. Run `specweave update` in a project to refresh its `AGENTS.md`.

## [3.0.10] - 2026-10-10

### Fixed

- A Codex plan with credits is asked to hand off when the credits are about to run out. 3.0.9 stopped asking as soon as the plan reported any balance, but a balance can be spent in hours, and Codex has no hook for a turn that fails on the limit, so a session in a project then stopped with only its local checkpoint. With a window at the threshold, the Stop hook now reads back through the session log to the balances of the hour before the newest one and asks once when under 60 minutes are left at that rate ("credits are running out (about 8 min left at the current rate)"). Balances under two minutes apart, an unreported balance and an unlimited plan give no rate and never ask; the measurement restarts after a top-up (a record with no credits, or with less than half of the newest balance). Replayed over 1,975 real turn ends at 90% or more of a window with credits: asked at 38 of 43 in the last 30 minutes before the balance hit zero, and at none of 1,661 more than three hours before or with no exhaustion after.
- The Stop hook reads the Codex plan's own limit. Codex logs several limits in one session (`codex`, `gpt-reserve`, `premium`), and the hook took whichever was logged last in the final 256 KB, so a `gpt-reserve` record at 0% hid a plan window at 91% and a session that should have been asked was not; its credits flag came from the wrong record too. The hook now looks back for the plan's newest record through up to 64 MB of log, and uses another limit only when it finds none.
- The Claude Code status line no longer shows "hand off" outside a SpecWeave project, where since 3.0.9 nothing asks for one.
- `specweave auto-handoff status` shows the minutes of Codex credits left when the newest session log is under an hour old and gives a rate, and says when a session will be asked because they are running out.

## [3.0.9] - 2026-10-10

### Fixed

- The 90% Stop hook no longer asks a session outside a SpecWeave project to hand off. With `auto-handoff on`, a Codex Desktop chat opened with no folder (its working directory is your home folder) was told "Usage is at 100% of the weekly limit. Hand off now so no work is lost: run `specweave handoff`" and tried to save a handoff with nothing to hand off. The hook now asks only when the session's folder is inside a project (`.specweave/config.json` in it or above it), the rule the limit-hit hook already followed.
- A Codex plan with credits is no longer asked to hand off. Codex logs `credits` (`has_credits`, `balance`, `unlimited`) next to its 5-hour and weekly percentages; with a balance above zero, or an unlimited plan, it keeps working after a window reaches 100%, so the percentage is not a stop. Before, every Codex session on such a plan was blocked once per usage window. `specweave auto-handoff status` says so under the Codex line. Local checkpoints are still saved in both cases.

## [3.0.8] - 2026-10-10

### Fixed

- Inside SpecWeave Studio, Claude workers that a project coordinator delegated to no longer hand off at the usage threshold. Their `SPECWEAVE_STUDIO_THREAD_ID` (`thread:delegated-task:command%3A…`) contains `%`, which the guard rejected, so the Stop hook treated them as running outside Studio and asked them to run `specweave handoff`. Any non-empty value now counts as inside Studio; the id is only sanitized for the checkpoint filename, which still matches the one Studio reads.

### Documentation

- spec-weave.com plays a 61-second Studio tour on the home page and /studio, built from real screen recordings of Studio on a Mac: a coordinator splitting work into Codex and Claude workers, the Limits page, and a Claude thread at its usage limit continuing on Codex (the limit in that clip is simulated).
- The home page and /studio now present Studio as one workspace for every AI agent, mapping the agents people use today to what takes their place in Studio, with an honest status for each.

## [3.0.7] - 2026-10-09

### Added

- `specweave autocompact on|off|status` sets where Claude Code compacts a long session (`autoCompactWindow`, default 400K, `--at`, `--project`). On 1M-context models Claude Code otherwise waits until about 967K tokens, so every late turn resends close to a million cached tokens that count toward usage. `status` also shows per-model `/autocompact` values and Codex's `model_auto_compact_token_limit`.
- `specweave init` writes `"autoCompactWindow": 400000` to the new project's `.claude/settings.json`. It changes nothing on 200K models; `specweave autocompact off --project` removes it.

### Changed

- Auto-handoff hands off at 90% again. `auto-handoff on` restores the 3.0.3 behaviour: the Stop hook asks the session once per usage window to run `specweave handoff` when any window reaches the threshold (`--at`), and a Claude Code or Grok Build turn that fails on the rate limit hands off from the StopFailure hook. The 3.0.6 local checkpoints stay: every hook still saves one between handoffs. Settings written by 3.0.6 have no mode and hand off again after upgrading.
- `auto-handoff on --checkpoint-only` keeps the 3.0.6 behaviour for plans where credits or a proxy keep working past the limit: only local checkpoints, never a stop. `--handoff` switches back; `on` without either keeps the stored mode.
- `specweave pickup` shows the newest local checkpoint of the worktree when it is newer than the last handoff (`Local checkpoint: session … → <document> + <diff>`). 3.0.6 wrote checkpoints that nothing read.
- Inside SpecWeave Studio (`SPECWEAVE_STUDIO_THREAD_ID` set by Studio) the hooks never steer the model, since Studio switches provider between turns; they save the checkpoint and also write it to `~/.specweave/checkpoints/studio/<thread>.json`, shared by every provider in that thread.

## [3.0.6] - 2026-10-08

### Changed

- `auto-handoff on` now queues silent, detached local checkpoints after turns, throttled to five minutes per canonical worktree and session. Claude Code and Grok `rate_limit` failures queue the same worker. Saving uses no model or network, never stops work on quota, pushes or releases claims. Successful saves publish a local `current.json` receipt pointing to the saved handoff document and diff; `auto-handoff status` shows the checkpoint directory. Explicit `handoff` still transfers ownership and pushes; `pickup` does not apply automatic checkpoints.
- Existing enabled settings adopt the new behavior when the CLI is upgraded, with unchanged hook commands. Legacy `--at` is accepted without setting a threshold. Generated instructions and the handoff skill no longer treat usage warnings as orders to stop.

## [3.0.5] - 2026-10-08

### Added

- OpenAI Decisions is an optional Jev provider (`specweave jev setup --provider openai`), with typed answers, bounded requests, usage receipts, and fail-closed parsing. Existing TypeSafe defaults and deterministic authorization stay unchanged.
- Claude Code gets a `StopFailure` hook from `specweave auto-handoff on`. When a turn fails on the usage limit before the 90% Stop hook could ask (one long turn can jump past it), the hook writes and pushes the handoff itself, as Grok Build's already did.
- `specweave auto-handoff status` shows whether each tool's hooks are in place and the last usage Claude Code and Codex reported, and says to run `on` again when something is missing.
- `specweave handoff --all` writes one index of every active increment (tasks done, open criteria, what it waits on, a resume prompt) plus every nested checkout with local-only work, and `specweave pickup --all` prints it with the increments you can act on first. It commits and pushes nothing. A hand-written `handoff.md` is no longer overwritten; the generated doc goes to `handoff.auto.md`, and `<!-- keep -->` blocks survive the next handoff.
- Releases can be cut from GitHub alone: run the Release & Publish workflow on `develop` and it bumps, commits, tags and publishes.

### Fixed

- Stable releases refuse to replace npm `latest` with an older version, protecting concurrent release branches. Prereleases always use the `next` tag.
- Claude Code no longer shows the 90% handoff request as "Stop hook error occurred". The Stop hook now passes it as context for the model and shows you "Auto-handoff: usage is at 92% of the 5-hour limit, so this session is handing off". Codex still gets a block, which is what it reads.
- `specweave pickup` writes a `pickup` line to the ledger once per handoff, also when the handoff was made in the same checkout or kept local. Before, only a pickup that applied edits from git was recorded, so reports of handoffs between tools on one machine said "0 pickups".
- Desktop, Remote Control and `claude -p` sessions run no status line, so the Stop hook never had a usage reading there. It now falls back to the desktop app's usage samples (`plan-usage-history.json`, newest sample of the session's organization, under 20 minutes old) or Claude Code's own usage cache in `~/.claude.json` (under an hour old), whichever is fresher. `auto-handoff status` says that such sessions otherwise hand off when a turn hits the limit.
- `auto-handoff status` says when Codex has not trusted the Stop hook yet (Codex skips it until you approve it in a terminal).
- The 90% Stop hook asked a session to hand off once and never again. A session that kept going after its 5-hour window reset was unguarded in the next window. It is now asked once per usage window.
- A session the Stop hook had already asked to hand off was skipped by the limit-hit hook, so edits made after the 90% handoff were not handed off when the limit hit. The two hooks now keep separate markers.
- `specweave update` no longer leaves an empty `# SpecWeave (added by specweave update)` header in `.gitignore` after removing the old log negations.

## [3.0.3] - 2026-09-26

### Fixed

- `specweave update` no longer rewrites `vskill.lock`. When a bundled plugin hash was out of date, the health check replaced the project lock with its merged view, dropping `version`, `createdAt` and every agent but one. Corrected hashes now go to `~/.specweave/plugins-lock.json`, and the project lock is only read.
- `specweave update` and `specweave doctor` no longer delete a child repo's `vskill.lock` in an umbrella project. That file belongs to the child repo.
- The update health check no longer reports "outdated: v3.0.2 (latest: v3.0.1)". It compared versions for equality against a cached registry answer; it now compares them as versions and re-asks npm when the cache is older than the running CLI.

### Changed

- `task done --run` writes its evidence to `reports/task-T-NN.txt` instead of `.log`, so a project's `*.log` rule no longer hides it and no negation is needed. `specweave update` removes the `!…/reports/*.log` and `!…/reports/task-T-*.log` lines that 3.0.0 to 3.0.2 added, so old logs are ignored again.

## [3.0.2] - 2026-09-26

### Fixed

- `specweave update` no longer deletes folders under `.specweave/increments/`. 3.0.0 and 3.0.1 removed any underscore folder they did not recognise, such as `_research-*` or `_scratch-*`, even when it was tracked in git.
- `specweave update` no longer un-ignores old logs. 3.0.0 and 3.0.1 appended `!.specweave/increments/**/reports/*.log` to `.gitignore`, which made every log under `reports/` show up as a new file. Update now replaces it with `!.specweave/increments/**/reports/task-T-*.log`, so only the evidence log that `task done --run` writes and the ledger cites is committed.

## [3.0.1] - 2026-09-26

### Fixed

- `specweave update` no longer deletes `~/.specweave` or any `.specweave/` folder above the project. In 3.0.0, running it in a project three or fewer folders below your home directory removed `~/.specweave` (plugin lock, hook settings, auto-handoff settings, logs) as a "stale" folder. Update now never deletes anything outside the project. `init` still offers, with a prompt, to remove a stale parent folder and never touches the home one.
- `specweave update --dry-run` works as an alias for `--check`.

## [3.0.0] - 2026-09-25

A redesign from an audit of 2.3. Handoff between tools and accounts is two words, an increment is one file, and a third of the code is gone.

### Added

- "Hand off" and "pick up". `specweave handoff` releases your claims, records why you stopped, and pushes the branch plus a snapshot of uncommitted edits to `specweave-handoff`. `specweave pickup` brings that work into any clone, tool, account or cloud session and prints the next task with its acceptance criteria. A checkout on the default branch switches to the handed-off branch; any other branch, such as a cloud thread's, continues where it is. `AGENTS.md` maps the phrases to the commands for every tool.
- `specweave auto-handoff on`: a session hands off by itself at 90% of the plan's 5-hour or weekly limit (`--at` to change). Claude Code reports usage through `specweave statusline`, which wraps any status line you already have; Codex through a Stop hook that reads its session log. Both use `specweave usage-guard` as the Stop hook. `off` restores your settings. Separately, when Claude Code's own "[Usage limit approaching" or "[Usage limit reached" note appears in a session, `AGENTS.md` and the handoff skill tell the agent to run `specweave handoff` as its checkpoint.
- `specweave report`: an HTML timeline of who did what on an increment (tools, sessions, claims, test evidence, handoffs, pickups), generated from the ledger.
- `specweave note "<text>"`: leave a message on an increment for whoever works on it next.
- `.specweave/memory/`: committed project memory in the Claude Code Projects format, shown by `pickup`.
- Agent identity detects Claude Code, Codex, Grok, Cursor, Gemini CLI, Copilot and OpenCode; cloud sessions are `<tool>@cloud`; `SPECWEAVE_TOOL` and `SPECWEAVE_HOST` override. Claims record the tool's session id.

### Changed

- New increments are one `spec.md` with a `## Tasks` section. State lives only in `ledger.jsonl`; `tasks.md` is never rewritten. Existing increments with `tasks.md` work unchanged.
- Acceptance criteria are met when the tasks covering them are done; `verify` derives it. `task next` and `task claim` print the AC text.
- `AGENTS.md` is the one instruction file (about 800 tokens, down from 1,860). `CLAUDE.md` is `@AGENTS.md` plus Claude-only lines.
- One skill source for Claude Code, Codex and Grok: 11 skills (`qa` folded into `review`, `task` into `do`).
- `init` writes only what a project needs: no docs scaffold, no background job, no git hook unless `--git-hooks`, no TDD defaults, no lockfile in `.gitignore`, no write to the global Claude settings (only `auto-handoff on` changes them, when you run it).
- The PreCompact hook writes a checkpoint and keeps claims.
- The handoff diff and file list leave out SpecWeave's own bookkeeping.

### Removed

- About 280,000 lines of unreachable code and its tests.
- Commands: `living-docs`, `jobs`, `sync-living-docs`, `docs`, the hidden `sync-*` aliases and `validate-jira`, `analytics`, `analytics-push`, `cache`, `commits`, `interview`, `decision-log`, `export-skills`, `detect-intent`, `detect-project`, `scan-skill`, `scan-plugins`, `judge-skill`, `session`, `health` (use `doctor`), `status-line`, `evaluate-completion`, `install`, `list`, `hook`, `resolve-structure`, `migrate-to-umbrella`.
- Tracker calls on status changes. Only `specweave sync` touches GitHub, Jira or Azure DevOps.

### Upgrade

`npm i -g specweave@3 && specweave update`, then `specweave auto-handoff on` if you want handoffs to start by themselves. See "Upgrade to 3.0" in the README.

## [2.3.0] - 2026-09-22

### Added

- Portable project hub for software, research, content and operations in any local folder, including folders without Git.
- Shared project goals and context, artifact references, reusable routine definitions and fresh coordinator or worker briefs for Codex, Claude Code and other tools.
- Project dashboard with revision conflict recovery, assignment creation, file downloads and responsive desktop, tablet and phone layouts.
- `specweave project` CLI and the portable `sw:project` skill. Existing intent work and evidence remain authoritative; routines do not create schedules.

### Fixed

- `specweave update --check` now keeps plugin refresh read-only and reports planned changes without installing them.
- Filesystem discovery now requires an actual project, skips symlinks and respects depth bounds. LSP and dashboard commands stop safely outside projects; `save` targets the enclosing Git repository and fans out only from a project root or with `--all`.
- Codex installs native skills under `.agents/skills/sw-*`, verifies each project's installed files and preserves legacy and custom skills. Changed installations are backed up before replacement; executable resources retain their modes.
- Concurrent CLI and dashboard intent writes use the same exclusive lock. Project hub writes reject stale revisions, corrupt input and symlinked managed paths.

This is an additive minor release. Native agent execution, connector permissions, hooks and schedules remain under the host application's control. The dashboard now shares the current website's paper, ink, rust accent, surface, control and typography tokens; fonts are bundled for offline use. Existing project data needs no breaking migration.

## [2.2.3] - 2026-09-22

### Fixed

- Jev now validates provider answer types, choices and numeric bounds before a decision can be consumed.
- Secret masking covers question text and complete PEM private-key blocks, as well as request state. Masking remains heuristic and does not make arbitrary private input safe to send.
- Commands with output-writing or helper-execution flags no longer qualify for the read-only guard shortcut.
- Headless browser delegation rejects off-domain navigation before sending the main-frame request, including redirects. This is a navigation boundary, not a firewall for page subresources.

### Changed

- The website now explains Jev through a bounded EasyChamp read-routing use case, downloadable replay results, and a controlled comparison of the actual chat handler with live models and fixture API data.
- Mobile layouts use larger text, accessible controls and a single-column work board. Premium artwork is identified separately from measured evidence.
- Documentation distinguishes classifier accuracy, observed handler behavior, and unmeasured production productivity. Jev remains optional; deterministic permissions and fallback paths remain necessary.

## [2.2.2] - 2026-09-21

A prompt audit of the whole instruction surface against the repo's own target model
(`claude-opus-4-8`), plus the dead-code sweep it turned into. Four of the findings were
live defects, not style.

### Fixed

**The Anthropic provider could not complete a request.** Every call sent `temperature`
(default `0.3`), which Opus 4.7+ and Sonnet 5 reject with a 400 — and `analyze()`
re-throws on 400 without retrying, so the path was dead rather than degraded. Sampling
params are now forwarded only to models that still accept them (`sonnet` → Sonnet 4.6 and
`haiku` → Haiku 4.5 both do), decided by a new `src/core/llm/model-capabilities.ts`.

**`AnthropicProvider.isAvailable()` always returned `false`.** `getStatus()` called
`client.messages.count_tokens`, the Python spelling; the TypeScript SDK exposes
`countTokens`.

**The LLM judge ran with thinking switched off.** Increment 0669's "Opus 4.7 alignment"
recorded that 4.7 "no longer benefits from the `thinking` API parameter — adaptive
thinking is triggered by a prompt hint". What 4.7 removed is `budget_tokens`; adaptive
thinking *is* the parameter (`thinking: {type: "adaptive"}`), and depth is
`output_config.effort`. Omitting `thinking` on 4.7/4.8 means no thinking at all. The judge
now sends adaptive thinking plus an effort level (default `high`) on every model that
accepts them (Opus and Sonnet 4.6+; Haiku 4.5 predates adaptive thinking and gets
neither), and `max_tokens` rose from 2000 to 8000 so thinking tokens do not crowd out
the verdict.
`isOpus47Family()` and the `ThinkingBudget` type are gone; `quality.thinkingBudget` is
replaced by an `effort` option.

**`SkillJudge` sent `'opus'` as a model id.** It never called `resolveModelAlias`, so the
request failed and `judge()` silently fell back to keyword pattern-matching.

**Bedrock priced Opus 4.x at $15/$75 and Haiku at $0.25/$1.25** — those are Opus 3 and
Haiku 3 rates. Both corrected to $5/$25 and $1/$5. The dashboard cost map had no
`claude-opus-4-8` row, so sessions on the default model were left unpriced.

**A suggestion pointed at a deleted skill.** `skill-gen` still printed "Run sw:skill-gen
to generate project skills"; that skill was removed in 2.0.

### Changed

**Structured outputs replace the "respond with ONLY valid JSON" scaffolding** in
`analyzeStructured`, the security judge, the skill-refine diff proposer and the skill-gen
signal collector — where the model supports them. Schemas are normalised to the strict
shape the API requires (`additionalProperties: false`, every property required), and the
prompt-based fallback is kept for models that cannot do structured outputs, notably
Sonnet 4.6, which the `sonnet` alias resolves to.

**The retired-phrase linter now runs in CI.** `plugins/specweave/.lint/skill-lint.ts` was
imported by nothing but its own test, which is how `[Extended thinking: …]` survived in
`skills-optional/tdd-cycle`. Its two checks are ported into the zero-dependency
`scripts/lint-skills.mjs`, extended to `skills/` and `skills-optional/`, made
case-insensitive, and taught to ignore fenced blocks and lines that document the
retirement. Coverage went from 37 files to 43.

**Instruction files no longer name a surface 2.0 deleted.** `CLAUDE.md` and `AGENTS.md`
still advertised `sw:validate`, `sw:progress`, `sw:progress-sync`, `sw:sync-docs`,
`sw:docs`, the whole `sw-github:` / `sw-jira:` / `sw-ado:` namespace, and three subagents
(`sw-pm`, `sw-architect`, `sw-planner`) that do not exist — 19 of 24 references were
dangling. They also documented the removed `reflect`, `apiDocs`,
`testing.defaultTestMode` and `testing.tddEnforcement` config keys. (The shipped
`src/templates/*.template` files were already correct; this was the repo's own copy.)

**Dated prompt patterns removed across the instruction surface.** Pressure language
("BRUTAL HONESTY", "You MUST Check", "BE STRICT", "No Laziness", "Be thorough and
strict"), over-planning prose, strategy coaching ("use subagents liberally", "would a
staff engineer approve this?"), a required-reading gate in the diagrams skill pointing at
a file that does not exist, an activation-keyword list inside a skill body that only loads
after the skill triggers, and one sentence repeated twelve times in `tdd-cycle`. The team
agent protocol lost a 42-line "Workflow Mode" section gated on `quality.workflows.*` — a
config key 2.0 strips, so the gate could never be true — and its fixed STATUS cadence
became an event trigger. Prompts that claimed mechanisms the code does not implement
("team-lead's stuck detection reads these", "`/sw:increment` is blocked without it") now
describe what actually happens.

### Removed

**3,285 lines of unreachable code**, verified by import-graph analysis and an adversarial
refute pass, then by a clean `tsc` and full test run:
`src/cli/helpers/init/` — `api-docs-config` (which wrote the removed `apiDocs` key),
`brownfield-analysis`, `testing-config`, `bitbucket-repo-cloning`, `claude-settings-lsp`,
`plugin-install-flags`, `ado-repo-cloning`, `prompt-flow`, `umbrella-cloning`,
`multi-project-folders`; and `src/core/fabric/contradiction-detector`. Nothing reached any
of them except its own test file, where one existed; those tests are removed with them.

## [2.2.1] - 2026-09-21

### Fixed
- Jev Bash guard: a fourth deny arm. When Jev is confident a command destroys data (`destructive` at or above `guardWarn`) but splits the scope between `local_irreversible` and `destructive_remote` — a `deleteMany` against a database whose location it cannot see scored 0.50 / 0.45 — neither scope alone cleared `guardDeny` and the verdict fell to `warn`. The two irreversible scopes are now summed; at or above `guardDeny` the command is denied.

## [2.2.0] - 2026-09-21

### Added
- Jev (TypeSafe System One) integration: `specweave jev doctor | setup | ask | route | task | guard | screen | failure | browse | usage`. Jev answers closed-set questions — choice, score, noul — with calibrated probabilities and a schema it cannot violate, in roughly a quarter of a second for a fraction of a cent, so agents stop spending frontier-model turns on decisions that are a pick from a list.
- Two providers: OpenRouter (default, model `jev-1.13`) and TypeSafe direct (model `jev-latest`). `.specweave/config.json` stores only the NAME of the environment variable holding the key, never a key value. No new npm dependency — the API is a single POST; Playwright is imported lazily and only by `jev browse`.
- Jev is off until `jev.enabled` is explicitly true, written by `specweave jev setup` after a live ping. `SPECWEAVE_JEV=0` disables it for one process, `SPECWEAVE_JEV=1` enables it ad hoc. `specweave jev doctor` reports provider, model, key source and live latency, and exits 4 when Jev is unavailable so agents can continue without it.
- A reviewed question catalog: task complexity, request kind, skill route, needs-increment, command scope, command destructiveness, acceptance-criterion satisfaction, test-failure kind, test-output passed, prompt injection, duplicate issue.
- Opt-in routing: with `jev.enabled` and `jev.modelRouting`, `selectModelTierForTask()` asks Jev and falls back to the existing keyword heuristic below the confidence threshold or on any error. The live surface for the same judgement from the shell is `specweave jev task T-NN`; nothing silently re-routes model tiers inside task generation. The auto-mode completion evaluator's binary check is **downgrade-only**: a Jev noul can mark an exit-0 run as failed, and can never turn a failed run into a pass. Both paths are unchanged when Jev is disabled.
- Opt-in Bash guard, per project: `specweave jev setup --guard-bash` sets `jev.guards.bash` in `.specweave/config.json`, writes the marker `.specweave/state/jev-guard.enabled`, and registers a project-level Claude Code hook in `.claude/settings.json` (`hooks.PreToolUse`, matcher `Bash`, running `node "<installed specweave>/plugins/specweave/hooks/run.mjs" pre-tool-use`). `specweave jev setup --no-guard-bash` removes all three, and `specweave jev doctor` shows the marker and the project hook. A deny verdict blocks the command and reports the probabilities behind it; a warn verdict is surfaced as additional context; any error, timeout, missing key or disabled config passes the command through. This is a Claude Code surface — other tools (Codex, Cursor, Gemini CLI) call `specweave jev guard "<command>"` explicitly before running anything unattended.
- The guard's regex prefilter skips Jev entirely for `npm test`, `npm run build` / `test` / `lint`, `pnpm test`, `yarn test`, `cargo test`, `go test` and plain read commands (`ls`, `cat`, `grep`, `rg`, `find`, `git status` / `log` / `diff` / `show`, …), so project-defined scripts are trusted by the guard and the common case costs nothing.
- Every `specweave jev` call sends its question state to the configured provider (OpenRouter or TypeSafe) under the user's own key: prompt text, task titles and acceptance criteria, the shell command, test-output tails, screened text, and page text and element names while browsing. Secret-shaped values — tokens, `--password` / `--token` flags, `KEY=value` assignments, bearer headers and URL credentials — are masked heuristically before the request and the number of masked values is reported, but the masking is best-effort and never a guarantee.
- `specweave jev browse --goal … --url …`: a headless browser loop where Jev picks the next click, scroll, back or done from the observed interactive elements. It never opens a visible window, stays on allowed origins, skips sensitive controls unless `--allow-sensitive`, and types only values supplied with `--input`.
- Append-only usage ledger at `.specweave/state/jev-usage.jsonl` with tokens, cost and latency per call, totalled by `specweave jev usage`.
- `/sw:jev` plugin skill and the portable `sw-jev` skill for non-Claude tools, plus a `jev` section in the CLAUDE.md and AGENTS.md templates that is rendered only when Jev is enabled, and a docs guide.

### Changed
- **Default hooks are unchanged from 2.1.0: `SessionStart` and `Stop`.** PreToolUse is *not* re-registered in `plugins/specweave/hooks/hooks.json`, so upgrading to 2.2.0 does not switch the status-completion guard back on for every project. The Bash guard is opted into one project at a time with `specweave jev setup --guard-bash`, which registers its own `PreToolUse` entry in that project's `.claude/settings.json`; PreToolUse and PreCompact remain callable compatibility handlers without default registration.
- The PreToolUse fast path keeps the opted-in guard cheap: a Bash command with no `.specweave/state/jev-guard.enabled` marker, and Write or Edit outside `.specweave/increments/`, return `{}` from `run.mjs` without spawning a worker or loading the CLI. The guard's escape hatch is an environment variable set in the shell that launches the agent (or `specweave jev setup --no-guard-bash`) — a bypass prefix typed in front of a command is ignored, because a denied command is the user's to approve, not the agent's to route around.

## [2.1.0] - 2026-09-14

### Added
- Local intent board with optional increment links, persistent state, drag-and-drop and keyboard controls, current ledger evidence, and live file refresh.
- Execution history separates declared setups, ledger actors, and observed Codex/Claude Code metadata. Sessions can be explicitly associated with intents; unavailable facts remain unknown. Reading the board makes no model calls.
- Redesigned product website and guides centered on portable intent, evidence, and optional enterprise integrations.

### Fixed
- Read modern task ledger state and acceptance criteria in the dashboard instead of relying on stale rendered checkboxes.
- Bind the dashboard to loopback and reject mismatched browser origins/hosts.
- Report incomplete external-provider pulls, preserve successful partial results, return failure status, and honor the configured GitHub target.
- Preserve supported session IDs in the auto-mode hook fast path.
- Keep exact model identities and display unknown or incomplete usage estimates without inventing totals.
- Isolate corrupt intent records and share validation between the dashboard, startup context, and handoffs.
- Carry lightweight intents into startup context and preserve owned handoff pointers when project folders move.

### Changed
- Default hooks are SessionStart and Stop. Ordinary Stop events exit before loading the CLI; explicit auto mode retains its continuation hook. PreToolUse and PreCompact remain callable compatibility handlers, without default registration.
- Small self-contained work can use a lightweight intent. Existing user authorization carries through planning and implementation.

## [2.0.3] - 2026-09-06

### Fixed
- Use quoted hook command strings compatible with Codex instead of ignored argument fields, and validate the same format in doctor.
- Enforce hook deadlines in a supervisor process, terminate stalled workers, and preserve streamed UTF-8.
- Capture handoffs through a private Git index with a shared execution budget, preserving user staging even during interruption.

## [2.0.0] - 2026-09-02

SpecWeave 2.0 keeps the parts of 1.x the evidence showed people used, and deletes the rest. Full narrative: https://spec-weave.com/docs/guides/specweave-2

### Breaking changes

**Skills: 51 → 10.** The `sw` plugin now ships `increment`, `do`, `done`, `review`, `team`, `handoff`, `sync`, `auto`, `brainstorm`, `qa`. 34 of the 51 1.x skills were never invoked once; 11 more were deprecated stubs.

- `sw:grill`, `sw:code-reviewer`, `sw:judge-llm`, `sw:pr-review`, `sw:validate` → **`sw:review`** (one fresh-context adversarial pass; every finding cites `path:line`).
- `sw:team-lead`, `sw:team-merge`, `sw:team-build` → **`sw:team`**.
- `sw:pm`, `sw:architect`, `sw:plan` → **`sw:increment`** (the Approach section absorbed `plan.md`).
- `sw:tdd-red`, `sw:tdd-green`, `sw:tdd-refactor` (deprecated stubs, 0 invocations) → deleted; the RED → GREEN → REFACTOR loop is described inside **`sw:do`**. `sw:tdd-cycle` itself moved to `skills-optional/`.
- `sw:sync-docs`, `sw:progress-sync`, `sw:sync-setup`, `sw:import`, `sw:github-sync`, `sw:jira-sync`, `sw:ado-sync` → **`sw:sync`**.
- `sw:next`, `sw:progress`, `sw:close-all`, `sw:doctor`, `sw:jobs`, `sw:analytics`, `sw:lsp`, `sw:docs`, `sw:living-docs`, `sw:help`, `sw:framework` → the CLI (`specweave task next`, `specweave status`, `specweave doctor`, …).
- `sw:e2e`, `sw:debug`, `sw:diagrams`, `sw:release-expert` (with `sw:tdd-cycle`) → out of the core plugin and into `skills-optional/`, installable on their own: `npx vskill install anton-abyzov/specweave/skills-optional/<name>`.
- `sw:image`, `sw:video`, `sw:remotion`, `sw:npm`, `sw:skill-gen`, `sw:skill-refine` and the Jira/ADO mapper + resource-validator skills → deleted outright, not redistributed.
- The whole `commands/` plugin namespace (73 `.md` files) is gone.
- The per-provider `sw-github:`, `sw-jira:` and `sw-ado:` namespaces are gone. Use `sw:sync` / `specweave sync push --provider <name>`.

**New: five standalone skills.** `sw-increment`, `sw-do`, `sw-task`, `sw-review`, `sw-handoff` under `skills/`, distributed through vskill for non-Claude tools. Each spells out the file formats and a manual shell/PowerShell procedure, so they work with no CLI installed.

**Closure: `verify.json` replaces the three-report pipeline.** 1.x blocked `complete` on `grill-report.json` + `code-review-report.json` + `judge-llm-report.json`; all three were present for 33% of closed increments in practice. The only blocking check is now `reports/verify.json` with `ok: true`, written by `specweave verify` from the project's own commands. Grill/judge/rubric reports are optional evidence and never block. A missing `reports/review.md` produces a one-line notice.

**Config: exact key surface.** Accepted top-level keys are `version`, `project`, `adapters`, `workspace`, `testing`, `limits`, `planning`, `auto`, `sync`, `livingDocs`, plus `lsp`, `cicd`, `repository`, `issueTracker`, `hooks`, `plugins` (kept because live code still reads them). Anything else warns once and is ignored.

- Removed outright: `contextBudget`, `quality`, `cache`, `deduplication`, `archiving`, `apiDocs`, `statusLine`, `incrementAssist`, `billing`, `translation`, `language`, `documentation`, `reflect`, `pluginAutoLoad`, `grill`, `codeReview`, `qualityGates`, `skillGen`.
- Removed `hooks` sub-keys: `banner`, `post_increment_planning`, `post_task_completion`.
- Removed with `reflect`: the `sw:reflect` skill, the `specweave reflect-stop` command, the session-end nudge, skill-memory pruning and `.specweave/state/reflect-config.json` (deleted on `update`).
- Removed `testing` sub-keys: `defaultTestMode`, `defaultCoverageTarget`, `coverageTargets`, `tddEnforcement`, `playwright`.
- Removed `sync.mode` — the queued event-queue path dropped events on a partial flush.
- Renamed: `testing.defaultTestMode` → `testing.mode`; `testing.coverageTargets` → `testing.coverage`; `limits.maxActiveIncrements` → `limits.activeIncrements`; `hooks.*.sync_living_docs` → `livingDocs`; `planning.deepInterview.{enabled,enforcement}` → `planning.deepInterview` (`off` | `warn`); `umbrella` / `multiProject` / `projectMappings` → `workspace`.

**Hooks: new exec-form format.** Four hooks (`SessionStart`, `PreToolUse` on `Write|Edit`, `Stop`, `PreCompact`), all `"command": "node"` with `args`, no shell. 1.x wrapped every hook in `bash -c '…'`, which made them dead on Windows without a POSIX shell. Removed: the `UserPromptSubmit` banner hook, the `PostToolUse` hooks, the `TeamCreate` matcher and the no-op Stop handlers. `Stop` is now the `sw:auto` loop driver and nothing else; handoff automation moved to `PreCompact`.

**Increment status vocabulary.** The 2.0 set is `planned`, `active`, `paused`, `completed`, `abandoned` (`backlog` and `ready_for_review` are still read for 1.x increments). `planning` — what 1.x `create-increment` wrote — is now `planned`, and 20+ hand-written spellings (`in-progress`, `superseded`, `done`, `blocked`, …) are migrated on read instead of vanishing from `specweave status`. An unrecognised status is surfaced, not silently coerced.

**`create-increment` now starts an increment `active`.** `task next|claim`, `verify` and `handoff` all resolve the single active increment, so creating in any other state stranded every bare-id command behind a hand-edit of `metadata.json`. Pass `--planned` for backlog-style creation and `specweave start <id>` when you pick it up.

**Removed CLI commands.** `specweave logs` (superseded by `hooks log`), `reflect-stop`, `revert-wip-limit` (the cap it reverted is gone), `set-sync-target` (folded into `sync push`), `sync-flush` / `sync-scheduled` / `sync-task` (removed with queued sync mode) and `validate-jira` (folded into `sync setup --validate`).

**WIP cap is advisory.** `limits.activeIncrements` (default 3) prints one info note when exceeded and blocks nothing. The 1.x hard cap is gone. `0` disables the note.

**Living docs off by default.** `livingDocs: false`. Set `"onDone"` to regenerate on closure. The diagram and JPG generators were removed — the generated tree was never read.

**Templates rewritten.** The 328-line and 460-line increment templates are gone. `spec.md` is Problem / Scope / ACs / Approach / Open questions; `tasks.md` is `### T-01 Title` plus one field line (`- AC: … | Files: … | Test: …`). `plan.md` is optional overflow (`create-increment --with-plan`) and still recognised on legacy increments. `CLAUDE.md` and `AGENTS.md` templates fit on one page.

**Jira and Azure DevOps are opt-in and limited.** Push and close work. The multi-project, board-import, hierarchy-mapping and per-project field-mapping stacks are removed.

### Added

- `specweave task <action>` — the multi-vendor append-only ledger: `whoami`, `list`, `next`, `claim`, `done`, `release`, `block`, `skip`, `render`. Every write re-renders the `<!-- SW:BOARD -->` table in `tasks.md`.
- `specweave verify [id]` — runs `testing.commands[]` (or auto-detects test/lint/build), writes `reports/verify.md` + `reports/verify.json`.
- `specweave create-increment --supersedes NNNN` — abandons the increment it replaces with a matching `closeReason`.
- `specweave complete --all --reason "<why>"` — batch triage closure.
- `specweave hooks log` — recent hook warnings, errors and blocks from `.specweave/logs/hooks.jsonl`.
- `specweave gc` — purge stale `.specweave/state` files (dry run by default).
- `specweave sync <push|pull|status|setup>` — one command group replacing the per-provider commands; `push --provider github|jira|ado` narrows it to one tracker.
- `specweave start <id>` — move a planned, backlog or paused increment to `active`.
- `specweave update` now writes `.gitattributes` (`**/ledger.jsonl merge=union`) and the 2.0 `.gitignore` entries.
- `specweave doctor` gained config-shape, instruction-file-reference and hygiene checks (leftover `{{` placeholders, tracked files over 5 MB under `increments/`, tracked files under `.specweave/state`, `node` on PATH).
- `npm run lint:skills` — fails on a `name:` frontmatter field, on model/effort/context pins, and on any `specweave <cmd>` or `sw:<name>` reference that does not resolve.
- `npm run lint:docs-refs` — the same guarantee for the documentation site.
- Supply-chain guard on the repo itself: `.npmrc` sets `ignore-scripts=true`, `npm run setup` rebuilds the few packages that legitimately need install scripts, `npm run security:scan` looks for the obfuscated-payload signature, and CI installs with `--ignore-scripts`. `specweave doctor` reports whether a project's own `.npmrc` does the same. Contributor-facing only — npm never publishes `.npmrc`, so installing `specweave` is unchanged.
- `npm run release` / `npm run release:preflight` — the publish path no longer depends on `prepublishOnly`, which the repo's own `ignore-scripts=true` suppresses. The preflight inspects the tarball `npm pack` would upload and refuses a publish whose `bin/`+`dist/` are missing or older than `src/`.

### Migration

```bash
npm i -g specweave@2
specweave update
specweave doctor
```

1. `specweave update` is idempotent. It rewrites the managed sections of `CLAUDE.md` and `AGENTS.md`, strips the 1.x sections by their known headings, and preserves your `## Commands` and `## Project notes`. Backups land in `.specweave/backups/`.
2. The config migration runs in one pass on load and rewrites the file at most once. What it deleted is recorded in `.specweave/state/config-migration-2.json`.
3. Fill in `testing.commands[]` — it is what `specweave verify` runs and therefore what the closure gate checks. Leave it empty to auto-detect.
4. Replace any scripted references to removed skills using the mapping above. `npm run lint:skills` and `specweave doctor` will find the ones you miss.
5. If you used `sync.mode: "queued"`, the key is deleted; sync is now a direct call. Re-run `specweave sync status` to see the real state of the tracker.
6. If you relied on generated living docs, set `"livingDocs": "onDone"` explicitly.
7. Existing increments keep working: legacy `plan.md` is still read, and a task with a ticked checkbox but no ledger events still counts as done.

## [1.0.593] - 2026-07-15

- Patch release

## [1.0.592] - 2026-06-16

- Patch release

## [1.0.591] - 2026-06-04

- Patch release

## [1.0.590] - 2026-06-03

- Patch release

## [1.0.589] - 2026-06-03

- Patch release

## [1.0.588] - 2026-06-02

- Patch release

## [1.0.587] - 2026-06-02

- Patch release

## [1.0.586] - 2026-05-25

### CLI install and workspace migration audit

- Added `specweave context projects` so documented project/board discovery works from the installed CLI.
- Fixed `specweave get` for current `workspace.repos` configs, including idempotent local repo registration and canonical relative paths under `repositories/{org}/{repo}`.
- Persisted legacy umbrella/multiProject config migration after the first read to stop repeated migration noise.
- Moved generated increment rubric placeholders from the increment root to `reports/rubric.md` to obey increment folder rules.

## [1.0.585] - 2026-05-08

- Patch release

## [1.0.584] - 2026-05-04

- Patch release

## [1.0.583] - 2026-04-29

- Patch release

## [1.0.582] - 2026-04-28

- Patch release

## [1.0.581] - 2026-04-22

### Hotfix: multi-provider closure via `externalLinks` fallback (increment 0696)

`specweave complete <id> --yes` now reliably closes JIRA epics and ADO work
items that are linked only via `metadata.externalLinks.{jira,ado}` (the
current standard), not only via per-user-story frontmatter or legacy
`metadata.{jira,ado}` paths. This fixes the `SWE2E-861` reproduction where
JIRA epic closure silently did nothing.

- `SyncCoordinator.closeJiraIssuesForUserStories` and
  `closeAdoWorkItemsForUserStories` now consult four fallback sources (per-US
  frontmatter → per-US `external_id` → legacy metadata → `externalLinks.*`)
  and dedup candidate keys before closure.
- Per-provider closure errors propagate into the returned `SyncResult.errors`
  and into `LifecycleHookDispatcher` `result.syncErrors`.
- `LifecycleHookDispatcher.logError` now persists errors to
  `.specweave/logs/hooks.log` (exception-safe, swallow-and-fallback to stderr
  on a read-only filesystem).
- Added warning line + `result.errors` entry when a provider is enabled but
  no issue key is resolvable — no more silent zero-closure runs.

No config migration required.

## [1.0.580] - 2026-04-20

- Patch release

## [1.0.580] - 2026-04-20

### Skill Refinement Loop (increment 0671)

**New skill:**
- `sw:skill-refine <skill-slug>` — propose an AI-authored unified diff against an existing skill's `SKILL.md` using accumulated gate-failure evidence. Flags: `--dry-run`, `--show-signals`, `--scope project|user`, `-n/--last-n <N>`. Haiku runs at `temperature=0` for determinism. On approve: writes the diff, creates `git commit -m "refine(<skill>): <rationale>"`, and appends a ledger entry to `.specweave/state/skill-refinements.json`.

**Signal schema v2:**
- `.specweave/state/skill-signals.json` extended with `type: "refinement"` entries `{source, targetSkill, severity, incrementId, evidence, detectedAt, consumedBy}`. Existing v1 (generation-only) files auto-migrate on first read with no data loss.
- Three closure gates now emit refinement signals when a failure traces to a specific skill: `sw:judge-llm`, the rubric evaluator, and `sw:code-reviewer`. Attribution heuristics in `src/core/skill-attribution.ts`: direct tool-call trace → slash-command trace → evidence pattern match → no signal (precision over recall).

**Reflect UX:**
- `sw:reflect --status` gains a `## Skill Refinement Suggestions` section listing skills with ≥3 negative signals, ranked by severity × recency, with one-click `sw:skill-refine <slug>` hints. Section is omitted when no skills qualify.
- Session-end nudge: when `/sw:done` closes an increment with ≥1 high-confidence learning or ≥1 refinement signal, a single-line prompt suggests the next action. Never auto-executes writes. Disable via `reflect.autoNudge: false` in `.specweave/config.json`.

**ADRs (red lines):**
- `0671-01-no-runtime-skill-mutation` — no SKILL.md edits during active `/sw:do` or `/sw:done`.
- `0671-02-registry-version-immutability` — a skill published at version X on verified-skill.com is bit-identical for the lifetime of that version.
- `0671-03-no-self-improving-marketing` — no "self-improving skills" copy until reproducibility guarantees and audit log ship.
- `0671-04-no-goodhart-loop` — a refinement signal emitted by gate G in session S cannot validate a refinement of its source skill within S.

**Scope cap:** local-only. No verified-skill.com registry changes. No telemetry. No auto-merge. No cross-user aggregation.

## [1.0.579] - 2026-04-19

- Patch release

## [1.0.578] - 2026-04-17

- Patch release

## [1.1.0] - 2026-04-17

### Opus 4.7 Alignment (increment 0669)

**Breaking Changes (P0 fixes):**
- Removed fixed `extended thinking` / `ULTRATHINK BY DEFAULT` from `sw:judge-llm` — adaptive thinking prompt-hints replace explicit `thinking.budget_tokens`
- `sw:team-lead` no longer spawns agents for single-domain <15-task work ("spawn agents anyway" directive removed)

**New Features:**
- Prompt caching: `cache_control: { type: "ephemeral" }` breakpoints for static context files (`CLAUDE.md`, `config.json`, `spec.md`, `rubric.md`)
- `sw:increment` now defaults to single-agent planning; use `--parallel` or keywords for multi-agent
- `--effort` flag (low|medium|high|xhigh|max) added to CLI dispatcher; default is `xhigh`
- `sw:auto` adds `--respect-native` / `--force-sw-auto` flags; Native Auto Mode section documents Shift+Tab alternative
- `sw:multi-project` consolidates github-multi-project and ado-multi-project with `--tool` flag
- New telemetry: `cache-metrics.ts` tracks per-skill cache hit rates; `sw:analytics --cache-stats` surfaces them

**Deprecations** (functional for 2 minor releases, removed in v1.3.0):
- `sw:github-sync` → `sw-github:sync-spec`
- `sw:jira-sync` → `sw-jira:push/pull`
- `sw:ado-sync` → `sw-ado:push/pull`
- `sw:tdd-red`, `sw:tdd-green`, `sw:tdd-refactor` → `sw:tdd-cycle --phase red|green|refactor`
- `sw:github-multi-project` → `sw:multi-project --tool github`
- `sw:ado-multi-project` → `sw:multi-project --tool ado`
- `sw:team-build` → `sw:team-lead --preset <name>`
- `sw:plan` (standalone) → `sw:increment --regenerate-plan`

**Config keys added** (run `specweave migrate-config-0669` to auto-add with defaults):
- `quality.thinkingBudget` (default: `"xhigh"`)
- `quality.grillConfidenceThreshold` (default: `50`)
- `quality.tokenBudgets` (default map)
- `cache.staticContextFiles` (default list)

**Migration guide**: `.specweave/docs/internal/specs/opus-47-migration.md`

## [1.0.577] - 2026-04-16

- Patch release

## [1.0.576] - 2026-04-16

- Patch release

## [1.0.575] - 2026-04-16

- Patch release

## [1.0.574] - 2026-04-15

- Patch release

## [1.0.573] - 2026-04-14

- Patch release

## [1.0.572] - 2026-04-13

- Patch release

## [1.0.571] - 2026-04-06

- Patch release

## [1.0.570] - 2026-04-06

- Patch release

## [1.0.569] - 2026-04-06

- Patch release

## [1.0.568] - 2026-04-06

- Patch release

## [1.0.567] - 2026-04-06

- Patch release

## [1.0.566] - 2026-04-06

- Patch release

## [1.0.565] - 2026-04-06

- Patch release

## [1.0.564] - 2026-04-06

- Patch release

## [1.0.563] - 2026-04-06

- Patch release

## [1.0.562] - 2026-04-05

- Patch release

## [1.0.561] - 2026-04-05

- Patch release

## [1.0.560] - 2026-04-05

- Patch release

## [1.0.559] - 2026-04-03

- Patch release

## [1.0.558] - 2026-04-02

- Patch release

## [1.0.557] - 2026-04-02

- Patch release

## [1.0.556] - 2026-03-30

- Patch release

## [1.0.555] - 2026-03-30

- Patch release

## [1.0.554] - 2026-03-30

- Patch release

## [1.0.553] - 2026-03-26

- Patch release

## [1.0.552] - 2026-03-26

- Patch release

## [1.0.551] - 2026-03-26

- Patch release

## [1.0.550] - 2026-03-26

- Patch release

## [1.0.549] - 2026-03-25

- Patch release

## [1.0.548] - 2026-03-24

- Patch release

## [1.0.547] - 2026-03-24

- Patch release

## [1.0.546] - 2026-03-24

- Patch release

## [1.0.545] - 2026-03-24

- Patch release

## [1.0.544] - 2026-03-23

- Patch release

## [1.0.543] - 2026-03-23

- Patch release

## [1.0.542] - 2026-03-20

- Patch release

## [1.0.541] - 2026-03-20

- Patch release

## [1.0.540] - 2026-03-20

- Patch release

## [1.0.539] - 2026-03-20

- Patch release

## [1.0.538] - 2026-03-20

- Patch release

## [1.0.537] - 2026-03-20

- Patch release

## [1.0.536] - 2026-03-19

- Patch release

## [1.0.535] - 2026-03-19

- Patch release

## [1.0.534] - 2026-03-19

- Patch release

## [1.0.533] - 2026-03-19

- Patch release

## [1.0.532] - 2026-03-19

- Patch release

## [1.0.531] - 2026-03-19

- Patch release

## [1.0.530] - 2026-03-19

- Patch release

## [1.0.529] - 2026-03-19

- Patch release

## [1.0.528] - 2026-03-19

- Patch release

## [1.0.527] - 2026-03-19

- Patch release

## [1.0.526] - 2026-03-19

- Patch release

## [1.0.525] - 2026-03-19

- Patch release

## [1.0.524] - 2026-03-19

- Patch release

## [1.0.523] - 2026-03-19

- Patch release

## [1.0.522] - 2026-03-19

- Patch release

## [1.0.521] - 2026-03-19

- Patch release

## [1.0.520] - 2026-03-19

- Patch release

## [1.0.519] - 2026-03-18

- Patch release

## [1.0.515] - 2026-03-18

- Patch release

## [1.0.514] - 2026-03-18

- Patch release

## [1.0.513] - 2026-03-18

- Patch release

## [1.0.512] - 2026-03-18

- Patch release

## [1.0.511] - 2026-03-18

- Patch release

## [1.0.510] - 2026-03-18

- Patch release

## [1.0.509] - 2026-03-17

- Patch release

## [1.0.508] - 2026-03-17

- Patch release

## [1.0.507] - 2026-03-17

- Patch release

## [1.0.506] - 2026-03-17

- Patch release

## [1.0.505] - 2026-03-17

- Patch release

## [1.0.504] - 2026-03-17

- Patch release

## [1.0.503] - 2026-03-17

- Patch release

## [1.0.502] - 2026-03-17

- Patch release

## [1.0.501] - 2026-03-17

- Patch release

## [1.0.500] - 2026-03-17

- Patch release

## [1.0.499] - 2026-03-17

- Patch release

## [1.0.498] - 2026-03-17

- Patch release

## [1.0.497] - 2026-03-17

- Patch release

## [1.0.496] - 2026-03-17

- Patch release

## [1.0.495] - 2026-03-17

- Patch release

## [1.0.493] - 2026-03-17

- Patch release

## [1.0.491] - 2026-03-16

- Patch release

## [1.0.490] - 2026-03-16

- Patch release

## [1.0.489] - 2026-03-16

- Patch release

## [1.0.488] - 2026-03-16

- Patch release

## [1.0.487] - 2026-03-16

- Patch release

## [1.0.486] - 2026-03-16

- Patch release

## [1.0.485] - 2026-03-16

- Patch release

## [1.0.484] - 2026-03-16

- Patch release

## [1.0.483] - 2026-03-16

- Patch release

## [1.0.482] - 2026-03-16

- Patch release

## [1.0.481] - 2026-03-16

- Patch release

## [1.0.480] - 2026-03-16

- Patch release

## [1.0.479] - 2026-03-16

- Patch release

## [1.0.478] - 2026-03-15

- Patch release

## [1.0.477] - 2026-03-15

- Patch release

## [1.0.476] - 2026-03-15

- Patch release

## [1.0.475] - 2026-03-15

- Patch release

## [1.0.474] - 2026-03-15

- Patch release

## [1.0.473] - 2026-03-15

- Patch release

## [1.0.472] - 2026-03-15

- Patch release

## [1.0.471] - 2026-03-15

- Patch release

# Changelog

All notable changes to SpecWeave will be documented in this file.

---

## [1.0.450] - 2026-03-14

### Changes
- Patch release

---



## [1.0.449] - 2026-03-14

### Changes
- fix: update ado-client plugin
- docs: rewrite introduction — fix coverage thresholds, skills count, add LSP and social proof
- fix: add missing await to all listInstalledPluginsInDir return calls
- fix: add missing await in detect() for continue, aider, tabnine adapters
- feat: install plugin skills into tool-native folders instead of AGENTS.md
- fix: brand SVG icons use brand colors instead of currentColor
- guard: block process.cwd() + .specweave/ path regressions in pre-commit
- fix: use resolveEffectiveRoot in skill-judge and dora-calculator to handle umbrella repos

---



## [1.0.448] - 2026-03-13

### Changes
- feat(get): bulk-get helper and skill updates
- Add PR-to-external-ticket linking
- v1.0.447
- fix: tighten SSH regex, add cloneUrl guard, add tilde test
- chore: bump version to 1.0.446
- test(get): add 46 unit tests + fix 8 edge cases found in grill
- chore: sync docs and skills
- chore: bump version to 1.0.445
- feat: add specweave get command — clone and register existing repos into workspace

---



## [1.0.447] - 2026-03-13

### Changes
- fix: tighten SSH regex, add cloneUrl guard, add tilde test
- chore: bump version to 1.0.446
- test(get): add 46 unit tests + fix 8 edge cases found in grill
- chore: sync docs and skills
- chore: bump version to 1.0.445
- feat: add specweave get command — clone and register existing repos into workspace

---



## [1.0.446] - 2026-03-13

### Changes
- test(get): add 46 unit tests + fix 8 edge cases found in grill
- chore: sync docs and skills
- chore: bump version to 1.0.445
- feat: add specweave get command — clone and register existing repos into workspace

---



## [1.0.445] - 2026-03-13

### Changes
- feat: add specweave get command — clone and register existing repos into workspace

---



## [1.0.444] - 2026-03-13

### Changes
- chore: update done skill
- chore: update skills

---



## [1.0.443] - 2026-03-13

### Changes
- fix: show active status instead of skipped, clarify plugin refresh output

---



## [1.0.442] - 2026-03-13

### Changes
- fix: skip only when plugin is actually installed in installed_plugins.json

---



## [1.0.441] - 2026-03-13

### Changes
- fix: grill fixes — marketplace check deduplication, scope, null root, array guard, fix status
- fix: always register marketplace before hash check, fix doctor plugin checks
- chore: bump version to 1.0.440
- sync docs, templates, locales, and plugin metadata

---



## [1.0.440] - 2026-03-13

### Changes
- sync docs, templates, locales, and plugin metadata

---




<!-- historical-release-index -->
## Earlier releases

- [1.0.439 through 1.0.339](changelog/archive-01.md)
- [1.0.338 through 1.0.116](changelog/archive-02.md)
- [1.0.115 through 0.22.5](changelog/archive-03.md)
