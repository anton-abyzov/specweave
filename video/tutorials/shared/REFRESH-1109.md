# Current five-agent walkthroughs

The October 28, 2026 replacement uses actual SpecWithCode **1.0.105** UI crops,
recorded in a clean, isolated local instance with its own data directory. No live
user database was copied or opened. Original October 11 recordings remain intact.

These are setup and first-task preparation walkthroughs. The example is an
**unsubmitted draft**. Workflow diagrams are labeled. They do not portray a
completed provider run, a generated diff, or a test pass. Setup screens and model
availability depend on the reader's installed runtime and authenticated account.

The five active composition roots now use only `assets/refresh/` audio and images.
Every audio beat has a receipt: the approved cloned voice, exact script and audio
hashes, model, live voice identity, request ID, timestamp and reported character
cost. All 40 requests were made once, totaling 5,972 spoken characters. There was
no substitute voice, time-stretching, paid provider run, account topup or retry.

The key permits voice catalog and synthesis access. Subscription readback is
refused specifically because it lacks `user_read`; this is retained in the
private preflight report. Currency cost is not returned, so no dollar amount is
asserted. The sum of each response's `character-cost` is in the private cost
receipt.

The production builder is `shared/build-refresh.mjs`. It requires the reviewed
scratch directory containing the exact source captures, generated WAVs, matching
receipts and local Whisper word timings. It validates all audio provenance before
writing the five editable HyperFrames compositions, scripts and caption sidecars.
The old `edit.json`, shot lists and word timings are historical production inputs;
they must not be used to rebuild the replacement media.

```sh
node video/tutorials/shared/build-refresh.mjs /absolute/path/to/reviewed/scratch
PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never npx hyperframes check video/tutorials/claude-code/hyperframes --json
```

The reviewed scratch directory is
`/Users/antonabyzov/specwithcode-promo/tutorial-refresh-20261027`.
It contains request receipts, current UI provenance, transcript comparisons,
render reviews and the exact generation bound. Keep credentials and pairing
secrets out of source, receipts and finished playback.
