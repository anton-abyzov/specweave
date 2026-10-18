# Keep working when a provider runs out

SpecWithCode tutorial, slug `provider-runs-out`. 1920x1080, 30 fps, 99.8 s. Recorded on SpecWithCode 1.0.43 (specweave-studio `043e9db88`) with SpecWeave 3.1.0, 18 October 2026. Published files: `docs-site/static/video/tutorials/provider-runs-out.{mp4,jpg,en.vtt,chapters.vtt}`. The catalogue entry is written outside the repo (`tutorials-batch/provider-runs-out.entry.json`); tutorials.json is not edited here.

Source keys: `S:` = specweave-studio at `043e9db88`, `W:` = this specweave worktree.

## How it was made

The demo folder is `/Users/Shared/specwithcode-demo/tut06-provider-runs-out/` (`<demo>`), with a rehearsal under `<demo>/rehearse` and the take under `<demo>/final`.

1. `scripts/seed.sh <demo>/final` builds `home/greet-app` and runs `specweave init . --quick`. It adds increment 0001 from `captures/spec.md`, with two tasks: T-01 greets by name, T-02 falls back on a blank name. It also installs shims (`scutil` returns "Demo Mac"; `specweave` runs this worktree's `bin/specweave.js`) and a demo gitconfig.
2. `scripts/claude-auth.sh` and `scripts/codex-auth.sh` copy short-lived access tokens into the demo HOME: no refresh token, mode 600, nothing printed. Both files were deleted at teardown.
3. `scripts/serve.sh <demo>/final 8343` starts a private headless server under `env -i` with `HOME=<demo>/final/home`, `SPECWEAVE_HOST=demo` and `STUDIO_ENABLE_HOSTED_SERVICES=false`. `SPECWEAVE_TOOL` is left unset, so each agent records its own id from its environment (W:src/core/tasks/ledger.ts:101-126).
4. Off camera, in headless Playwright via `scripts/pair.sh` and `scripts/pw.mjs`:
   - finish the welcome wizard;
   - add greet-app as a Local folder;
   - set project permissions to Full access;
   - send the coordinator `Start a thread titled "Personal greeting". In it, run $sw-do for increment 0001: do T-01 only, then stop.`
   That last step is a real Claude Code turn: commit `1251f7d`, ledger `claude@demo`.
5. Stop the server by PID, then restart it with `scripts/serve.sh <demo>/final 8343 claudeAgent`, which sets `STUDIO_SIMULATE_USAGE_LIMIT=claudeAgent`.
6. `node scripts/record-app.mjs SHOTLIST.json …` records one headless take (`headless: true`, `PWDEBUG=0`) into `<demo>/final/out/take.webm`, with a cue log. Everything in it is real:
   - "Now do T-02, then stop." stops on the simulated limit.
   - The project rule (default Switch automatically) hands the thread to Codex.
   - Codex does T-02: commit `2ecf58b`, ledger `codex@demo`.
7. `node scripts/capture-ledger.mjs` runs `specweave task list` and `git log --oneline -3` in the final repo under `env -i`, with a privacy guard, and stores the output verbatim in `captures/session.json`. The ledger beat types that output. It is a captured terminal run, not a frame of the app.
8. `node scripts/tts.mjs scripts/vo-lines.json <demo>/vo vo-timing` calls ElevenLabs `/with-timestamps` with voice `0Ki1af67ybTaTu4TNmO8` on `eleven_v4` (stability 0.5, similarity 0.75, speaker boost, speed 1.0). Caption cues and word anchors come from the character timestamps. After review, only 04-switch and 05-codex were voiced again; the other six lines are the first takes (06-ledger's caption chunk was re-split without a new request).
9. `node scripts/build-composition.mjs . <demo>/build` writes `hyperframes/index.html` and both VTTs.
   - Layout (reframed 18 October 2026 to the series' Weave look, ported from `start-specwithcode/scripts/build-composition.mjs`): app footage sits inside a rounded window card with margins (the largest box of the shot's aspect inside 1280x720), the step chip and speed badge above it, the known-issue note and captions below it. Nothing lies over app UI. Each app beat is a list of shots with `aspect`, `segments` and camera crops `{src, x, y, w}`; every crop ends on a panel edge (the right panel at x 1462, the thread column 708-1468, the composer top at 918, the settings dialog and its Usage limits card) and magnifies the UI 1.28x (the Project settings establishing shot) to 1.71x, so body text renders at about 18-24 px. The take was re-edited, not re-captured.
   - Shots: Threads list (1.71x), the thread in the right panel (1.68x, first its composer on Claude Opus 5.5 as the VO says Claude Code, then a pan up to the expand button), the expanded thread (1.68x, summary then plan chip 1/2); the composer as the request is typed (1.5x), the limit banner (1.68x, a slow 1% push over the still stretch); the handoff rows (1.68x); Codex's commands, summary, plan popover (1.68x) and the composer's model picker (1.68x; the take goes white at take 58.0 s as the app navigates away, so the shot ends at 57.9 s and that frame is held as a still for 2.26 s, with a "Still frame" badge) with the note "Known issue in 1.0.43: after the switch, the picker returns to Claude Code."; Project settings (1.28x) and the Usage limits card (1.65x).
   - Nothing is sped up: Codex's turn (take 24.8 to 54.4 s) plays at 0.96x to 1x. Two static stretches play slower to fit the narration: the banner (take 18.3 to 24.8 s, 0.76x) and the open plan popover (take 54.4 to 55.7 s at 0.5x, shown with a "Slowed to 0.5×" badge, then 0.76x through the picker change). The settings beat starts at take 62.25 s, when the dialog appears (the gear click is cut). The pointer's walk to Usage limits (take 64.3 to 68.9 s) plays at 3x with a "Sped up 3×" badge, so the open When a provider runs out list (take 69.3 to 71.7 s, at 0.75x) is on screen while the VO names the three options; the rest plays at 0.76x-0.88x through take 79.45 s. `minRate` in edit.json allows the 0.5x stretch.
   Then, in `hyperframes/`: `npx hyperframes@0.8.145 check` (0 errors; the track-density and section-nesting warnings are expected; layout 0 issues) and `render --quality delivery --fps 30`.
10. `scripts/finish.sh <demo>/build/render.mp4 …/provider-runs-out.mp4 …/provider-runs-out.jpg 1.0` normalises loudness and writes the poster.

Look: Weave tokens (canvas `#f8f7f9`, iris `#6d4fb5`, sunken `#efedf2`, ink `#241523`), Schibsted Grotesk and JetBrains Mono, embedded with their OFL files. No music.

Verification (final render):
- Loudness: -16.1 LUFS, true peak -1.6 dBFS, LRA 3.8 LU.
- `check-timing.py`: the largest gap between a cue and the onset of its speech is 0.08 s. Pauses between beats: 0.93, 0.93 and 0.97 s (the beat extras of 03, 06 and 07).
- `freezedetect` (n=0.001, d=2.5), reframed render: the longest still stretch outside the cards is 3.4 s (Codex's command rows, 42.3 s); the banner stretch is 2.8 s at most.
- Privacy grep over this folder and the published files: clean.
- Frames: the only paths on screen are under `/Users/Shared/specwithcode-demo`, and the machine name is "Demo Mac".

## Beats

### 01-intro · 0.0 s · What you will see
VO: Keep working when a provider runs out.

### 02-thread · 3.9 s · A thread on Claude Code
VO: This greet-app thread runs on Claude Code. It finished `T-01` of the increment, and one task is left.
- On screen: the window shows the Threads panel at 1.71x, with the row "Personal greeting · Claude Code · Opus 5.5 · 1/2". The thread opens in the right panel; on "Claude Code" the window shows its composer with the model picker on Claude Opus 5.5, then pans up and the thread is expanded. Its plan chip reads 1/2.
- Threads open in the project's right panel (memory rule; S:apps/web/src/studio/projectCoordinatorThreads.ts).

### 03-limit · 11.22 s · Claude Code hits its usage limit
VO: Ask for `T-02`, and Claude Code stops on its usage limit. Here the limit is simulated with SpecWithCode's test switch. The banner shows the reset time, and that the project rule continues with Codex.
- The simulated limit stops every turn on the named provider instance and resets in 1 h (S:apps/server/src/orchestration-v2/ProviderFailure.ts:337-369; documented at S:docs/user/usage.md:240).
- Banner "Resets in …" (S:apps/web/src/components/chat/UsageLimitRecoveryBanner.tsx:94).
- "Continuing with Codex by project rule." (same file :105) and "Continue with Codex" (:257).

### 04-switch · 25.06 s · The thread moves to Codex
VO: Under the default rule, Switch automatically, SpecWithCode hands the stopped turn to Codex, with its context, in the same worktree. The row saying Usage limit resolved only means this chat continued. Claude Code stays limited until the reset.
- The default `providerLimitAction` is "switch" (S:packages/contracts/src/settings.ts:1578-1580), labelled "Switch automatically" (S:apps/web/src/components/settings/ProviderLimitSettings.tsx:48-55).
- "Switching hands the thread over with its context, in the same worktree." (ProviderLimitSettings.tsx:121-124); "the stopped turn picks up where it left off" (S:docs/user/usage.md:126-127).
- The stopped turn continues on the fallback (S:apps/server/src/orchestration-v2/ProviderFallbackWorker.ts:170-190).
- "Usage limit resolved — chat continued." is the muted label once a later run starts (S:apps/web/src/components/chat/UsageWarningLabel.tsx:10, 18). Its tooltip: "The original provider's included allowance may still be exhausted." (:13). The docs: it "records chat recovery, including switching providers; it does not claim the original provider's weekly allowance has reset" (S:docs/user/usage.md:374-377). On screen the banner said "Retry after 7:00 AM" and "Resets in 1 h"; the simulated limit resets in 1 h (S:apps/server/src/orchestration-v2/ProviderFailure.ts:337-369).
- On screen while the VO runs: "Context handoff Claude Opus 5.5 → GPT-6.1-Sol", "Claude Code limit reached · continued on Codex · GPT-6.1-Sol" (S:apps/web/src/studio/runIdentity.ts:41), then Codex's first commands: `Ran · pwd && cat .agents/skills/sw-do/SKILL.md …` and `Ran · git status --short && cat src/greeting.js …`.

### 05-codex · 41.98 s · Codex finishes T-02
VO: Codex runs `npm test` and commits the change. Then, unasked, it runs `specweave handoff`. Its summary: `T-02` is done on main, and all four tests pass. The plan shows both tasks done. One catch in this build: the picker then flips back to Claude Code, so check it before your next message.
- Real time, no speed-up. On screen, zoomed: `Ran · npm test && git diff --check && git add src/greeting.js test/greeting.test.js && git commit -m …` (take 40.5 to 45.0 s), then `Ran · specweave handoff --reason "T-02 complete; user requested stop" --no-push` (45.0 to 48.2 s), then the summary "Ran 4 commands and changed 2 files … T-02 done on main: 2ecf58b (0001: fall back on blank greeting names). npm test exited 0; all 4 tests passed. Completion recorded."
- The plan popover reads "0001 All done 2/2" with T-01 and T-02 checked (take 53.1 s).
- The picker revert is product bug 1 below, seen in the take at 55.9 s: the composer picker changes from "GPT-6.1-Sol · Low" to "Claude Opus 5.5 · Medium 1M · Thinking" and the header from "Codex · GPT-6.1-Sol" to "Claude Code · Opus 5.5". It contradicts S:docs/user/usage.md:271-272 ("The composer's model picker follows an automatic switch").
- The claim is not visible: it happens inside Codex's first command, which the row truncates. The VO does not mention it; the ledger beat shows `T-02 | done | codex@demo`.

### 06-ledger · 62.74 s · Who did what: the ledger
Step chip: Check the ledger: `specweave task list`
VO: In a terminal, `specweave task list` reads the ledger: Claude finished `T-01`, and Codex finished `T-02`, each with the test run that proved it. Both agents' commits are on the branch.
- Real output (`captures/session.json`): `T-01 | done | claude@demo | npm test → exit 0`, `T-02 | done | codex@demo | npm test → exit 0`, `2/2 done`.
- The first output line, `0001-personal-greeting — agent cli@demo`, is elided (shown as "…"). "cli@demo" is the identity of the capture shell itself, which runs under `env -i` with no agent environment, and it read as a third agent next to the VO. The entry note says so.
- Commits: `git log --oneline -3` is typed one second before "Both agents' commits" and stays on screen, highlighted, for about 3 s: `2ecf58b 0001: fall back on blank greeting names` (Codex), `1251f7d 0001: greet by name` (Claude); the third line (the plan commit) is elided.

### 07-settings · 76.21 s · Choose the rule
VO: Set the rule per project, under Usage limits: switch automatically, offer the fallback, or wait for the reset. With Offer the fallback, nothing moves until you choose Continue with Codex. An idle thread can also move early, at 5% left.
- The three options are at ProviderLimitSettings.tsx:48-55. Under Offer, the banner's "Continue with X" is the only way to move the thread (UsageLimitRecoveryBanner.tsx:122-123, 257).
- Switch before the limit defaults to 95 (S:packages/contracts/src/settings.ts:1271), shown as "At 5% left" (ProviderLimitSettings.tsx:209-210).
- Window: the Project settings dialog at 1.28x, then, from the Usage limits click, the Usage limits card at 1.65x with the "When a provider runs out" options and the "Switch before the limit" row.

### 08-outro · 93.73 s · Next: sw-done
VO: Next, `sw-done` verifies and closes the increment.
Card note: "The usage limit is simulated with STUDIO_SIMULATE_USAGE_LIMIT. Both agent turns are real and nothing in them is sped up; the ledger is a captured terminal run. The narration is an AI voice." 

## Exceptions

- **Simulated limit.** A real limit cannot be forced. The limit comes from the documented test switch `STUDIO_SIMULATE_USAGE_LIMIT=claudeAgent`, and the VO, the outro card and the entry note all say so. The banner itself does not show that the limit is simulated.
- **T-01 off camera.** T-01 was a real Claude Code turn, recorded before the simulation was switched on, because a simulated instance stops every Claude turn.
- **Ledger beat.** The ledger beat is a captured terminal run rendered in the Weave terminal card, not a screen recording. Its first line (`— agent cli@demo`) is elided.
- **Slowed static stretches.** The banner and the plan popover play at 0.5x to 0.76x to fit the narration. Nothing moves in them apart from the popover closing and the picker label changing; Codex's working turn is not sped up and plays at 0.96x to 1x.
- **Held composer frame.** After the picker flips back, the composer's last frame before the app leaves the thread (take 57.9 s) is held for 2.26 s with a "Still frame" badge (`[src, src, "hold", s|"fit"]` segments in edit.json; the build extracts the still into `hyperframes/assets/stills/`).
- **Sped-up settings walk.** The pointer's walk to Usage limits plays at 3x with a "Sped up 3×" badge.
- **Voice source.** The VO source is ElevenLabs `mp3_44100_128`. Higher formats need a plan the account does not have.

## Product bugs found

1. **The model picker reverts after an automatic fallback (blocking for this flow).** About 5 s after the Codex turn ends, the thread header and composer picker go back to "Claude Code · Opus 5.5". The next message goes to Claude, stops on the limit again and hands off a second time. In the rehearsal, a later message produced a "Context handoff … → Claude Opus 5.5" row. This contradicts S:docs/user/usage.md:271-272 ("The composer's model picker follows an automatic switch"). The video now shows it (take 55.9 s, zoomed on the picker) and says it in the VO; the entry note says it too. Not fixed in the product here (out of scope for this episode).
2. **"Usage limit resolved — chat continued." reads as if the limit had lifted.** After the fallback the warning row turns into this muted label while Claude Code is still limited until 7:00 AM. It is documented (S:docs/user/usage.md:374-377) and has a tooltip (UsageWarningLabel.tsx:13), but the visible text says the limit resolved. Something like "Chat continued on Codex · Claude Code limited until 7:00 AM" would not need the VO's explanation.
3. **The simulated limit is not marked.** The banner looks exactly like a real limit under `STUDIO_SIMULATE_USAGE_LIMIT`.
4. **Minor issues:**
   - The onboarding Codex card showed a garbled "Signed in as …" line.
   - Claude Code synced the account's plugins into the demo HOME.
   - Codex ran an unrequested `specweave handoff` at the end of T-02 (on camera; the VO calls it unasked).
