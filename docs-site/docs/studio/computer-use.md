---
title: "Computer use in SpecWithCode: let agents see and control your Mac"
sidebar_label: Computer use
description: "From SpecWithCode 1.0.43, agents on every provider can take screenshots, click, type and scroll on the Mac the app runs on. It is a per-machine setting and needs the macOS Screen Recording and Accessibility permissions."
---

# Computer use

Agents in SpecWithCode can see and control the desktop of the Mac the app runs on. Ask in any thread for something like "make my mouse a little faster" or "turn on Night Shift": the agent opens System Settings, looks at the screen and clicks through it the way you would. It works in any native app. For websites, agents use the [browser](/docs/studio/browser) instead.

Computer use arrived in SpecWithCode 1.0.43 (18 October 2026, [release notes](https://github.com/anton-abyzov/specwithcode/releases/tag/v1.0.43)). Only macOS is supported.

## Every provider gets it

Agents reach the desktop through the `computer_*` tools on SpecWithCode's own MCP server: `computer_screenshot` to see the screen, then `computer_open`, `computer_click`, `computer_type`, `computer_key`, `computer_scroll`, `computer_drag` and `computer_move`. Claude, Codex, GitHub Copilot and the other ACP agents, Cursor, OpenCode and Pi all get the same tools, so a thread does not need a particular provider to use the desktop.

## Turn it on

Computer use belongs to the machine. It is on by default, and every project, thread and worker on that machine gets it; no project can override it. To turn it off for a machine, select the machine and open **Settings > Integrations > Agent computer access**. A change applies when an agent session next starts. A thread acts on the desktop of the machine it runs on.

macOS must allow two permissions for the SpecWithCode app:

| Permission | Why |
|---|---|
| Screen Recording | So agents can see the screen |
| Accessibility | So agents can click and type |

The grant belongs to the desktop app, which takes the screenshots and posts the clicks, so the app must be open on that Mac. The first time an agent takes a screenshot or clicks, macOS asks for both permissions and System Settings opens at the right page. Click **Allow** or turn on SpecWithCode in the list. The agent's action waits up to two minutes and then carries on by itself, so you do not need to ask again. If macOS asks you to quit and reopen the app, do that, then ask the agent to try again. Only you can grant these permissions; no app can grant them to itself.

## What agents do and do not do

- One action runs at a time, so two threads cannot fight over the pointer.
- Agents type text by pasting it, then put back what you had copied.
- Agents ask before deleting data, sending messages, buying anything or changing security settings.
