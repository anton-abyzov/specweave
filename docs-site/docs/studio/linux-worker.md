---
title: "Run SpecWithCode workers on a Linux VPS or server"
sidebar_label: Linux worker
description: "Add a Linux machine on x64 or arm64, such as a Hetzner, DigitalOcean or AWS VPS, to your SpecWithCode fleet: verify and unpack the release archive, run it as a systemd user service, link SpecWithCode Connect, and pair it with fleet invite. Tailscale is an optional fallback."
---

# Linux worker

A Linux machine you control can run workers for the coordinators on your main computer: a small VPS, a cloud VM or a box at home. It runs the same SpecWithCode server as a Mac worker; only the install differs. You rent the machine and sign its provider CLIs in with your own accounts. SpecWithCode does not start sessions on anyone else's cloud.

The machine reaches your main computer through [SpecWithCode Connect](/docs/studio/connect), the same way your other machines do. You need no Tailscale and no open inbound port.

## Subscriptions or API keys

A Linux worker signs its agents in exactly as a Mac or Windows worker does: each agent's own sign-in, such as `claude auth login` for Claude Code or Connect with ChatGPT (or `codex login`) for Codex. Subscriptions work, and SpecWithCode needs no API key. On a Linux machine you own, at home or in an office, sign in with your subscriptions as you would on a Mac.

