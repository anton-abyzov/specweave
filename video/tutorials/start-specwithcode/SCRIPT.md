# Start SpecWithCode with a coordinator and two workers

Slug `start-specwithcode`. 108.6 s, 1920x1080, 30 fps, -16 LUFS. One headless take (`final2`) on a private
SpecWithCode 1.0.45 server (release aec65f41a671d18d03de) on 127.0.0.1:8341, with a disposable HOME and base-dir under
/Users/Shared/specwithcode-demo/tut04-start-specwithcode/. Codex is the coordinator and both workers. SpecWeave 3.1.0 comes from npm.

Rebuild: `scripts/seed.sh` → `scripts/serve.sh` → `scripts/pair.sh` + `pair-headless.mjs` → `codex-auth.sh` →
`record.mjs --prepare` → `record.mjs SHOTLIST.json` → `tts.mjs scripts/vo-lines.json` → `build-composition.mjs . <build>` →
`hyperframes check/render` → `finish.sh`. Teardown: stop the server by PID and delete `secret/*` and `home/.codex/auth.json`.

## Revision 2 (critic pass)

Same take, no re-capture: every fix was possible from the existing footage. Re-voiced only 04, 05 and 07.

- **Framed layout.** `build-composition.mjs` now puts footage in a framed window inside a 1280x720 box, like the
  handoff-claude-to-codex episode. Step chip and speed badge sit above the window; known-issue notes and captions sit below it.
  No overlay covers app UI. Each shot has its own crop aspect, so crops end on panel edges and no word is cut.
- **Core idea on screen.** "The coordinator does none of the work itself" now plays over the coordinator's own replies;
  "It starts two worker threads" over the right panel as both appear; "Each one gets a brief" over the coordinator's
  "Started 0001 T-01 and 0001 T-02 … each briefed to claim, implement, test, close its task, and report" line.
- **Permissions.** The composer strip shows the real change from Supervised to Full access (source 33.8 s) and the
  tooltip "Applies to all chats in this project…", slowed to 0.5x and marked. The step chip changes when the label does.
- **Product bugs.** The worker shots stay on the right panel and on the coordinator text above its worker cards, so
  findings 3, 5 and 7 below are not on screen. The report shots crop above the changed-files card (finding 2).
  The worker shot carries a known-issue note about the coordinator's cards; the plan shot carries one about finding 1.
- **Speed badges.** One per sped-up segment, at that segment's rate: Sped up 3x (coordinator thinking), Sped up 1.7x
  (workers), Slowed to 0.5x (permission change). Unmarked segments run between 0.8x and 1.04x; the builder refuses 1.15x–1.5x.
- **Static holds.** The longest near-still stretch is 3.9 s (ffmpeg freezedetect -60 dB, 3.5 s window: 12.1 s for 3.8 s,
  73.2 s for 3.9 s). Intro steps and outro disclosures appear one by one.
- **Plan chip line.** Now advice: "This chip matched increment 0001 by the thread's title, so put the increment number in
  each worker's title", with the known-issue note that a worker's own claim does not bind its chip in 1.0.45.

## Beats, VO and sources (1.0.45 source paths, `git show v1.0.45:<path>` in specweave-studio)

