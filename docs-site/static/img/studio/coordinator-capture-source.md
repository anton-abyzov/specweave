# /code capture provenance

All hero and workflow screenshots on /code, and `docs-site/static/video/code-run-20261015.mp4`, come from one real session of the released SpecWithCode 1.0.21 server (`apps/server/dist/bin.mjs` from the shipped `SpecWithCode.app`), recorded on 15 October 2026 between 8:32 and 8:40 AM EDT. Its web client was driven by headless Chromium (Playwright, 2x device scale, dark scheme); nothing was mocked or edited apart from cropping, scaling and WebP or H.264 encoding.

The demo project is a fresh Git repository at `/Users/Shared/specwithcode-demo/tip-calculator` with a fresh data folder and browser profile, so no personal projects, threads or accounts appear. The host label shows "MacBook Pro" because a `scutil` shim returned that name instead of the real computer name. Provider sign-in, usage and quota screens were not captured.

The run: the coordinator (Claude Code, Opus 5.5, Supervised mode) started a Codex worker (GPT-6.1-Sol) to write `tip.py` and a Claude Code worker (Opus 5.5) to add a README Usage section. Codex asked for one command approval, which was approved; `python3 tip.py 50 18` printed `Tip: $9.00` and `Total: $59.00`. The coordinator reported that the README example was unverified, so a follow-up asked the README worker to run the script and use its exact output. Nothing was committed.

- `code-hero-20261015.webp`: coordinator after the follow-up, with the Codex worker thread open (sidebar cropped out).
- `flow-composer-20261015.webp`: composer with model, effort and approval controls.
- `flow-dispatch-20261015.webp`: coordinator starting both workers; Codex shows "Approval requested".
- `flow-worker-codex-20261015.webp`: Codex worker thread with the coordinator brief and the command approval.
- `flow-worker-claude-20261015.webp`: Claude Code worker report after the follow-up.
- `flow-coord-report-20261015.webp`: coordinator summary after the follow-up.
- `code-run-20261015.mp4`: frames captured every few seconds across both turns; frames with no visible change were dropped, the rest are shown 0.35 s each (about 23 s in total, silent).

`flow-usage-limits.webp` comes from the 10 October 2026 `studio-tutorial.mp4` recording, and `native-controls-20261008.png` and `provider-status-20261008.png` were captured on 8 October 2026. The landing page's animated coordinator diagram and the subscription chart are labelled illustrations.

- `code-hero-worker-20261015.webp` (added 18 October 2026): the right pane of `code-hero-20261015.webp`, cropped to the Codex worker thread's final report and its 2 changed files. Same capture, cropped only.
