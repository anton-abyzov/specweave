# One Chrome extension for every agent

SpecWithCode tutorial, slug `specwithcode-browser`. 1920x1080, 30 fps, about 65 s, plus a 1080x1920 vertical cut. Guide: `/docs/studio/browser`. Store listing: https://chromewebstore.google.com/detail/specwithcode-browser/okoinngelinfjfkmkcnbgndapeiofgbb

Source keys: `S:` = specwithcode-dev at the recorded release, `E:` = `apps/chrome-extension/` in it, `D:` = `docs-site/docs/studio/browser.md`.

## How it is made

Demo folder `/Users/Shared/specwithcode-demo/tut10-specwithcode-browser/` (`<demo>`).

1. `scripts/copilot.sh <demo>` writes `tools/bin/copilot`, which runs the installed GitHub Copilot CLI with the real HOME: Copilot reads its GitHub sign-in from the login keychain. The server, Codex and the project use the disposable demo HOME.
2. `STUDIO_BIN=<release>/bin.mjs scripts/setup-take.sh <demo> <take>`: seeds greet-app (the same one-page demo as `agents-use-a-browser`, served on 127.0.0.1:5173), writes the Copilot provider into `studio/userdata/settings.json`, copies a short-lived Codex login (no refresh token), starts the server on 8351, pairs the recording browser and runs `record.mjs --prepare` (welcome wizard, greet-app as a Local folder, Full access).
3. The store build: `crx/store.crx` from the Web Store update service, unpacked by `unpack_crx.py` with the CRX3 header's public key written into `manifest.json`, so the extension ID is the store's (`okoinngelinfjfkmkcnbgndapeiofgbb`) and Settings reports it as a store install.
4. `EXT=<unpacked> STUDIO_TEST_CHROMIUM=<Chrome for Testing> PWDEBUG=0 node scripts/record.mjs SHOTLIST.json <take>/secret/state.json <take>/out`: one headless take of two browsers at once. The app records to `take.webm`. A separate headless Chrome profile with the extension records every page: the popup (opened as a tab, since headless Chrome has no toolbar, and zoomed 2.2x) and each tab an agent opens. `cues.json` lists each Chrome video with the cue time it started.
5. The pairing code carries a token, so `record.mjs` blurs it in the app field and the popup field.
6. Narration: `scripts/tts.mjs scripts/vo-lines.json <demo>/vo vo-timing`, ElevenLabs `0Ki1af67ybTaTu4TNmO8` on `eleven_v4` (stability 0.5, similarity 0.75, speaker boost, speed 1.0).
7. `scripts/build-composition.mjs`, HyperFrames 0.8.145 `check` and `render --quality delivery --fps 30`, then `scripts/finish.sh` (-16 LUFS, poster).

## Beats

### 01-intro · card
VO: One Chrome extension, for every agent you run in SpecWithCode.

### 02-install · Install from the Chrome Web Store
VO: Open Settings, Chrome. Add to Chrome opens SpecWithCode Browser in the Chrome Web Store, and Chrome keeps it up to date.
- "Add to Chrome" and the hint "Open the link in the Chrome profile agents should use. Chrome keeps the extension up to date." (S:apps/web/src/components/settings/BrowserExtensionSettings.tsx). D: step 2.

### 03-pair · Pair a Chrome profile
VO: Choose Show pairing code, and copy it. In Chrome, click the SpecWithCode icon, paste the code, name this profile Work, and pair it.
- "Show pairing code", "Copy" (S:…/BrowserExtensionSettings.tsx). Popup labels "Pairing code", "Name this Chrome profile", "Pair this profile" (E:src/popup.html). D: steps 3-4.

### 04-copilot · GitHub Copilot uses your Chrome
VO: Start a chat with GitHub Copilot, and ask it to check the demo page in your Chrome. It opens a tab, types Ada, presses Greet, and reads back Hello, Ada.
- The thread shows "Open a tab in Chrome", "Read a Chrome tab" and the other Chrome tool rows; the recorded Chrome tab shows the page filling in.

### 05-codex · Codex uses the same extension
VO: In another chat, Codex uses the same extension, in tabs of its own. You install it once, for every provider.
- Each thread keeps its own tabs (S:apps/server/src/browserExtension/chromeTools.ts, tab ownership per thread).

### 06-control · Stay in control
VO: Agent tabs stay in the blue SpecWithCode tab group. Drag a tab out to take it back. Or press Pause, and no agent can use this profile.
- Popup footer: agent tabs sit in the blue SpecWithCode tab group; drag a tab out of it to take it back (E:src/popup.html). Pause sets "Paused. Agents cannot use this profile." (E:src/background.js).

### 07-outro · card
VO: Get SpecWithCode Browser from the Chrome Web Store. The link is below.
