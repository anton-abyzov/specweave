# SpecWeave Studio browser demo — motion and music revision

Final film: `agent-driven-demo.mp4`, 44.500 seconds, 1920×1080, 30fps H.264 with stereo48kHz AAC. SHA256 `5f891b19c868e3300ab308fead1f3135820e8a60778c0870fe6db76b241f51d0`. Matching poster and seven-cue English VTT are adjacent.

The film adds dimensional card rotation, animated callouts, 1.6–1.85× camera focus, a shared-strip whip transition and a readable ending. Its actual source recordings remain byte-identical to v1. The first scene is a completed synthetic task recorded7October2026; its result was reconstructed from verified original tool output. The second scene shows production switching components in an isolated UI fixture. Permanent labels distinguish these scopes. No fresh inference or provider turn occurs. The final1.59seconds hold a frame from the fixture.

Music: [“Make Funk” by HoliznaCC0](https://freemusicarchive.org/music/holiznacc0/bassic/make-funk/), [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). The original MP3, normalized bed and primary license evidence are retained. Measured final mix: −19.6LUFS, −9.8dBTP; 0.35second entrance and2second exit fades verified against the source. No full-scale samples. Audio verification measures the encoded signal; it makes no subjective listening claim.

Editable project: `source/`, pinned HyperFrames0.8.143 on Node22.20.0. Source index SHA256 `f4470e56ee6c2c7cc63912c78624f917826eef0296002f9d8deeaadfdded0e30`. Fonts, GSAP and all media are local. `build.mjs` reproduces the authored HTML/VTT/plan; `verify-motion.mjs` samples21 forward and21 reverse poses in explicit headless Chromium. Zero pose discrepancies. The framework check passed runtime, layout and contrast; eight nonblocking authoring-structure warnings remain. Its no-sidecar motion gate has no assertions, so actual pose samples and encoded-frame review supply motion proof. The separate animation-map helper was unavailable; it is not reported as passing.

Fresh independent review under `review/` binds this exact export and source. Twenty fresh encoded frames, including request/output/diff/transition/full warning/last frame, were inspected. Full decode, music fades, unchanged sources, license hashes and absence of black tail/clipping passed. Previous-export reviews remain in the original external working evidence; they were not rewritten as if they reviewed this export.

Rendering and every browser check stay headless with `PWDEBUG=0`, `PLAYWRIGHT_HTML_OPEN=never`, reporter open never. Temporary render files use an owned external TMPDIR because the internal Mac volume is nearly full. No shared caches, live stores, native sessions or other owners' files are cleaned. No credentials or private test stores are included.

Planned publication: [Studio landing page](https://spec-weave.com/studio/) and [architecture guide](https://spec-weave.com/docs/overview/studio-architecture/). This revision remains local and unpublished. Existing social media and schedules are preserved. The site successor is an independent external clone, branch `codex/0891-studio-demo-motion-site`; owners can fetch its exact branch after authorization.

For further editing by chat, [the HyperFrames desktop app](https://hyperframes.dev/studio/download) provides Framey. The source remains editable locally.
