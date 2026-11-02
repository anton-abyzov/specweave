---
title: "Add a machine to SpecWithCode: link Connect, invite the machine, allow workers"
sidebar_label: Add a machine
description: "Let coordinators on your main computer start workers on a second Mac, a Linux box or a VPS. Link SpecWithCode Connect on the new machine, choose Invite this machine in Settings > Connections, paste the line on your main machine and allow workers. Tailscale is an optional fallback. Why we recommend one machine per AI-provider subscription."
---

import TutorialEmbed from '@site/src/components/TutorialVideo/TutorialEmbed';

# Add a machine

Coordinators on your main machine can start workers on your other computers: a second Mac, a Windows PC, a Linux box at home or a rented VPS. Each worker runs in its own checkout on that machine, with that machine's own provider sign-ins.

Machines reach each other through [SpecWithCode Connect](/docs/studio/connect), so it does not matter which network each one is on, and nothing on your router changes. Everything below is in **Settings > Connections**; you never need a terminal on a Mac with the desktop app.

Adding a machine takes four steps:

1. On the new machine (the **worker**), [link SpecWithCode Connect](#1-link-connect-on-the-worker).
2. On the worker, [make an invitation line](#2-make-the-line-on-the-worker). It starts with `swc-machine-`.
3. On your **main machine**, [paste the line](#add-it-on-the-main-machine) under **Settings > Connections > Your private machines > Add a machine**.
4. On the worker's card there, choose **Allow workers**.

Only want to open a machine from your phone, a browser or another computer, without starting workers on it? Step 1 is all you need: see [Connect](/docs/studio/connect).

## 1. Link Connect on the worker

On the worker, choose **Sign in to SpecWithCode Connect** at the bottom of the Settings sidebar, then turn on **Enable SpecWithCode Connect** under **Settings > Connections**. On a server without the desktop app, run `specwithcode connect` there instead. [Connect](/docs/studio/connect#link-a-machine) has the details.

Only the worker needs Connect. The main machine does not have to be signed in to Connect, or to the same account: the line works because the worker checks that the main machine's environment ID matches the one you enter in step 2. If the main machine cannot reach a machine, **Your private machines** shows a banner that says which machine is not linked yet.

Connect includes 3 machines; the first 300 accounts get 10 as [founders](/pricing).

## 2. Make the line on the worker

The line holds a management credential for the worker. Treat it like a password: paste it only into your own main machine, never into a chat, an issue or a shared document.

### With the desktop app

**On a new install**, the first screen asks how you will use this machine. Choose **Connect to an existing one**; it skips setting up agents and projects on the worker. **Start as a main machine** sets them up here instead.

**On a machine that is already set up**, open **Settings > Connections > Your private machines** and, next to **Add this machine to another one**, choose **Invite this machine**.

Then:

1. The app checks that Connect is linked here. If not, it shows **Link SpecWithCode Connect first** and clears on its own once you sign in and turn Connect on.
2. Paste your main machine's environment ID under **Main machine environment ID**. The main machine shows it in its **Add a machine** steps and under **Settings > Connections**. This approves that machine, and only that one, to manage this worker.
3. Optionally type a name under **Name on the main machine**. Left empty, the machine's own name is used.
4. Choose **Make the line**, then **Copy** the `swc-machine-…` line. A line with a Connect address works once, within an hour.

The line is shown only once: copy it before you close the dialog, or make a new one. **Revoke this line** turns it off. Only a session with **Manage access** on that machine can make the line. Version 1.0.43 and earlier have no button for this, so update the app first.

### Without the desktop app

One line installs SpecWithCode on an Apple silicon Mac or a Linux machine (x64 or arm64, with glibc and systemd) and starts it as a background service:

```bash
curl -fsSL https://github.com/anton-abyzov/specwithcode/releases/latest/download/install.sh | bash
```

The installer checks the archive against `SHA256SUMS` and brings its own Node.js 22.20; `--node /path/to/node` uses yours instead (22.20 or a later 22.x). Add `--dry-run` (`bash -s -- --dry-run`) to see what it would do. On that machine, run `specwithcode connect` to link Connect, then `specwithcode fleet invite --coordinator '<main-machine-environment-id>' --via connect` to print a fresh line.

For a Linux server or VPS that should keep running after you log out, follow [Linux worker](/docs/studio/linux-worker) instead.

## Watch it

Recorded with SpecWithCode 1.0.47: the invitation line on a Mac mini, adding it on the main Mac, and allowing workers. That recording joins the machines over Tailscale; with Connect the steps on screen are the same. In 1.0.47, **Allow workers** also asks for a one-time pairing code; the video shows where it goes.

<TutorialEmbed slug="add-a-machine" />

Setting up a new Mac from scratch? [Join a new Mac to your main machine](/tutorials/join-a-mac/) shows the line made from the welcome screen (now **Connect to an existing one**).

## One machine per subscription

We recommend one machine for each AI-provider subscription you pay for. Sign each machine in once, one account per provider, and leave it that way: for example, Claude Code signed in to one Anthropic account on the MacBook, and Codex signed in to another OpenAI account on the Mac mini.

Do not switch subscriptions by hand on those machines. A machine that changes accounts makes everything harder to read: which account ran which thread, which limit is full, where a handoff can continue. SpecWithCode reads limits per account and per machine, and it never offers **Continue on** a machine signed in to the same account that just ran out.

When you need more capacity, add another machine with its own subscription. Two machines signed in to the same account share that account's limits, so running agents on both spends the limit faster, not slower.

## Optional: Tailscale as a fallback route

You do not need Tailscale. If both machines are also on the same tailnet, the main machine keeps the worker's private Tailscale name as a direct fallback and still tries Connect first. To add it, install [Tailscale](https://tailscale.com/download) on both machines, sign in with the same account, make sure **DNS > MagicDNS** and **DNS > HTTPS Certificates** are on in the admin console, and choose **Disable key expiry** for each machine. Then make a new line on the worker; it carries both addresses. The worker is published inside your tailnet with Tailscale Serve, never on the public internet. `specwithcode fleet invite --via tailscale` makes a Tailscale-only line for a main machine on an older version that cannot read a Connect line.

## Add it on the main machine

1. Open **Settings > Connections > Your private machines**.
2. Paste the line into **Add a machine** within an hour and choose **Add machine**. The main machine checks that the address answers as that machine before saving it. A line made for a different main machine stops with "made for a different main machine": make a new line on the worker with this machine's environment ID.
3. With **Connect automatically** on, the main machine pairs with the worker within a minute. Otherwise choose **Connect machine** on its card. With Connect only, this browser pairing waits; see [With Connect only](#with-connect-only).
4. Choose **Allow workers** on the card, and pick the most a worker there may do.

From a terminal on the main machine, `specwithcode fleet add swc-machine-…` does the same. `specwithcode fleet list` shows every machine and whether it answers now; `specwithcode fleet remove <name>` takes one off the list.

Keep SpecWithCode running on the worker. Coordinators can start work there only while its app or server runs and its Connect link is online.

## With Connect only

Everything coordinators need works over Connect alone. Two conveniences still need the optional Tailscale route, and each has a Connect alternative:

| Without Tailscale | Do this instead |
|---|---|
| **Connect automatically** or **Connect machine** does not pair your browser with the worker | Open the worker from your devices through its own [Connect](/docs/studio/connect) link. Work you send to it still goes through. |
| **Use this Mac's GitHub sign-in** is not offered (it never goes through Connect) | Choose **Sign in with a code instead** on the worker's readiness check. |

## What the worker needs for a project

The project must exist on the worker as its own checkout, cloned from the same remote as on the main machine, and registered in SpecWithCode there. Install the project's toolchain on the worker as you would on any machine. Workers a coordinator starts run on the coordinator's own machine unless you name another one, for example "use the Mac mini".

## Keep your provider accounts safe

- Each machine's agents talk to Anthropic, OpenAI and the other providers from that machine's own connection, with that machine's own sign-in. Connect and Tailscale change nothing about how a provider sees your account.
- Workers on a Mac, Linux or Windows sign in the same way: each agent's own sign-in, such as `claude auth login` or Connect with ChatGPT for Codex, subscriptions included. Nothing requires an API key.
- Prefer machines you own on a home or office connection for subscription sign-ins. On a server you rent in a datacenter, we recommend API keys instead, as [Linux worker](/docs/studio/linux-worker#subscriptions-or-api-keys) explains. SpecWithCode does not check this for you.
- Never route one subscription through a shared proxy or pool several behind one endpoint.
- Turn on two-factor sign-in for your SpecWithCode Connect account, and for Tailscale if you use it. They are the keys to every machine in the fleet.

## Revoke a line

A line works for a year unless you revoke it (`fleet invite --ttl` changes that). On the worker, open **Settings > Connections > Authorized clients** and revoke **Fleet management (fleet invite)**, or run `specwithcode auth session list` and `auth session revoke`. To add the machine again, make a new line and add it on the main machine; that updates the same machine in place.

## When something is wrong

| You see | What to do |
|---|---|
| A banner says a machine "isn't on SpecWithCode Connect" | On that machine, open **Settings > Connections > SpecWithCode Connect** and link it. It then connects on its own. |
| The invite asks for Tailscale | Connect is not linked on this machine yet. Link it (step 1) and choose **Invite this machine** again. |
| "Tailscale is not installed", "no Tailscale name" or "could not publish on HTTPS port 443" | Only for the optional Tailscale route: install and sign in to Tailscale, turn on MagicDNS and HTTPS Certificates. Or skip Tailscale and use Connect. |
| "No running SpecWithCode server found." | Open the desktop app, or start `specwithcode serve`, then run `fleet invite` again. |
| "This is not a machine invitation." | Part of the line is missing. Make a new one and copy all of it. |
| "This machine is unavailable. Check its private connection and retry." | The worker is off, asleep or not running SpecWithCode, or its Connect link is offline. See [when a machine shows as offline](/docs/studio/connect#when-a-machine-shows-as-offline). |

A laptop that moves to another Wi-Fi keeps its Connect address, so nothing needs to change. While a machine is offline, its threads show "Host offline", and a chat whose machine dropped can continue on another machine.

The full reference is in the SpecWithCode repository: [Add a machine](https://github.com/anton-abyzov/specwithcode/blob/main/docs/user/add-a-machine.md).
