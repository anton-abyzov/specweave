# Your agent in SpecWithCode

Six short tutorials, one per coding agent. Each one connects the agent to SpecWithCode, plans one small change with a SpecWeave skill, builds it, and reviews the result. Every episode uses the same demo repo, the same task, the same beats and the same wording, so a viewer who watches two of them only learns what differs.

Increment: `.specweave/increments/0895-specwithcode-tutorials-and-website-design-system` (umbrella), ACs AC-04 to AC-06.

## Episodes

| # | Episode | Folder | One-liner | Runtime | Spoken words |
|---|---|---|---|---|---|
| 1 | Claude Code in SpecWithCode | `claude-code/` | Claude Code is on by default: confirm it in setup, then plan, build and review. | 79 s | 174 |
| 2 | Codex in SpecWithCode | `codex/` | Sign in with ChatGPT in setup, or reuse your Codex CLI, then plan, build and review. | 80 s | 175 |
| 3 | Cursor in SpecWithCode | `cursor/` | Add Cursor as a provider and sign in through the browser; no Cursor CLI needed. | 88 s | 192 |
| 4 | OpenCode in SpecWithCode | `opencode/` | Sign OpenCode in to a model provider, add it in SpecWithCode, then plan, build and review. | 80 s | 179 |
| 5 | Grok in SpecWithCode | `grok/` | Trust the folder with `grok --trust`, add Grok (existing CLI), then plan, build and review. | 88 s | 193 |
| 6 | Antigravity in SpecWithCode | `antigravity/` | Add Antigravity, install its own runtime, sign in with Google, then plan, build and review. | 89 s | 190 |

**Series runtime: 504 s (8:24).** Order follows setup effort: the two agents in the setup wizard first, then the four that are off by default.

Each folder holds `SCRIPT.md` (the readable script with sources), `SHOTLIST.json` (the same beats, machine-readable, with Playwright-ready steps) and `captures/` (real terminal runs). `SCRIPT.md` and `SHOTLIST.json` must stay in step: same ids, times and VO.

`/video/` is in `.gitignore` (line 274). Tutorials are committed the way `video/opus55-projects` was: `git add -f video/tutorials`.

## Episode structure

Every episode has the same eight chapters. Only "Connect" changes length.

| Chapter | Beat | Kind | Length | VO (shared wording; `{A}` = agent) |
|---|---|---|---|---|
| Intro | Intro card | MG | 4 s | "{A} in SpecWithCode: plan, build, review." |
| Set up the repo | `specweave init` | TERM | 8 s, 10 s with an adapter | "In your repo, run specweave init[ with the {adapter} adapter]. It adds AGENTS.md and eleven SpecWeave skills." |
| Connect {A} | agent-specific | APP, TERM or MG | 15-25 s | see each script |
| Add the project | project and chat | APP | 13 s | "Add the repo: the plus next to Projects, Local folder, then its path. Click New chat, pick {A} in the model picker, and set Full access for this demo." |
| Plan | `$sw-increment` | APP | 13 s | "Type a dollar sign, pick sw-increment, and describe the change. {A} writes spec.md: acceptance criteria and a task with its files and test." |
| Build | `$sw-do` | APP | 12 s | "Then send sw-do. {A} claims the task, changes the code, and runs the test. The task is marked done only when the test passes." |
| Review | Open diff | APP | 9 s | "Click Open diff to review the code, the test, and the ledger line that records who finished the task." |
| Next | Outro card | MG | 4 s | "Next, sw-done verifies and closes the increment." |

Grok adds one TERM beat to "Set up the repo" (folder trust). Claude Code and Codex connect inside the setup wizard; Cursor, OpenCode, Grok and Antigravity are off by default and are added from Settings → Providers → Add provider.

Pacing: 150 words per minute. Every beat leaves 0.4 s or more after its line; VO starts 0.2 s into the beat; beats butt-cut with no silent gaps. Agent runs are speed-ramped (4-8x) with a "Sped up" chip; never show a spinner holding still.

