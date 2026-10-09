# Commands and runtime

Executed from `/Volumes/SanDisk APFS/codex-task-evidence/0891/motion-v2` with Node 22.20.0. All CLI/browser commands use `PWDEBUG=0`, `PLAYWRIGHT_HTML_OPEN=never`; custom browser launch explicitly sets `headless:true`. HyperFrames 0.8.143 renders/snapshots through its headless-shell capture path. No visible preview/browser, provider turn or publication.

```sh
specweave --version
npm view specweave version
npx hyperframes@0.8.143 --version
npm view hyperframes version
npx hyperframes@latest upgrade --project . --check
npx hyperframes@0.8.143 usage --json
npx hyperframes@0.8.143 skills update general-video
npx hyperframes@0.8.143 timeline --json
npx hyperframes@0.8.143 catalog search 'whip pan transition'
npx hyperframes@0.8.143 add whip-pan-cut --no-clipboard
/Users/antonabyzov/.nvm/versions/node/v22.20.0/bin/node build.mjs
PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never PATH=/Users/antonabyzov/.nvm/versions/node/v22.20.0/bin:$PATH npx --yes hyperframes@0.8.143 check --json
PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never PATH=/Users/antonabyzov/.nvm/versions/node/v22.20.0/bin:$PATH npx --yes hyperframes@0.8.143 keyframes --json
PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never PATH=/Users/antonabyzov/.nvm/versions/node/v22.20.0/bin:$PATH npx --yes hyperframes@0.8.143 snapshot --at 0,0.7,1.2,35.3,43.5,44.5 --output verification/final-snapshots --describe false
TMPDIR='/Volumes/SanDisk APFS/codex-task-evidence/0891/motion-v2/tmp' PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never PATH=/Users/antonabyzov/.nvm/versions/node/v22.20.0/bin:$PATH npx --yes hyperframes@0.8.143 render --quality delivery --workers 2 --output agent-driven-demo-final.mp4
# The final render was promoted to agent-driven-demo.mp4 after decode/probe.
ffmpeg -v error -i agent-driven-demo.mp4 -f null -
ffprobe -v error -show_format -show_streams -of json agent-driven-demo.mp4
ffmpeg -hide_banner -i agent-driven-demo.mp4 -vn -af ebur128=peak=true -f null -
TMPDIR='/Volumes/SanDisk APFS/codex-task-evidence/0891/motion-v2/tmp' PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never /Users/antonabyzov/.nvm/versions/node/v22.20.0/bin/node receipts/verify-motion.mjs source
```

For reproduction, work in a copy of `source/`, set a new owned external TMPDIR, and render to a new output filename. The first render was blocked by low internal temp-space; the external TMPDIR retry passed. Source/music normalization recipe and logs are retained. Skill animation-map failed `window.__hf` readiness with the bundled producer adapter; direct pose proof and CLI checks succeeded.
