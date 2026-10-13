# SpecWeave Switch

A local companion for selecting native coding subscriptions and restoring reviewed Git work. SpecWeave remains the durable project/intent/task record; this companion holds account observations and managed execution receipts. No native conversation is transcoded and no OAuth credentials are copied between providers.

Requires Node 22. Run `python3 scripts/install-switch.py --node /absolute/path/to/node22 --service` from this directory to install a versioned private bundle, an absolute Node launcher and the loopback service (a launchd agent on macOS, a systemd user unit with linger on Linux). The installer preserves existing launchers/services for explicit update review. `specweave-switch init` preserves current native stores and prepares four Codex and three Claude profile slots. `specweave-switch refresh` checks native authentication and Codex rate-limit observations. Unsigned profiles require each account's own native login. Unavailable Claude quota stays unknown; a successful sign-in is not inference proof.

The private dashboard runs at `http://127.0.0.1:8318` with `specweave-switch serve`. It re-reads native sign-ins and limits every 10 minutes (`--refresh-minutes`, 0 turns it off): Codex through `codex app-server` `account/rateLimits/read`, Claude through the Claude Code control request `get_usage`. Neither sends a prompt, so no model runs and no allowance is spent. The default Claude profile's `get_usage` also names its plan, which verifies a `setup-token` login as a subscription. Balanced favors the least-used eligible account. Reset-first favors the account whose observed reset occurs soonest. Spend-first favors the most-used eligible account, consuming its remaining allowance before switching. Existing runs keep their selected account. Unknown or expired quota requires explicit selection with `--allow-unknown`. Account selection applies to the next managed run; it does not change any already-running Codex or Claude thread.