### Typed prompts (identical in every episode)

- Plan: `$sw-increment` then `Personal greeting: greet(name) returns "Hello, <name>!" and greet() still returns "Hello, world!". Use Ada in examples. Plan only, no code yet.`
- Build: `$sw-do` then `Do T-01, then stop. I will close the increment myself.`

"Use Ada in examples" is there because unpinned runs of Claude Code and Codex put the account owner's first name into the code (claude-code C:07 first take, codex C:05). "Do T-01, then stop" keeps the outro true: `sw-do` otherwise moves on to verify and close when no tasks are left (W:skills/sw-do/SKILL.md, "Finish without asking").

## Terminology

| Use | Meaning | Never |
|---|---|---|
| **SpecWithCode** | the app (formerly SpecWeave Studio) | "Studio" alone, "SpecWeave Studio", anything that could mean Skill Studio |
| **specweave** / `specweave init` | the CLI and npm package | "SpecWithCode CLI" |
| **SpecWeave skills** (VO), `sw-*` (screen) | the 11 skills `init` installs | "sw skills", "plugins" |
| **increment** | one planned unit of work, a folder under `.specweave/increments/` | "ticket", "feature folder" |
| **spec** / `spec.md` | the increment's plan: problem, acceptance criteria, tasks | "plan file", "tasks.md" |
| **acceptance criteria** (VO), `AC-01` (screen) | numbered checks in the spec | "requirements" |
| **task** / `T-01` | one unit in the spec, with Files and Test | "todo", "subtask" |
| **ledger** / `ledger.jsonl` | who claimed and finished each task, with evidence | "log", "history" |
| **provider** | an agent connection in Settings → Providers | "integration" |
| **model picker**, **New chat**, **Open diff** | UI labels, exactly as the app writes them | paraphrases |

Plain words only. No "seamless", "powerful", "simply", "just". A line that does not change what the viewer does is cut.

## Shared beats: sources

All `S:` references are specweave-studio at `618bfeca` (v0.2.4, the installed release), read with `git show 618bfeca:<path>`. `W:` is this repo.