> **On a server you rent, we recommend API keys.** Providers can treat subscription sign-ins from datacenter addresses (Hetzner, AWS and the like), and one account active on several machines at once, as signs of reselling, and accounts have been locked for it. On a rented server, use an Anthropic Console key or an OpenAI API key, billed per token, as in [Give the agents API keys](#give-the-agents-api-keys). This is our advice, not a limit: SpecWithCode does not check it.

Every release ships `studio-<version>-linux-x64-….tar.gz` and `studio-<version>-linux-arm64-….tar.gz` with a `SHA256SUMS` file ([latest release assets](https://github.com/anton-abyzov/specwithcode/releases/latest)).

## What you need

- Linux on x64 or arm64 with glibc and a systemd user session: Debian 12, Ubuntu 22.04 or later, or Fedora 40 or later. AWS Graviton, Hetzner CAX and Azure Dpsv5 machines are arm64.
- Node.js 22.20 or a later 22.x release.
- A SpecWithCode Connect account, the same one your main computer is signed in to. Connect includes 3 machines; see [how many machines](/docs/studio/connect#how-many-machines).
- The provider CLIs you want to run there (`claude`, `codex` and others), signed in with your subscriptions on a machine you own, or with API keys on a rented server (see [Subscriptions or API keys](#subscriptions-or-api-keys)).

The server opens the Connect link outward, so the machine needs no open inbound port. Leave the provider's firewall closed to everything but SSH. A Windows 10 or 11 PC on x64 can be a worker too: install the Windows desktop app and follow [Add a machine](/docs/studio/add-a-machine).

## Install the server

Since 1.0.44 the release also carries `install.sh`, which does the steps below in one line and starts the background service. Then link Connect and make the line, as below:

```bash
curl -fsSL https://github.com/anton-abyzov/specwithcode/releases/latest/download/install.sh | bash
```

To install by hand instead, download the archive and its checksums, and verify them:

```bash
ARCH=$(uname -m | sed 's/x86_64/x64/; s/aarch64/arm64/')
BASE=https://github.com/anton-abyzov/specwithcode/releases/latest/download
curl -fsSLO "$BASE/SHA256SUMS"
ARCHIVE=$(grep -o "studio-[0-9.]*-linux-$ARCH-[0-9a-f]*\.tar\.gz" SHA256SUMS | head -n1)
VERSION=$(echo "$ARCHIVE" | sed -E 's/^studio-([0-9.]+)-linux-.*/\1/')
curl -fsSLO "$BASE/$ARCHIVE"
grep "$ARCHIVE" SHA256SUMS | sha256sum -c -
```

Unpack it into a temporary folder and run its `bin.mjs` once to set up the background service:

```bash
mkdir -p /tmp/swc && tar -xzf "$ARCHIVE" -C /tmp/swc
sudo loginctl enable-linger "$(id -un)"
node /tmp/swc/bin.mjs service install
```

`service install` pins this version under `~/.specwithcode/runtime/versions/$VERSION` and writes the systemd user unit; lingering keeps the service running after you log out and starts it at boot. Then put the command on your `PATH` and remove the temporary copy:

```bash
mkdir -p ~/.local/bin
ln -sf ~/.specwithcode/runtime/versions/$VERSION/specweave-studio ~/.local/bin/specwithcode
rm -rf /tmp/swc
specwithcode service status
specwithcode --version
```

Keep `~/.local/bin` on the `PATH`. The service takes the `PATH` of your login shell when it starts: install `claude` and `codex` so they run in a new SSH session, then run `specwithcode service restart`.

## Update it

The service runs the pinned copy under `~/.specwithcode/runtime/versions/<version>`, so unpacking a new archive elsewhere does not change what runs. Update it one of these ways:

- On the machine, run `STUDIO_ENABLE_SELF_UPDATE=true specwithcode update --yes`. It installs the next release under `~/.specwithcode/runtime/versions/<version>`, switches the `specwithcode` command to it and restarts the service; `--yes` allows the restart from a script.
- Update it from the Mac.
- Unpack the new release as above and run its `node bin.mjs service install` again, which pins the new version and rewrites the unit.

## Give the agents API keys

On a rented server, follow these steps. On a machine you own, you can skip them and sign in with `claude auth login` and `codex login` instead.

Create a key in the [Claude Console](https://platform.claude.com/settings/keys), set a spend limit on its workspace, and save it in a file only you can read. From your main computer, run this, then paste the key at the prompt; it is not shown:

```bash
ssh -t you@your-vps 'umask 077; mkdir -p ~/.config/specwithcode; printf "Paste the API key, then Enter: "; read -rs K; printf "%s\n" "$K" > ~/.config/specwithcode/anthropic.key; echo; echo saved'
```

Never paste a key into a chat. Then let Claude Code read it on the server, so nothing is signed in:

```bash
curl -fsSL https://claude.ai/install.sh | bash
mkdir -p ~/.claude
cat > ~/.claude/settings.json <<'EOF'
{ "apiKeyHelper": "tr -d '[:space:]' < ~/.config/specwithcode/anthropic.key" }
EOF
claude -p "Reply with OK"
```

For Codex, install it with `sudo npm install -g @openai/codex`, then run `printenv OPENAI_API_KEY | codex login --with-api-key` with the key in that variable. Do not run `claude login` or `codex login` with a subscription on a rented server. Run `specwithcode service restart` afterwards.

## Link SpecWithCode Connect

On the server, run:

```bash
specwithcode connect
```

Over SSH it prints a link and a short code. Open the link on any device, check that the code matches, and approve with your Connect account. Your main computer does not need to be signed in to Connect. The machine keeps the same Connect address through restarts and updates. [Connect](/docs/studio/connect#link-a-machine) has the details.

## Pair it with your main computer

On the server, run:

```bash
specwithcode fleet invite --coordinator '<main-machine-environment-id>' --via connect --label "Hetzner VPS"
```

It prints one line starting with `swc-machine-`. Treat it like a password. With Connect linked, the line carries the machine's Connect address and works once, within an hour. On your main computer, paste it under **Settings > Connections > Your private machines > Add a machine** and choose **Add machine**, or run `specwithcode fleet add <that line>`. Then choose **Allow workers** on the new card. Reaching the machine does not let anyone use it: the line and **Allow workers** are what grant access. [Add a machine](/docs/studio/add-a-machine) covers the rest, including the one-subscription-per-machine recommendation.

If your main computer cannot reach the worker, **Your private machines** shows a banner that it is not on SpecWithCode Connect. Run `specwithcode connect` on the worker again and make a new line.

From then on a coordinator starts work there when you ask, for example "run the tests on the Hetzner VPS".

## Optional: Tailscale as a fallback route

You do not need Tailscale. If the server and your main computer are also on the same tailnet, a new line carries the private `*.ts.net` address too, and the main computer uses it only when Connect does not answer. [Add a machine](/docs/studio/add-a-machine#optional-tailscale-as-a-fallback-route) shows how to set it up.

## Projects on the worker

Clone each project on the worker from the same remote as on the Mac and register it in SpecWithCode there, so the coordinator can match the two. Install the project's toolchain on the worker. Nothing is synchronized between machines: not files, not provider sign-ins, not browser logins.

## Cost

An idle worker uses well under one CPU and a few hundred MB of memory; the agents it runs decide the rest. A 2 vCPU, 4 GB VPS is enough for one or two agents at a time. You pay the host directly; SpecWithCode adds nothing.
