# Let agents use a browser

SpecWithCode tutorial, slug `agents-use-a-browser`. 1920x1080, 30 fps, about 70 s. Recorded on SpecWithCode 1.0.47 (release `b806fc7f3daf85c7d601`, specwithcode-dev tag `v1.0.47`) with Codex, 18 October 2026. Guide: `/docs/studio/browser`. Deliverables are written outside the repo (`scratchpad/outside/deliver/agents-use-a-browser/`); tutorials.json is not edited here.

Source keys: `S:` = specwithcode-dev at `v1.0.47`, `D:` = `docs-site/docs/studio/browser.md` in this worktree.

## How it was made

Demo folder `/Users/Shared/specwithcode-demo/tut09-agents-use-a-browser/` (`<demo>`). Rehearsals r1-r4 and failed takes final, final2, final3, final4 sit beside the take used, `final5`.

1. `scripts/seed.sh <demo> <take>` builds `home/greet-app` (greeting.js, two tests, `public/index.html` and a zero-dependency `serve.js` for 127.0.0.1:5173), runs `specweave init . --quick`, commits as Demo User <demo@example.com>, and installs the `scutil`/`hostname` shims ("Demo Mac", demo-mac). The release's pinned Chrome for Testing headless shell is copied (not linked) into `<take>/studio/tools`.
2. `scripts/codex-auth.sh` copies a short-lived Codex login into the demo HOME: no refresh token, mode 600, nothing printed. Deleted at teardown.
3. `scripts/serve.sh` starts greet-app's page (`node serve.js`) and the 1.0.47 server (`bin.mjs serve --base-dir <take>/studio --port 8349 --host 127.0.0.1 --no-browser`) under `env -i`, with `HOME=<take>/home`, `USER=demo`, `LOGNAME=demo`, `SPECWEAVE_HOST=demo`, `SPECWEAVE_TOOL=codex`, `STUDIO_ENABLE_HOSTED_SERVICES=false`, `PWDEBUG=0`, `PLAYWRIGHT_HTML_OPEN=never`. PIDs go to `<take>/secret/`.
4. `scripts/setup-take.sh` pairs a headless browser (`pair.sh`, `pair-headless.mjs`) and runs `record.mjs --prepare` off camera: welcome wizard, add `~/greet-app` as a Local folder, project permissions Full access, and Settings > Integrations > Agent browser access turned off (it defaults to on), so the take can turn it on.
5. `node scripts/record.mjs SHOTLIST.json <take>/secret/state.json <take>/out` records one headless take (1920x1080, `headless: true`) with a cue log. Everything in it is real: the coordinator delegates a worker thread, the worker's Codex session uses the `preview_*` tools on 127.0.0.1:5173, the person takes over the same tab, and a second turn in the thread captures a screenshot (`preview_snapshot`) that appears in the chat.
6. `node scripts/tts.mjs scripts/vo-lines.json <demo>/vo vo-timing`: ElevenLabs `/with-timestamps`, voice `0Ki1af67ybTaTu4TNmO8` on `eleven_v4` (stability 0.5, similarity 0.75, speaker boost, speed 1.0), key read from Obsidian inside the same command. 03-ask's second caption cue was split at "beside" from the word timestamps, without a new request.
7. `node scripts/build-composition.mjs . <demo>/build`, then in `hyperframes/`: `npx hyperframes@0.8.145 check` and `render --quality delivery --fps 30`.
8. `scripts/finish.sh` normalises to -16 LUFS and writes the poster.

The take's `take.webm` was converted with `ffmpeg -r 30 -c:v libx264 -crf 14 -pix_fmt yuv420p`. `syncOffset` -0.032 = blackdetect 4.000 minus the black-on cue 4.032.

## Beats

### 01-intro · card
VO: Let agents use a browser, right beside the thread.

### 02-settings · Turn on Agent browser access
VO: Open Settings, Integrations, and turn on Agent browser access. Projects can override it, and it applies when an agent session next starts.
- Account menu, Settings, Integrations at 1.5x ("Sped up 1.5×"), then the Browser card cropped to the Agent browser access row (1.39x). The crop stops above Agent computer access, which this tutorial does not cover.
- Row text "Allow agents to use the shared browser. Projects can override it." (S:apps/web/src/components/settings/ProjectDefaultsSettings.tsx:635). D:16 names the path. "Applies when the agent session next starts" is the project row's text.

### 03-ask · Ask for a browser check
VO: greet-app serves its demo page locally, on port 5173. Ask the coordinator to check it in the browser beside the thread, so you can watch.
- Prompt: "Check the greeting page in the browser beside the thread so I can watch: open http://127.0.0.1:5173, type Ada, press Greet, and tell me what it shows."
- The coordinator's wait for the worker thread plays at about 4.8x ("Sped up 5×").

### 04-watch · Watch the agent drive
VO: Open the new thread. Its agent opens an isolated tab with the `preview_*` tools. Dock the tab beside the thread and watch it type Ada and press Greet. The page says Hello, Ada.
- D:22 (`preview_*` tools, the tab shows beside its thread), D:26 (agent tabs use isolated storage). Settings show "Browser profile for agents: Isolated, no logins".
- The agent's tool calls before the tab appears play at 2x ("Sped up 2×"). The floating tab is docked; the agent types Ada and presses Greet at 1x.

### 05-takeover · Take over the tab
VO: To try something yourself, click Take over. It's the same tab, and the agent waits while you drive. Type Grace, press Enter, then Hand back.
- Labels "The agent is driving" / "Take over" and "You're driving. The agent waits." / "Hand back" (S:packages/client-runtime/src/preview/serverBrowserStream.ts:52-62).
- Cut: the take reloads the app page and reopens the thread before this beat (take 59.9-76.0 s are skipped). See exceptions.

### 06-screenshot · A screenshot in the chat
VO: Now ask for a screenshot. The agent captures the tab as you left it and shows it in the chat.
- Second prompt in the thread: "Take a screenshot of the browser tab and show it here." The image shows "Hello, Grace!". Waiting plays at 3x ("Sped up 3×").

### 07-outro · card
VO: To use your real Chrome instead, see the SpecWithCode Browser extension docs. (D:34-50; not shown.)

## Exceptions

- Off camera: wizard, project added, Full access, Agent browser access switched off first, and the page reload before Take over.
- The reload: in final, final3 and final4, clicks in the tab right after Dock did not land on the field under the pointer (a triple-click selected the heading instead; a click on the field left focus on the page), so typing went nowhere. After a reload, clicks land where the pointer is (verified headlessly on the live server, then final5).
- The worker's brief on screen shows the demo checkout path under `/Users/Shared/specwithcode-demo/`; no owner path, hostname, email or token appears.
- Four sped-up stretches, each badged. Nothing is slowed.

## Product findings (1.0.47)

1. Clicks in a shared tab can land off target right after it is docked from the floating player; a reload fixes it. Likely a stale viewport or canvas size in `pagePoint` (S:apps/web/src/browser/ServerBrowserSurface.tsx:275-298).
2. Asking for a "new thread" makes the worker delegate again, creating a duplicate thread.
3. Without "so I can watch" in the request, the agent uses a background tab and no floating preview appears.
4. The keychain reader runs `security find-generic-password -a $USER -s "Claude Code-credentials"`, so a server started with the owner's `USER` reads the owner's Claude login even with a disposable HOME. The demo server sets `USER=demo`.
5. The Overview showed Claude quota data in a demo HOME where Claude Code is not signed in (not on camera).
6. The right panel's Browser surface lists every web server on the machine, including ones outside the project (kept off camera).
