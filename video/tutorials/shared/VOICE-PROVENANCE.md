# First-task tutorial narration audit

October 27, 2026. Increment 1109, T-03.

The approved identity is **Anton Abyzov best voice**, ElevenLabs voice id
`0Ki1af67ybTaTu4TNmO8`, category `cloned`. The retained verified voice metadata is
`/Users/antonabyzov/specwithcode-promo/look-what-i-built-20261020/evidence/verified-voice.json`.
The user's sole-voice instruction agrees with that retained asset. No substitute
voice is authorized. The current live catalog was not verified: the existing
credential returned `ElevenLabs read-only preflight returned HTTP 401`.

All five October 11 configurations already name that id and `eleven_v4`. The
five old generators had the same SHA-256:
`3199fe6de24e6f4d396216d2820124990fdae6ef28c1586a28c531aad5e68220`.
They skipped every existing raw MP3 by filename alone. They recorded neither the
voice/model/request nor the input/output hashes. Therefore a current configuration
cannot prove which voice synthesized existing cached audio. This explains a route
by which obsolete audio can survive a configuration change; it does not establish
that this happened, nor which wrong voice the user heard.

Inventory found 41 raw MP3 files across the five target episode directories and
4,797 characters in their existing spoken scripts. None of those raw files has a
matching request receipt. Full hashes and active video hashes are retained at
`/Users/antonabyzov/specwithcode-promo/tutorial-refresh-20261027/legacy-audio-inventory.json`.
No original recording, audio file or active published video was deleted during
this audit. T-04 owns reviewed replacement and retirement of the exact active
outputs once replacement media is ready.

The replacement generator is fail-closed: approved voice/model/speed only, a live
voice identity check before any new synthesis, exact input/output receipt matching
before cache reuse, and a pending journal preventing automatic retry of an
outcome-unknown request. A credential failure cannot select another voice.

Validation: `node --test video/tutorials/shared/narration.test.mjs` passes four
tests without credentials or network calls. It exercises wrong voice/model/speed,
receipt-less cache, edited script and changed audio bytes, plus the public CLI's
offline check mode. No synthesis call or paid generation was made.

T-04 still requires valid existing ElevenLabs authentication, current faithful UI
evidence, new narration receipts and inspected/listened final media. This source
audit alone is not acceptance of replacement tutorials.
