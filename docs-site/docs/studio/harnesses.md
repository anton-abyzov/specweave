---
title: "Harnesses, models and the interface: where SpecWithCode sits"
sidebar_label: Harnesses and models
description: "A coding agent has three layers: the model writes responses, the harness runs the agent loop and tools, the interface is what you touch. SpecWithCode is the interface over native harnesses such as Claude Code, Codex, GitHub Copilot and Gemini CLI."
---

# Harnesses, models and the interface

SpecWithCode is an interface. It runs no agent loop of its own. It drives the coding agents already installed on your machines, with their own sign-ins, and coordinates them as one project.

## Three layers

| Layer | What it does | Examples |
| --- | --- | --- |
| **Interface** | What you touch: send the goal, watch the work, approve, review. | SpecWithCode, a terminal, an IDE panel |
| **Harness** | Runs the agent loop, calls tools, keeps the native session, skills and plugins. | Claude Code, Codex, GitHub Copilot, Gemini CLI, Cursor, OpenCode |
| **Model** | Writes the responses. | Claude, GPT, Gemini, Grok, open-weight models |

The account or API key behind the harness decides which models you get and who bills you. The model name alone does not: Claude through Copilot uses your Copilot plan, not a Claude subscription.

## What stays with the harness

Each harness keeps what it owns: its sign-in, its tools, its skills and plugins, and its session history. A skill you add to Claude Code is a Claude Code skill. Switching a thread to Codex does not carry it over; add it to Codex too, or install it once for every agent with `vskill install`.

## What SpecWithCode adds

- **A coordinator** that keeps the brief and splits the work.
- **Worker threads** on any harness, side by side, each on the machine you choose.
- **Handoffs** across machines and harnesses, so a thread can continue when one agent runs out.
- **Shared tools** through the SpecWithCode MCP server: a thread can start another thread on a different harness, read history from other threads and send them messages. SpecWithCode passes the messages; no harness controls another directly.

## Supported harnesses

| Harness | How SpecWithCode connects |
| --- | --- |
| Claude Code | Agent SDK |
| Codex | Codex app-server |
| GitHub Copilot | ACP Registry |
| Gemini CLI | ACP Registry |
| Grok Build | ACP |
| Cursor | Cursor SDK |
| OpenCode | OpenCode HTTP API |
| Pi | Pi RPC |
| Antigravity | Its own integration |
| Other ACP agents | ACP Registry |

Install and sign in to each harness on the machine where it runs. An ACP Registry entry is a candidate, not proof: Providers settings shows whether the agent is installed, signed in and ready on that machine.

## What SpecWithCode does not do

It does not debug code: there are no breakpoints or debug adapter. Agents can run your tests, read logs and use a browser or, on macOS, the desktop. It does not make model inference local: cloud models still receive prompts and relevant context through the harness you chose.
