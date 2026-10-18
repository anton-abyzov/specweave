---
title: "The SpecWithCode Status page: providers, GitHub, Tailscale and your Mac in one place"
sidebar_label: Status page
description: "Status in SpecWithCode combines the public status pages of Claude, OpenAI, GitHub, Google, xAI and Tailscale with what your own Mac saw, keeps 90 days of history on the Mac, and names what each service affects."
---

# Status page

When a thread fails, the first question is whose fault it is: the provider, GitHub, your network or the app. The Status page answers it in one place. Open **Status** from the account menu at the bottom of the sidebar, or choose **Open status** in the command palette.

## What it watches

| Service | Built from | What depends on it |
|---|---|---|
| Local service | This Mac: the local database and the MCP endpoint agents use | Every thread and window, scheduled tasks, MCP tools for agents |
| MCP and coordinators | This Mac: each project coordinator's last turn | Project coordinators, delegated tasks, scheduled runs |
| Claude | status.claude.com and what this Mac saw | Claude threads, coordinators and usage limits |
| Codex | status.openai.com and what this Mac saw | Codex threads, ChatGPT sign-in, Codex usage limits |
| GitHub Copilot | githubstatus.com | Copilot threads and model access |
| Gemini | status.cloud.google.com | Gemini and Antigravity threads |
| Grok | status.x.ai | Grok threads |
| GitHub | githubstatus.com: Git operations, API requests, pull requests, Actions | Code Review and pull requests, clone and publish, app updates |
| Tailscale | This Mac and status.tailscale.com | Remote machines, phone and browser access over Tailscale |
| Updates | The SpecWithCode release feed and the GitHub API | App updates, service updates on paired machines |

A provider's level combines its public status page with what this app saw in the last hour: sign-in, usage limits and failed turns. So trouble that only your account hits still shows up, even when the provider's page says everything is fine.

## Reading it

Each service shows one of **Operational**, **Needs attention**, **Partial outage**, **Major outage**, **Maintenance** or **Unknown**, always as a word. Under it, 90 bars show the last 90 days, one bar per day in the worst status seen that day; a single failed check among many shows as Needs attention. Hover a bar, or move through the bars with the arrow keys, to read that day.

Incidents list what is open now and in the last seven days, each marked **Provider status page** or **Seen by this Mac**, with what it affects.

## How fresh it is

The app checks shortly after it starts and then every five minutes. **Check status now** runs a check at once. History is kept on the Mac for 90 days and never leaves it.

Usage limits for each account are on a separate page: **Usage > Limits**. See [Memory and usage](/docs/studio/memory-and-usage).