| Beat | VO (caption text) | Source |
|---|---|---|
| 01 intro card | Start SpecWithCode with a project, a coordinator and two workers. | (title card) |
| 02 version | This run uses SpecWithCode 1.0.45. Settings, General, About shows the version on your Mac. | SettingsPanels.tsx:277-283; on screen "Version 1.0.45" |
| 03 project | Click the plus next to Projects. New project starts one from a name. Local folder adopts a repo you already have. Here it's greet-app, with SpecWeave and one increment of two tasks. The project opens on its coordinator. | StudioSidebar.tsx:655; CommandPalette.tsx:1739, :1754; captures/spec.md |
| 04 ask | Choose Full access for this demo. It applies to every chat in this project. Then ask the coordinator for a two-part change: one worker per task, with titles and a short report. | apps/web/src/components/chat/runtimeModeConfig.ts:23-24; apps/web/src/components/studio/CoordinatorAccessPicker.tsx:67 ("Applies to all chats in this project.", the tooltip on screen) |
| 05 workers | The coordinator does none of the work itself. It starts two worker threads, and they appear in the right panel under Working. Each one gets a brief: claim, implement, test, close and report. The workers share one checkout, so each works on its own files. Each plan chip counts the increment's tasks done, from zero to two of two. The whole run took under a minute; it's sped up here. | apps/server/src/project/ProjectWorkspaceService.ts:101 (does none of it, starts and briefs workers), :105 (delegate_task async; workers share this checkout, separate files); the brief list is the coordinator's on-screen "Started …" message; projectWorkspaceModel.ts:17, :64; ThreadPlanCard.tsx:187; take: Enter 41.5 s → Done x2 83.5 s |
| 06 report | Open a worker. Its result stays in its own thread. Its first message is the coordinator's brief, with your words. A final message with three headed sections becomes a report card, saved in the increment's reports folder. Open report reads it in full. | ProjectWorkspaceService.ts:104 (the user's own words), :106, :128; threadReport.ts:11, :35-59; ThreadReports.ts:1-7, :32-33 |
| 07 plan | Click the plan chip: both tasks are done, and both acceptance criteria are met. Open spec and Open increment go to its files. This chip matched increment 0001 by the thread's title, so put the increment number in each worker's title. | apps/server/src/project/ThreadIncrementProgress.ts:92; :5-12 (claim binding first, then checkpoint, then an increment number in the title or branch), :263, :274; apps/web/src/studio/threadPlanProgress.ts:162 ("matched by title or branch", on screen) |
| 08 outro | Next: keep working when a provider runs out. | (card) |

On-screen notes: "Known issue in 1.0.45: the coordinator's worker cards can lag or name the wrong task; the right panel is current."
(findings 5 and 7) and "Known issue in 1.0.45: a worker's own SpecWeave claim does not bind its chip yet, so only the title
match works." (finding 1).

Outro disclosures: one take on a private 1.0.45 server with a disposable home; off camera, increment 0001 was planned and
the welcome wizard and a Codex update notice were dismissed; the permissions menu does not render in headless capture,
so only its label change is shown; agent work is sped up where marked; AI narration.

Voice: ElevenLabs 0Ki1af67ybTaTu4TNmO8, eleven_v4, /with-timestamps. Captions come from character timestamps and snap to silences.

## Edit map (source seconds)

02: 5.35–7.4 (account menu), 7.4–10.4 and 11.6–14.9 (Settings, About). 03: 15.7–31.0. 04: 33.2–34.0, 34.0–34.55 at 0.5x
(label change and tooltip), 34.55–41.0 (typing), 41.0–44.2 (message sent). 05: 44.2–53.0 at 3x (coordinator replies),
53.0–57.9 (right panel: both workers appear), 57.9–61.4 ("Started …" line), 61.4–86.5 at 1.7x (right panel chips 0/2 → 1/2 → 2/2).
06: 89.4–100.6 (worker thread), 102.2–106.45 (Open report). 07: 106.7–120.7 (plan chip, acceptance criteria).

## Exceptions

- The video uses 1.0.45, not 1.0.44. No 1.0.44 bundle exists on this machine (release bundles: 1.0.42, 1.0.43, 1.0.45),
  the installed app is 1.0.43 and the latest on GitHub is 1.0.46. Downloading a bundle would need permission.
- Codex runs as coordinator and workers, so no Claude Keychain token is read. Claude is not on PATH in the demo HOME.
- Increment 0001 was planned off camera. The first-run wizard and a provider-update toast were dismissed off camera (the outro says so).
- The native "Project permissions" dropdown does not render in headless video. Only the label changing to Full access is visible (the outro says so).
- The worker brief and report show /Users/Shared/specwithcode-demo/... paths (disposable, no owner name).
- 4 of 30 caption cues start mid-speech (no pause at that clause); they are placed by ElevenLabs character timestamps.

## Product findings (1.0.45)

1. Delegated workers inherit the coordinator's SPECWEAVE_STUDIO_THREAD_ID. The SpecWeave claim binding is written for the coordinator thread, so worker plan chips bind only by title. A thread titled "Implement T-01" gets no chip.
2. A worker's changed-files card includes the other worker's concurrent edits in the shared checkout (T-01's report lists 2 files; its card says 7 changed files +46 −4).
3. The coordinator timeline shows empty assistant headers after worker completions.
4. The Overview shows a "Claude 1" quota profile in a HOME with no Claude installed.
5. Before claiming, both worker cards read "Now Greet by name · Next Add farewell", so T-02 names T-01's task.
6. Workers set their own SPECWEAVE_AGENT, so ledger `by` reads "0001-T-01" or "t02-worker" instead of codex@demo.
7. The coordinator's T-01 card stayed at "Done 1/2 · Now Add farewell" for at least 9 s after the right panel showed 2/2.
