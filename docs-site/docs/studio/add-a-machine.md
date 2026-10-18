---
title: "Add a machine to SpecWithCode: Tailscale, fleet invite and one subscription per machine"
sidebar_label: Add a machine
description: "Let coordinators on your main Mac start workers on a second Mac, a Linux box or a VPS. Install Tailscale on both, make an invitation line with fleet invite on the new machine, paste it under Settings > Connections, and allow workers. Why we recommend one machine per AI-provider subscription."
---

# Add a machine

Coordinators on your main machine can start workers on your other computers: a second Mac, a Linux box at home or a rented VPS. Each worker runs in its own checkout on that machine, with that machine's own provider sign-ins. This page covers SpecWithCode 1.0.44, the current release (18 October 2026, [release notes](https://github.com/anton-abyzov/specwithcode/releases/tag/v1.0.44)).

Joining takes three steps:

1. On the machine you are adding (the **worker**), make an invitation line. It starts with `swc-machine-`.
2. On your **main machine**, paste the line under **Settings > Connections > Your private machines > Add a machine** and choose **Add machine**.
3. On the worker's card, choose **Allow workers**.

## One machine per subscription

We recommend one machine for each AI-provider subscription you pay for. Sign each machine in once, one account per provider, and leave it that way: for example, Claude Code signed in to one Anthropic account on the MacBook, and Codex signed in to another OpenAI account on the Mac mini.

Do not switch subscriptions by hand on those machines. A machine that changes accounts makes everything harder to read: which account ran which thread, which limit is full, where a handoff can continue. SpecWithCode reads limits per account and per machine, and it never offers **Continue on** a machine signed in to the same account that just ran out.

When you need more capacity, add another machine with its own subscription. Two machines signed in to the same account share that account's limits, so running agents on both spends the limit faster, not slower.

## Before you start: Tailscale on both machines

Every machine reaches the others by its private Tailscale name, so it does not matter which network each one is on. Do this once on the main machine and on every worker.

1. Install Tailscale from [tailscale.com/download](https://tailscale.com/download). On a Mac with Homebrew: `brew install --cask tailscale`. On Linux: `curl -fsSL https://tailscale.com/install.sh | sh`.
2. Open Tailscale and sign in **with the same account on every machine**, so they share one tailnet. On Linux, run `sudo tailscale up` and open the link it prints.
3. In the [Tailscale admin console](https://login.tailscale.com/admin), check once that **DNS > MagicDNS** is on and **DNS > HTTPS Certificates** is enabled.
4. Under **Machines**, open each machine's menu and choose **Disable key expiry**, or Tailscale signs it out after a few months and it drops out of the fleet.

The worker is published only inside your tailnet with Tailscale Serve, never on the public internet. Nothing is copied between machines: each keeps its own sign-ins and checkouts.

## Make the line on the worker

The line holds a management credential for the worker. Treat it like a password: paste it only into your own main machine, never into a chat, an issue or a shared document.

### With the desktop app

On the worker, open **Settings > Connections > Your private machines > Add this machine to another one** and choose **Invite this machine**. On a new install, the first screen asks how you will use the machine: **Join my existing machines** does the same without setting up agents or projects.

Give the machine a name if you like and choose **Make the line**. Before the line, the app shows what Tailscale still needs on this machine (installed, signed in, a MagicDNS name) and checks again every few seconds. It never installs Tailscale or runs `sudo` itself. The line is shown once: copy it before you close the dialog, or make a new one. **Revoke this line** turns it off.

Only a session with **Manage access** on that machine can make the line. Version 1.0.43 and earlier have no button for this, so update the app first.

### Without the desktop app

Since 1.0.44, one line installs SpecWithCode on an Apple silicon Mac or a Linux machine (x64 or arm64, with glibc and systemd), starts it as a background service, sets up Tailscale if it is missing and prints the invitation line:

```bash
curl -fsSL https://github.com/anton-abyzov/specwithcode/releases/latest/download/install.sh | bash -s -- --join
```

The installer checks the archive against `SHA256SUMS` and brings its own Node.js 22.20; `--node /path/to/node` uses yours instead (22.20 or a later 22.x). Add `--dry-run` after `--` to see what it would do. Where the `specwithcode` command is already installed, `specwithcode fleet invite` prints a new line on its own.

For a Linux server or VPS that should keep running after you log out, follow [Linux worker](/docs/studio/linux-worker) instead.

## Add it on the main machine

1. Open **Settings > Connections > Your private machines**.
2. Paste the line into **Add a machine** and choose **Add machine**. The main machine checks that the address answers as that machine before saving it.
3. With **Connect automatically** on, the main machine pairs with the worker within a minute. Otherwise choose **Connect machine** on its card.
4. Choose **Allow workers** on the card, and pick the most a worker there may do.

From a terminal on the main machine, `specwithcode fleet add swc-machine-…` does the same. `specwithcode fleet list` shows every machine and whether it answers now; `specwithcode fleet remove <name>` takes one off the list.

Keep SpecWithCode running on the worker. Coordinators can start work there only while its app or server runs and Tailscale is connected.

## What the worker needs for a project

The project must exist on the worker as its own checkout, cloned from the same remote as on the main machine, and registered in SpecWithCode there. Install the project's toolchain on the worker as you would on any machine. Workers a coordinator starts run on the coordinator's own machine unless you name another one, for example "use the Mac mini".

## Keep your provider accounts safe

- Each machine's agents talk to Anthropic, OpenAI and the other providers from that machine's own connection, with that machine's own sign-in. Tailscale changes nothing about how a provider sees your account.
- Prefer machines you own on a home or office connection for subscription sign-ins. On a rented server, sign the provider CLIs in with an API key: SpecWithCode warns before you sign a subscription in on one.
- Never route one subscription through a shared proxy or pool several behind one endpoint.
- Turn on two-factor sign-in for your Tailscale account. It is the key to every machine in the fleet.

## Revoke a line

A line works for a year unless you revoke it (`fleet invite --ttl` changes that). On the worker, open **Settings > Connections > Authorized clients** and revoke **Fleet management (fleet invite)**, or run `specwithcode auth session list` and `auth session revoke`. To add the machine again, make a new line and add it on the main machine; that updates the same machine in place.

## When something is wrong

| You see | What to do |
|---|---|
| "Tailscale is not installed on this machine." | Install Tailscale, open it and sign in, then try again. |
| "This machine has no Tailscale name yet." | Sign in to Tailscale and turn on MagicDNS in the admin console. |
| "Tailscale could not publish this machine on HTTPS port 443." | Enable **DNS > HTTPS Certificates** in the admin console. |
| "No running SpecWithCode server found." | Open the desktop app, or start `specwithcode serve`, then run `fleet invite` again. |
| "This is not a machine invitation." | Part of the line is missing. Make a new one and copy all of it. |
| "This machine is unavailable. Check its private connection and retry." | The worker is off, asleep, signed out of Tailscale or not running SpecWithCode. |

A laptop that moves to another Wi-Fi keeps its Tailscale name, so nothing needs to change. While a machine is offline, its threads show "Host offline", and a chat whose machine dropped can continue on another machine.

The full reference is in the SpecWithCode repository: [Add a machine](https://github.com/anton-abyzov/specwithcode/blob/main/docs/user/add-a-machine.md).
