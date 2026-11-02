# Homepage promo

The video at the top of spec-weave.com/code and specwithcode.com (`docs-site/src/components/code/HeroStage.tsx`), 1920x1080, 30 fps, 60.85 s. The render is served from R2 (`npm --prefix docs-site run videos:publish -- <file>`); captions and the poster live in `docs-site/static/video/promo/`.

The 2026-11-02 cut leads with three problems (one app per AI lab, waiting for a usage reset, work stuck on one machine), then shows the fix on real screens: one window for every agent, the coordinator (indigo) and its threads (teal) with zooms and rings, fallback to another provider at a usage limit, Mac, Linux and Windows machines over Connect, the published SpecWithCode Browser listing on the Chrome Web Store, and a comparison with Claude Code alone and T3 Code. The comparison cells come from each product's public docs, checked 1 Nov 2026; re-check them before reusing the cut.

`scene/v2.html` is one continuous timeline (64.5 s before the 1.06x speed-up). `seek(t)` poses every animation, so frames render deterministically. Images in `scene/b/` are real app captures and a headless capture of the Web Store page.

## Rebuild

All browser steps are headless (`PWDEBUG=0`). `PLAYWRIGHT_MODULE` points at a Playwright `index.mjs`, `CHROMIUM` at a Chromium executable.

1. Narration: `XI_API_KEY=... node scripts/vo.mjs scripts/vo-lines.json <vo>`, the approved voice only (`video/tutorials/shared/narration.mjs`).
2. `node scripts/render-scene.mjs x 64.5 v2-video.mp4` (`STILLS=6.8,27` writes stills instead).
3. `scripts/assemble-v2.sh v2-video.mp4 <vo> specwithcode-promo-20261102.mp4` (-16 LUFS). The narration offsets in the script match the scene times in `v2.html`.