**One page for every machine.** The main Mac's dashboard shows every machine's accounts through loopback SSH tunnels listed in `STATE/peers.json`; a policy change applies on all of them, and Pin applies on the machine that owns the account. Only `http://127.0.0.1:PORT` peers are accepted. A machine that is off or unreachable shows as offline; its own page keeps working locally. See [Adding a machine](#adding-a-machine).

Use `specweave-switch --help` for run/checkpoint/restore options. Read-only is the run default. `--sandbox workspace-write` explicitly enables native Codex workspace edits or Claude file tools under standard edit permissions; Claude shell and protected writes still require native approval. Exclusive leases apply to this companion's managed runs. Check external native sessions and SpecWeave task ownership before authorizing writes. Automatic failover is read-only and starts a new bounded attempt only after the previous child exits. Native authentication errors and ordinary task failures preserve failed receipts.

Checkpoint files are host-local and private. Capture requires explicit tracked file paths; secret paths/content, symlinks and arbitrary untracked files are denied. Restoration uses a verified base and a new isolated Git worktree. The prior checkout stays intact. A partial restoration is preserved for inspection. Checkpoints carry code state, not hidden reasoning, attachments, pending provider approvals or every tool transcript.

CLIProxyAPI is optional and separate: an API gateway that can pool OAuth logins for API clients. Studio and Switch read native logins directly and never route subscription work through it. `worker-bootstrap.sh` installs it on every worker (skip with `--no-proxy`); `scripts/install-cliproxy.sh` installs it on any macOS or Linux machine by itself: it downloads the pinned official release (8.0.17) and verifies its checksum (or reuses `--from-dir`), generates fresh per-machine client and management keys in `~/.local/share/specweave/proxy/secrets`, binds loopback 8317 only, and runs a launchd agent (macOS) or a systemd user unit with linger (Linux). It refuses to replace an existing install without `--force`, `--if-missing` exits cleanly when an install already answers its own key, and it never touches the auth folder. A 200 model list with zero models only proves it started; keep Claude subscription login in its unmodified native CLI and do not configure API-paid fallback merely to consume subscriptions.

Tailscale installation is separate from macOS network-extension consent, native sign-in and verified tailnet access. Confirm actual host identity, versions, native sign-in, sandbox inference and pairing before accepting work on a worker. Never synchronize live SQLite databases or share a writable checkout between machines.

All automated browser checks explicitly run headless, with `PWDEBUG=0` and `PLAYWRIGHT_HTML_OPEN=never`. Screenshots are saved as files. No provider token or machine password belongs in source, checkpoint, screenshots or reports.

The main Mac's `specweave-mac` helper uses the dedicated private SSH key and verified pins from `~/.local/share/specweave/fleet`, with host references in its private `hosts.json`. `specweave-mac m3 status` reads the worker's own observations. `specweave-mac m1 run --cwd /absolute/worker/git/path --account codex-1 --prompt 'Read the project brief'` runs under that worker's native identity and sandbox. `specweave-mac m3 dashboard` opens a foreground loopback SSH tunnel on port 28318 (M1 uses 18318); keep that command running while viewing the worker dashboard. The helper does not move a project or live session between hosts. Source changes still require a reviewed portable handoff and each worker's own checkout.

## Adding a machine

Run this on the main Mac (M4), from `contrib/subscription-switch`. One command connects a Mac or a Linux machine:

```
scripts/add-machine.sh ID "Label" USER@HOST SLOT [--expect-host NAME] [--pin SHA256:...] [--no-proxy] [--dry-run]
```

It logs in with the fleet key in `~/.local/share/specweave/fleet`, copies this folder to the machine, and runs `scripts/worker-bootstrap.sh` there. That installs the Codex and Claude CLIs in a private folder, Switch on 127.0.0.1:8318 and CLIProxyAPI on 127.0.0.1:8317. Then it runs `scripts/add-peer.sh` on the main Mac, so the machine shows on its Switch page. SLOT N is local port N8318: M1 is 1, M3 is 2, the next machine is 3. You can run it again at any time, because anything already installed and answering is left alone. `--dry-run` prints the steps without connecting.

Once per new machine, before the first run:

1. Turn on SSH login. On macOS: System Settings > General > Sharing > Remote Login. On Debian or Ubuntu: `sudo apt install openssh-server curl python3`. Install Node 22 as well; the bootstrap also finds it in `~/.local/share/specweave/node22/bin`.
2. On the machine, read its host key: `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. Pass that `SHA256:...` value as `--pin`. The key is pinned only if the machine offers exactly that key. If the fleet already holds a different key for that address (a reinstalled machine, or a reused IP), the script stops and names the `ssh-keygen -R` command that drops the old entry.
   Read its hostname too (`scutil --get LocalHostName` on macOS, `hostnamectl --static` on Linux) and pass it as `--expect-host`. It is required for a machine this Mac has no tunnel for yet: the script stops if the address answers with another hostname, or if another tunnel already uses that address.
3. Let the fleet key in: `ssh-copy-id -i ~/.local/share/specweave/fleet/id_ed25519.pub USER@HOST`.

**A new Mac:** `scripts/add-machine.sh m5 "Mac mini" anton@HOST 3 --expect-host Mac-mini --pin SHA256:...`

**The M1:** `scripts/add-machine.sh m1 "M1 Max" anton@192.168.40.134 1`. Its key is already pinned and Switch and CLIProxyAPI already run there, so this checks both, leaves them as they are and refreshes the tunnel. It needs no `--expect-host`, because this Mac already keeps a tunnel to that address under that ID. If the machine is asleep or off the network, the script says it cannot reach it and changes nothing. The M3 is the same with `m3 "M3" antonabyzov@192.168.40.66 2`.

**A Linux server:** `scripts/add-machine.sh linux1 "Linux server" anton@HOST 3 --expect-host HOSTNAME --pin SHA256:...`. On Linux, Switch and CLIProxyAPI run as systemd user units, `specweave-switch` and `specweave-cliproxy`, which restart on failure. Linger keeps them running with nobody logged in. If the script says linger could not be enabled, run `sudo loginctl enable-linger $USER` on the server once. The tunnel lives on the main Mac, so the server needs no launchd.

When it finishes, sign in on the machine as its own user: `~/.local/bin/specweave-switch account login codex-1`, then the other slots. On a machine without a screen, use `codex login --device-auth` and `claude setup-token` from `~/.local/share/specweave/providers/node_modules/.bin`. Then run `~/.local/bin/specweave-switch refresh`. CLIProxyAPI starts with no accounts; it is optional. Studio (SpecWithCode) is installed separately with its own studio-fleet scripts, which are macOS-only today.

On the machine itself, without the main Mac: `SPECWEAVE_WORKER_HOST=<LocalHostName or Linux hostname> SPECWEAVE_WORKER_USER=<user> scripts/worker-bootstrap.sh ID [--no-proxy]`. It stops if the hostname or user does not match.
