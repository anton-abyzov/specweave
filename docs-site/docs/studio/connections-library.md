---
title: "Connections library: compare MCP servers across Codex and Claude Code"
sidebar_label: Connections library
description: "Settings > Connections in SpecWithCode shows which MCP servers Codex and Claude Code have declared on each machine and in each project, what each state means, and what the library never reads or changes."
---

# Connections library

Each coding agent keeps its own list of MCP servers in its own file. The Connections library in SpecWithCode reads those files on a machine and lays them side by side, so you can see what Codex has that Claude Code does not, and what a project adds on top.

## Open it

Open **Settings > Connections** and select the machine you want to look at. A matrix compares the MCP declarations in Codex's and Claude Code's configuration on that machine. Select a cell to see its source file, its scope, the other declarations with the same name, and who owns access to it. **Refresh configurations** reads the machine again.

Open a project's **Environment** to include that project's own configuration from its registered checkout. User declarations are shared across projects; project and private-project declarations can override them. Connections that SpecWithCode itself manages keep their own per-project tool grants.

## What each state means

| State | Meaning |
|---|---|
| Configured | A supported command or URL is declared. This does not prove sign-in, project trust or that a session can use it. |
| Disabled | An explicit disable was found in the files read. |
| Invalid declaration | The entry has no supported transport or a broken structure. |
| Not found | No matching declaration in the files read. |
| Unknown | A source could not be read or the list was cut short, so "not found" cannot be claimed. |

Offline, denied, loading and failed scans show separately from an empty list. Matching names across the two agents are a comparison aid; they do not prove the servers or accounts are the same.

## What it reads

On the selected machine:

- Codex: `$CODEX_HOME/config.toml` (default `~/.codex/config.toml`), and in a project its `.codex/config.toml`.
- Claude Code: the user `.claude.json` (respecting `CLAUDE_CONFIG_DIR`), and in a project its `.mcp.json`, its private project entry in the user file, and the user, project and local settings for explicit disables.

Codex project tables inherit fields they leave out from the user entry with the same name. In Claude Code, private-project declarations override shared project declarations, which override user declarations.

## What it never does

- It launches no server, makes no network request and changes no configuration.
- It never returns command text, arguments, URLs, headers, environment values or credentials to the browser; only names, scopes and states.
- It accepts a registered project, never a file path typed in a browser, and needs filesystem read permission on the machine.
- Each file is read up to 2 MiB and 200 declarations.

Grants in SpecWithCode control the calls SpecWithCode itself manages. The library does not import the agents' own connections into those grants, and it does not enforce what a native agent may call.

Reference: [Connections library](https://github.com/anton-abyzov/specwithcode/blob/main/docs/connections-library.md) in the SpecWithCode repository, which also describes plugin servers and other tools' columns added after 1.0.43.
