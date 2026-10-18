# Add a second machine (add-a-machine)

SpecWithCode 1.0.47, two disposable servers: main on this Mac (127.0.0.1:8347), new machine on the Mac mini (127.0.0.1:8349, `--tailscale-serve --tailscale-serve-port 8445`). One headless take (`scripts/record-app.mjs SHOTLIST.json`), composed with `scripts/build-composition.mjs` from `edit.json`, finished with `scripts/finish.sh`. 73.4 s, -16 LUFS.

Reproduce: `scripts/final-setup.sh` (seed, codex-auth, serve, pair, prepare, mint the pairing code), record, `scripts/tts.mjs scripts/vo-lines.json`, build, `npx hyperframes@0.8.145 render`, finish.

| Beat | Narration |
|---|---|
| 01-intro | Add a second machine. Both machines need Tailscale, signed in to the same account, with MagicDNS and HTTPS certificates turned on. |
| 02-invite | On the new machine, here a Mac mini, open Settings, then Connections. Choose Invite this machine, give it a name, and choose Make the line. SpecWithCode publishes itself on the Mac mini's private Tailscale name, never on the public internet. The line works like a password, so it stays blurred here. |
| 03-add | On your main machine, open the same Connections page. Paste the line under Add a machine, and choose Add machine. The main machine checks that the address answers as that Mac, then lists it as reachable. Its address is blurred too. |
| 04-allow | Pick the most a worker there may do. Version 1.0.47 also asks for a one-time pairing code from the Mac mini, made there beforehand with `specwithcode pair`. Then choose Allow workers. The card now reads Allowed: Full access. |
| 05-outro | Next: add a Linux server you rent, with the Linux worker guide. |

Blurred at capture (init-script CSS): invitation line, pasted line, pairing code, the machine's Tailscale address.

## Product issues found (1.0.47)

1. Allow workers needs a pairing code made on the new machine (Operate threads scopes); the guide says one click. The invite session holds only `access:write`, and fleet-entry scopes are clamped to the standard set, so `canRenewWorkerGrant` is never true.
2. Connect machine fails: "Could not pair this machine. Check its private connection and pairing permission, then retry."
3. A coordinator cannot launch a worker on the added machine: "This logical project has no execution binding on this machine." The planned "a worker runs there" beat was dropped.
4. "This browser connects to it on its own" shows although the auto-connect pairing fails.
5. docs/studio/add-a-machine still names 1.0.44.