| Label or fact | Source |
|---|---|
| `+` next to Projects: aria-label "Add project", tooltip "New project or assistant" | S:apps/web/src/components/studio/shell/StudioSidebar.tsx:320-329 |
| "Local folder" / "Browse a folder on disk"; "New project" and "Personal assistant" rows above it when a new-projects root exists | S:apps/web/src/components/CommandPalette.tsx:1666-1667, 1676-1701 |
| Path placeholder "Enter path (e.g. ~/projects/my-app)" | S:apps/web/src/components/CommandPalette.logic.ts:624 |
| "New chat"; with one project it skips the project picker | S:…/StudioSidebar.tsx:292, 248-256 |
| "What should we build in {project}?" | S:apps/web/src/components/chat/DraftHeroHeadline.tsx:388,429 |
| Model picker Providers rail; "Search models..." | S:apps/web/src/components/chat/ModelPickerSidebar.tsx:94; S:apps/web/src/components/chat/ModelPickerContent.tsx:907 |
| Runtime mode control; "Full access" = "Allow commands and edits without prompts." | S:apps/web/src/components/chat/ChatComposer.tsx:1320; S:apps/web/src/components/chat/runtimeModeConfig.ts:23-26 |
| "Current checkout" | S:apps/web/src/components/BranchToolbar.logic.ts:98 |
| Composer placeholder "Ask anything, @tag files/folders, $use skills, or / for commands" | S:…/ChatComposer.tsx:7546 |
| `$` opens the skill menu; "Searching workspace skills..." | S:apps/web/src/composer-logic.ts:273; S:apps/web/src/components/chat/ComposerCommandMenu.tsx:142 |
| Desktop send button aria-label "Submit message" ("Send message" is the collapsed mobile composer) | S:apps/web/src/components/chat/ComposerPrimaryActions.tsx:276; S:…/ChatComposer.tsx:3096-3099,6990 |
| "N changed files" card, "Open diff", tooltip "Open the full diff" | S:apps/web/src/components/chat/ChangedFilesTree.tsx:56,101-109 |
| Settings (sidebar footer), Providers section | S:apps/web/src/components/sidebar/SidebarChrome.tsx:218; S:apps/web/src/components/settings/settingsSearch.ts:98 |
| A default-off provider has no row until added or enabled; Codex and Claude always show | S:apps/web/src/components/settings/ProviderSettingsPanel.tsx:788-806 |
| Add provider: button, dialog, steps Provider/Identity/Config, Next, Add instance, toast, saved enabled | S:…/ProviderSettingsPanel.tsx:1215; S:apps/web/src/components/settings/AddProviderInstanceDialog.tsx:383,699,711,364,328; S:…/AddProviderInstanceDialog.logic.ts:8 |
| `init` writes 11 `sw-*` skills to `.claude/skills/` and `.agents/skills/` | every episode's init capture |
| `task done --run` exits 5 and records nothing when the test fails; on exit 0 it records the evidence | W:src/cli/commands/task.ts:8,64,207-209 |
| Ledger agent id: `SPECWEAVE_AGENT`, else `<tool>@<host>`; `SPECWEAVE_TOOL`, `SPECWEAVE_HOST` override | W:src/core/tasks/ledger.ts:95-133 |
| `sw-increment`, `sw-do`, `sw-done` descriptions | W:skills/sw-increment/SKILL.md:2; W:skills/sw-do/SKILL.md:2; W:skills/sw-done/SKILL.md:2 |
| SpecWithCode is free in early access; the public download opens with the first public release | W:docs-site/src/pages/studio.tsx:20,22,23 |

## Demo repo

One seed for all six episodes: a folder named `greet-app`, so the app says "What should we build in greet-app?".

```
greet-app/
  package.json          {"name":"greet-app","version":"0.1.0","private":true,"type":"module","scripts":{"test":"node --test"}}
  README.md             # greet-app
  src/greeting.js       export function greet() { return "Hello, world!"; }
  test/greeting.test.js node:test + assert/strict: greet() === "Hello, world!"
```

It is the claude-code sandbox's starting state (`~/specweave-tutorial-sandbox/claude-code`, first commit). Seed steps per episode: write the files, `git init -b main`, set `user.name "Demo User"` and `user.email demo@example.com` locally, run that episode's `specweave init` command, and commit. The init output is not re-shown live; the TERM beat is typeset from the capture.

## Visual system

Tokens come from `src/styles/brand-tokens.css` (the same file the website uses). Master renders use the light set. The dark set is for posters and thumbnails served to the site's dark mode, and for captions over dark footage.

| Token | Light | Dark |
|---|---|---|
| paper (background) | `#f6f4ee` | `#181914` |
| ink (text) | `#252820` | `#ece8dc` |
| muted | `#65695e` | `#a8ab9d` |
| line (hairlines) | `#d9dcd0` | `#34372e` |
| soft (chips, code background) | `#eff2e8` | `#23261e` |
| accent (thread, arrows, highlights) | `#bd481f` | `#e5794c` |
| terminal background / text | `#20231c` / `#e8ecdf` | `#0f100c` / `#e8ecdf` |
| radius | 4 px | 4 px |

Type: **Newsreader** for display (titles), **IBM Plex Sans** for everything else, the brand mono stack (`ui-monospace, "SFMono-Regular", Consolas, monospace`) for commands, file names and skill names. Embed the font files in the composition so renders match on every machine.

