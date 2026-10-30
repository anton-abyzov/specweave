---
title: "SpecWithCode Connect: reach your machines from anywhere"
sidebar_label: Connect
description: "SpecWithCode Connect links each of your machines to your account through a hosted relay, so your other Macs, a Linux server, a browser or your iPhone reach it from anywhere with no router setup. How to set it up, add a machine, what the plans include, and how to fix a machine that shows as offline."
---

# SpecWithCode Connect

Connect is how your devices reach a machine running SpecWithCode from anywhere: another Mac, a Linux server, a browser or your iPhone. Each machine you link gets a private address on a hosted relay. Nothing on your router changes and nothing is exposed to the public internet without your sign-in.

It is the default route. A machine can also be reached on the local network or over SSH, and SpecWithCode switches to the fastest route that answers, but you only need Connect to get started.

## What you need

- SpecWithCode on the machine you want to reach, running and online while you work. On a server, run it as a [background service](#on-a-server-or-a-headless-mac) so it survives reboots and closed SSH sessions.
- A SpecWithCode Connect account. You sign in once on each device, with the same account everywhere.

## Link a machine

You do this once on **each machine** you want to reach, either sitting at it or over SSH. There is nothing to install on the relay side.

### In the desktop app

1. On the machine, open **Settings > Connections**.
2. Choose **Sign in to SpecWithCode Connect** at the bottom of the Settings sidebar and finish the sign-in in your browser.
3. Turn on **SpecWithCode Connect** for this machine's environment.

The machine is linked when it shows as online in the Connect list. It keeps the same address from then on, through restarts, sleep and updates.

### On a server or a headless Mac

Run this on the machine itself, for example over SSH:

```bash
specwithcode connect
```

Over SSH it prints a link and a short code. Open the link on any device, check that the code matches, and approve; the command continues on its own. Setup then offers to install the background service. Accept it: signing in alone does not make the machine reachable, the server has to run.

If you skipped the service, start the server yourself with `specwithcode serve`.

## Open a linked machine from another device

On your other device (the desktop app on another computer, a browser, or the iPhone app), sign in to the same Connect account and choose the machine. Projects, threads, terminals and agents stay on that machine and run with its own provider sign-ins; your device only drives them.

When both devices are also on the same local network, SpecWithCode learns the machine's local address through Connect and uses it while you are at home, then falls back to Connect when you leave. You do not set this up.

## How many machines

| Plan | Connect machines |
|---|---|
| Free | 3 |
| Founders (the first 1,000 accounts to link a machine) | 10 |
| Pro (waitlist) | Unlimited |

A founder seat is granted automatically on your first successful link, with no form or card, and stays with your account. [Pricing](/pricing) shows how many seats are left. A linked machine counts while it is linked; deregistering one frees its place.

## Remove a machine

Open your account menu's **SpecWithCode Connect** page (on the iPhone, **Settings > SpecWithCode Connect**) and choose **Deregister**. That revokes the machine's access and frees its place even when the machine is offline or wiped. Removing a machine from one device's connection list only forgets it on that device.

On a command-line host, `specwithcode connect unlink` stops publishing the machine but keeps your sign-in; `specwithcode connect logout` also signs out.

## When a machine shows as offline

Work through these on the machine that is offline:

1. **Is SpecWithCode running?** Run `specwithcode service status` and read the log it shows. A machine that disappears when you close SSH is not running as a service.
2. **Is it still linked?** `specwithcode connect status` shows the saved sign-in and link. It is not a live reachability check.
3. **Is it on the latest version?** Update SpecWithCode and restart it. A machine on an old version that stays offline for seven days loses its tunnel and shows a message asking you to update; after the update it comes back at the same address without linking again.
4. **Does the address answer?** Open `https://<its Connect address>/.well-known/studio/environment`. A 530 error means the relay is up but the machine's tunnel client is not running. Restart SpecWithCode on that machine; if it still fails after an update, the update did not install the tunnel client it needs. Update to the latest release, which installs it.

| Error | What to do |
|---|---|
| Machine limit reached (`environment_link_limit_exceeded` or managed tunnel limit) | Deregister a machine you no longer use, then restart SpecWithCode on the new one. Founders who need more than 10 can [ask us](mailto:anton.abyzov@gmail.com?subject=SpecWithCode%20Connect%20machine%20limit). |
| `auth_invalid` or `invalid_bearer` | Run `specwithcode connect login`. If access was revoked, run `specwithcode connect logout`, then `specwithcode connect`, and restart the server. |
| Expired or invalid link proof | Check the machine's date and time, update SpecWithCode, then restart it. |
| HTTP 403 | Check proxies and firewall rules on the machine's network. Keep any Cloudflare Ray ID for a bug report. |
| HTTP 408, 429 or 5xx | A temporary network or relay problem. Startup retries for up to ten minutes. |

After fixing a permanent error, restart the server: on Linux, `systemctl --user restart studio.service`; on a Mac, quit and reopen SpecWithCode. A machine that comes back after downtime reconnects at the same address; you do not link it again.

Treat sign-in links and codes like passwords. Keep them out of screenshots, chats and bug reports.

## Related

- [Add a machine](/docs/studio/add-a-machine) lets coordinators on your main computer start workers on another machine.
- [Linux worker](/docs/studio/linux-worker) sets up a VPS or server.
- [Architecture and boundaries](/docs/overview/studio-architecture) explains every route and what stays on your machines.
