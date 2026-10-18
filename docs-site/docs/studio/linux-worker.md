---
title: "Run SpecWithCode workers on a Linux VPS or server"
sidebar_label: Linux worker
description: "Add a Linux machine on x64 or arm64, such as a Hetzner, DigitalOcean or AWS VPS, to your SpecWithCode fleet: verify and unpack the release archive, run it as a systemd user service over Tailscale Serve, and pair it with fleet invite."
---

# Linux worker

A Linux machine you control can run workers for the coordinators on your Mac: a small VPS, a cloud VM or a box at home. It runs the same SpecWithCode server as a Mac worker; only the install differs. You rent the machine and sign its provider CLIs in with your own accounts. SpecWithCode does not start sessions on anyone else's cloud.

Release 1.0.44 (18 October 2026) ships `studio-1.0.44-linux-x64-….tar.gz` and `studio-1.0.44-linux-arm64-….tar.gz` with a `SHA256SUMS` file ([release assets](https://github.com/anton-abyzov/specwithcode/releases/tag/v1.0.44)).

## What you need

- Linux on x64 or arm64 with glibc and a systemd user session: Debian 12, Ubuntu 22.04 or later, or Fedora 40 or later. AWS Graviton, Hetzner CAX and Azure Dpsv5 machines are arm64.
- Node.js 22.20 or a later 22.x release.
- Tailscale, signed in to the same tailnet as your Mac, with MagicDNS. The fleet accepts only private `*.ts.net` HTTPS addresses.
- The provider CLIs you want to run there (`claude`, `codex` and others), signed in on that machine. On a rented server, prefer an API key over a subscription sign-in.

Tailscale connects outward, so the machine needs no open inbound port. Leave the provider's firewall closed to everything but SSH, or close SSH too and use Tailscale SSH. Windows hosts cannot run workers.

## Join the tailnet

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Sign in with the Tailscale account your Mac uses, then turn off key expiry for this machine in the Tailscale admin console.

## Install the server

Since 1.0.44 the release also carries `install.sh`, which does the steps below in one line, starts the background service and, with `--join`, prints the invitation line:

```bash
curl -fsSL https://github.com/anton-abyzov/specwithcode/releases/latest/download/install.sh | bash -s -- --join
```

To install by hand instead, download the archive and its checksums, and verify them:

```bash
VERSION=1.0.44
ARCH=$(uname -m | sed 's/x86_64/x64/; s/aarch64/arm64/')
BASE=https://github.com/anton-abyzov/specwithcode/releases/download/v$VERSION
curl -fsSLO "$BASE/SHA256SUMS"
ARCHIVE=$(grep -o "studio-$VERSION-linux-$ARCH-[0-9a-f]*\.tar\.gz" SHA256SUMS | head -n1)
curl -fsSLO "$BASE/$ARCHIVE"
grep "$ARCHIVE" SHA256SUMS | sha256sum -c -
```

Unpack it into a folder of its own and give it a command:

```bash
mkdir -p ~/.local/share/specwithcode/runtime/$VERSION ~/.local/bin
tar -xzf "$ARCHIVE" -C ~/.local/share/specwithcode/runtime/$VERSION
printf '#!/bin/sh\nexec node "%s/bin.mjs" "$@"\n' "$HOME/.local/share/specwithcode/runtime/$VERSION" \
  > ~/.local/bin/specwithcode
chmod +x ~/.local/bin/specwithcode
specwithcode --version
```

Keep `~/.local/bin` on the `PATH`. To update, unpack the next release into its own folder and point the wrapper at it.

## Run it over Tailscale

Start it once by hand, then make it a user service that survives logouts and reboots:

```bash
specwithcode serve --tailscale-serve     # prints its https://<host>.<tailnet>.ts.net address
specwithcode service install
specwithcode service status
```

## Pair it with your Mac

```bash
specwithcode fleet invite --label "Hetzner VPS"
```

It prints one line starting with `swc-machine-`. Treat it like a password. On the Mac, paste it under **Settings > Connections > Your private machines > Add a machine**, then choose **Allow workers** on the new card. [Add a machine](/docs/studio/add-a-machine) covers the rest, including the one-subscription-per-machine recommendation.

From then on a coordinator starts work there when you ask, for example "run the tests on the Hetzner VPS".

## Projects on the worker

Clone each project on the worker from the same remote as on the Mac and register it in SpecWithCode there, so the coordinator can match the two. Install the project's toolchain on the worker. Nothing is synchronized between machines: not files, not provider sign-ins, not browser logins.

## Cost

An idle worker uses well under one CPU and a few hundred MB of memory; the agents it runs decide the rest. A 2 vCPU, 4 GB VPS is enough for one or two agents at a time. You pay the host directly; SpecWithCode adds nothing.