Frame: 1920x1080, 30 fps, 96 px outer margin on MG cards, 48 px inset for chips. Hairline rules (1 px, line color), no drop shadows except `--sw-brand-shadow` on floating chips, no gradients, no stock imagery, no third-party logos (brand use is not cleared; write the agent's name in text). App footage is always real; motion only frames it.

**Intro card (4 s, every episode).** Paper background. Eyebrow at top left: `SPECWITHCODE TUTORIAL 0N`, Plex Sans 500, 24 px, letter-spacing 0.12em, muted. Title `{Agent} in SpecWithCode`, Newsreader 400, 120 px, line-height 1.05, ink, with the agent name in Newsreader italic. Under it the accent thread: a 4 px accent line that draws from 0 to 720 px in 600 ms (ease out), starting at 0.3 s. Subtitle 40 px below: "Plan, build and review one task. The plan stays in your repo.", Plex Sans 400, 36 px, muted. Footer bottom left: `spec-weave.com`, Plex Sans 500, 24 px, muted. Elements rise 12 px and fade in over 300 ms, staggered 80 ms; everything fades out over 250 ms from 3.75 s; hard cut to the terminal.

**Outro card (4 s, every episode).** Same frame and thread. Line 1, Newsreader 72 px: `Next: $sw-done · verify and close`, with `$sw-done` in mono, accent. Line 2, Plex Sans 32 px, ink: `SpecWithCode · free, early access · spec-weave.com/studio`. Line 3, Plex Sans 32 px, muted: `All tutorials · spec-weave.com/tutorials`.

**Step chip.** On every TERM and APP beat. Top left, 48 px inset, soft fill at 92%, 1 px line border, radius 4, Plex Sans 500, 26 px, ink; `→` separators in accent; commands in mono. Text is the beat's `stepChip`; at most 64 characters, trimmed from the front. Fades in with a 4 px rise over 200 ms at 0.2 s, leaves with the beat.

**Sped-up chip.** Top right, 48 px inset, same style, Plex Sans 500, 22 px, muted: `Sped up 6×`. Shown only while footage is faster than real time.

**Terminal.** A centered card on paper: terminal background, 1 px line border, radius 4, 40/48 px padding, mono 30 px, line-height 1.5. Prompt `greet-app %` in muted; the command types at 40 characters a second; output lines appear with a 60 ms stagger. Skipped output shows as one `…` row at 50% opacity. Highlighted lines get a 3 px accent bar on the left. No window chrome, no fake title bar.

**Pointer and highlights (APP).** Cursor ring: 32 px circle, 2 px accent stroke, accent fill at 15%; a click pulses it to 1.4x over 250 ms. Click target: 2 px accent outline, 4 px offset, radius 4, held 0.8 s. Lines in a spec or diff: accent at 12% behind the line. Privacy blur: 12 px gaussian over host names, emails and absolute paths, tracked in the edit.

**Transitions.** Hard cuts between beats. MG elements use 200-300 ms fades with small rises; no slow crossfades, no zoom-throughs. Zoom holds (AC lines, the ledger line) use a still taken from a second, `deviceScaleFactor: 2` context, not an enlarged crop of the video.

## Captions

- Captions are the narration, word for word, in written form: commands, skill names and file names appear as written (`specweave init`, `sw-do`, `spec.md`), not as spoken.
- Burned in: Plex Sans 600, 40 px, line-height 1.3, at most 2 lines of at most 42 characters, centered, bottom edge 64 px above the frame edge. Light pill (ink on paper at 92%, padding 12/24 px, radius 4) over app and MG footage; dark pill (`#ece8dc` on `#181914` at 92%) over terminal beats. Code terms in mono on the soft color.
- Cues: 1 to 6 s, broken at clause boundaries, never inside a command or a file name. No karaoke or word highlighting.
- Files: `<agent>.en.vtt` with the same cues, and `<agent>.chapters.vtt` built from the SHOTLIST `chapter` fields (consecutive shots with the same chapter merge).
- After automatic transcription, correct by hand: SpecWithCode, specweave, SpecWeave, `sw-increment`, `sw-do`, `sw-done`, AGENTS.md. Whisper hears "SpecWeave" as "spec with".

## Audio

- Integrated loudness **-16 LUFS** (±0.5 LU), measured to ITU-R BS.1770 / EBU R128; true peak at or below **-1.0 dBTP**; loudness range at most 8 LU. Two-pass `loudnorm` on the final mix, then check with `ffmpeg -i <file> -af ebur128=peak=true -f null -`.
- Voice: one file per beat (`vo/<shot-id>.wav`, 48 kHz, mono, 24-bit), ElevenLabs over curl with the key loaded per session and never printed. Voice is an open question (Anton clone or Sarah); all six use the same voice and model. Trim heads to 0.15 s and tails to 0.3 s.
- Music: one licensed bed shared by all six, no vocals, at least 18 dB under the voice, a little louder on the intro and outro cards. Record the license in the episode folder.
- No click, typing or whoosh effects.
- Delivery audio: AAC, 192 kbps, 48 kHz, stereo with the voice centered.

### Pronunciation (written VO → what the voice says)

| Written | Spoken |
|---|---|
| SpecWithCode | spec with code |
| specweave, SpecWeave | spec weave |
| sw-increment, sw-do, sw-done | S W increment, S W do, S W done |
| AGENTS.md, spec.md | agents dot M D, spec dot M D |
| ChatGPT, CLI, SDK, IDE, URL | chat G P T, C L I, S D K, I D E, U R L |
| grok --trust | grok dash dash trust |
| opencode auth login | open code auth login |

Word counts and spoken lengths in the scripts use this table.

## Recording plan for APP shots

Never record the real, paired instance (`~/.specweave-studio/m4`, port 8319): its sidebar, Machine picker and Hosts panel show private projects, hosts and quota. Every take runs against a disposable server with only the demo repo. All browser automation is headless.

1. **One disposable folder per episode**, outside the system temp directory (`specweave init` refuses to run there), for example `/Users/Shared/specwithcode-demo/ep0N-<agent>/` with `home/` (the HOME for the server and the agent CLIs), `home/greet-app/` (the seeded repo), `studio/` (the `--base-dir`) and `out/`. A clean HOME keeps your own skills out of the `$` menu (Cursor and Codex also read skills from the user's home) and keeps the agents' data apart from yours.
2. **Agent sign-ins off camera.** In the demo HOME, sign in the CLIs the episode needs before the take: `claude auth login`, `opencode auth login`, `grok login` plus `grok --trust` in the repo. Codex, Cursor and Antigravity sign in inside the app; the browser part is always cut.
3. **Start the server** with a clean environment, so the ledger names the right agent and never the machine:
   `env -i PATH="$PATH" HOME="$DEMO/home" LANG=en_US.UTF-8 SPECWEAVE_HOST=demo SPECWEAVE_TOOL=<agent> specweave-studio serve --base-dir "$DEMO/studio" --port 8329 --no-browser`
   `env -i` drops `CLAUDECODE` and `AI_AGENT`, which would otherwise make every ledger line say `claude@…` (opencode C:05-C:08). `<agent>` is `claude`, `codex`, `cursor`, `opencode`, `grok` or `antigravity`. Use the renamed build's command if the rename changes it. Note the server's PID; stop it with `kill <pid>`, never with a pattern.
4. **Pair without recording.** `specweave-studio pair --base-dir "$DEMO/studio" --json --label recording` writes the pairing details to a mode-600 file. The recorder reads the URL from it without printing or logging it, opens it in a headless context that does not record, saves `storageState` to a mode-600 file, and closes that context.
5. **Record.** Playwright, `chromium.launch({ headless: true })`, then a context with `viewport` and `recordVideo.size` both `1920x1080`, `deviceScaleFactor: 1`, `colorScheme: 'light'`, and the saved `storageState`. Set the app to its light theme. `PWDEBUG=0`, HTML reporter `open: 'never'`.
6. **Drive from SHOTLIST.json.** The recorder walks each APP shot's `steps` by role and name (`click`, `type`, `press`, `expect`), injects the cursor ring, and writes a cue log (`out/cues.json`: shot id, step index, milliseconds) for cutting against the VO. `expect` steps double as label checks on the renamed build: a failed `expect` stops the take.
7. **First run.** A fresh `--base-dir` opens `/welcome`. Episodes 1 and 2 record it. For episodes 3 to 6, finish it before recording: Continue, Continue, Do not import projects.
8. **Real runs only.** Plan and build are real agent turns; speed-ramp them in the edit. Re-take if a real name, path, email or host appears anywhere.
9. **Before each take, check:** the demo environment label is neutral (rename it "Demo Mac"), the first ledger line in a rehearsal reads `<agent>@demo`, no version or "Limited" badge is in frame, and the app shows SpecWithCode, not SpecWeave Studio.
10. **After the final take:** delete the pairing and storage-state files, stop the server by PID, sign the agents out, then delete the demo folder. Keep `out/*.webm` and `cues.json`.

No pairing link, `/pair#token=…`, QR code, API key, sign-in page, account email or account picker ever appears in a recording. Account rows that can reveal an email stay masked. Terminal beats are always typeset from `captures/`, never recorded from a live shell (this Mac's global git hook prints a banner into commits).

## Not verified (all episodes)

- **Every app label** was read from source at `618bfeca`; none was seen rendered, because the running app sits behind pairing and the renamed SpecWithCode build does not exist yet. The `expect` steps in each SHOTLIST are the checks to run on it.
- **Default runtime mode.** Sources disagree: the settings schema defaults to Supervised (S:packages/contracts/src/providerPolicy.ts:32, S:packages/contracts/src/settings.ts:1379-1381), the web app's constant is Full access (S:apps/web/src/types.ts:31), and `docs/user/permission-modes.md` says the initial default is Full access. The series sets Full access explicitly, so the episodes do not depend on it.
- **Open diff contents.** Whether the build turn's diff lists `ledger.jsonl` after the agent commits. If it does not, re-script the review beat before recording; do not substitute other footage.
- **"Do T-01, then stop."** Whether each agent stops there or follows `sw-do` into closing. If it continues, cut at `task done`.
- **Environment reach.** Whether `SPECWEAVE_HOST` and `SPECWEAVE_TOOL` set on the server reach the agents' shells. Check the first ledger line in a rehearsal.
- **Pairing in `storageState`.** If pairing does not survive it, pair inside the recording context and trim the opening seconds.
- **Settings entry point** in the SpecWithCode shell: the cited "Settings" item is in `SidebarChrome.tsx`; if the shell has no footer item, navigate to `/settings/providers` and keep the VO.

## Editorial decisions

1. One demo repo and one task for all six; the agent is the only variable.
2. Plan and build are two separate sends in every episode (the Codex draft combined them in one prompt).
3. Cursor and OpenCode are added through Add provider, like Grok and Antigravity. Their drafts flipped a switch on a row that a fresh home does not show (S:…/ProviderSettingsPanel.tsx:788-806).
4. Full access is set on camera in every episode. Grok stalls in Supervised, and the Cursor SDK sandbox may block `specweave` and `git` outside Full access.
5. Messages are sent with Enter. The desktop button is "Submit message", not "Send message".
6. Cut, because they do not change what the viewer does: Claude Code's terminal task list and `$`→`/` overlay, Codex's spec card and ledger/verify terminal beat, OpenCode's skill-list terminal and read-only Plan dialog beats, Antigravity's "no Plan mode" outro, and the `ls` skill listings everywhere. Their captures stay as evidence.
7. The drafts' per-beat "Caption" summaries became the step chip; captions are now the narration itself.
8. No third-party logos until brand use is cleared.
