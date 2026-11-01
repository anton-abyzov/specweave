# Homepage promo

The video at the top of spec-weave.com/code (`docs-site/src/components/code/HeroStage.tsx`), 1920x1080, 30 fps, 45 s. The render is served from R2 (`npm --prefix docs-site run videos:publish -- <file>`); captions and the poster live in `docs-site/static/video/promo/`.

The 2026-11-01 cut keeps the goal, parallel-agents, review, usage-limit and end-card shots of the October cut and replaces two scenes:

- **01 Coordinator**: the coordinator starts a thread and a follow-up goes back to that same thread. Screens are crops of the real 1144 handoff capture (`30-worker-thread-on-ministorm.png`); the follow-up bubble is an overlay.
- **04 Your browser**: the SpecWithCode Browser extension. The popup is the real extension page (`apps/chrome-extension` in specwithcode-dev, 1.0.4), loaded unpacked in headless Chromium with a sample connected status. The toolbar icon and the blue agent tab groups are crops of a real Chrome window.

## Rebuild

All browser steps are headless (`PWDEBUG=0`). `PLAYWRIGHT_MODULE` points at a Playwright `index.mjs`, `CHROMIUM` at a Chromium executable.

1. `EXTENSION_DIR=<specwithcode-dev>/apps/chrome-extension node scripts/capture-popup.mjs <shots>`, then crop the top 1380 px of `popup-connected.png` into `scene/a/popup.png`.
2. `node scripts/render-scene.mjs threads 10.9 threads.mp4` and `node scripts/render-scene.mjs browser 6.1 browser.mp4` (`STILLS=3,6.5` writes stills instead).
3. Narration: `XI_API_KEY=... node scripts/vo.mjs scripts/vo-lines.json <vo>`, the approved voice only (`video/tutorials/shared/narration.mjs`).
4. `scripts/assemble.sh <previous-promo.mp4> threads.mp4 browser.mp4 <vo> specwithcode-promo-20261101.mp4` (-16 LUFS).
