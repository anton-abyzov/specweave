---
version: 1.0.0
description: >
  Clone and register an existing repository into the SpecWeave workspace.
  Activate when the user wants to: add a repo, get a repo, clone a repo,
  register a repo, bring in a repo, pull in a repo, add a github repo to umbrella,
  clone and register, "get owner/repo", "add this github repo", "clone this repo
  into my workspace", "register this local repo". Also activate for "restore repos"
  or "clone all child repos" on a new machine.
  Do NOT activate for: add a feature, add a task, add a story, add an increment,
  add a user story (those route to sw:increment).
triggers:
  - "get repo"
  - "add repo"
  - "clone repo"
  - "register repo"
  - "add github repo"
  - "clone and register"
  - "bring in repo"
  - "pull in repo"
  - "restore repos"
  - "clone all child repos"
negative_triggers:
  - "add a feature"
  - "add a task"
  - "add a story"
  - "add an increment"
  - "create increment"
---

# sw:get — Clone & Register Repository

Use this skill when the user wants to add an existing repository to their SpecWeave workspace.

## What it does

Runs `specweave get <source>` which:
1. Parses the source (GitHub shorthand, full URL, SSH URL, or local path)
2. Clones the repo into `repositories/{org}/{repo}/` (in umbrella context)
3. Registers it in `.specweave/config.json` under `umbrella.childRepos`
4. Runs `specweave init` inside the cloned repo

## Instructions

1. Extract the repository source from the user's message:
   - GitHub shorthand: `owner/repo`
   - Full URL: `https://github.com/org/repo`
   - SSH: `git@github.com:org/repo`
   - Local path: `./path/to/repo`

2. Check if the user mentioned optional flags:
   - `--prefix` — US prefix (e.g., "use prefix FE")
   - `--role` — repo role (e.g., "it's a backend service")
   - `--branch` — specific branch (e.g., "clone the develop branch")
   - `--no-init` — skip specweave init

3. Run the command:
   ```bash
   specweave get <source> [--prefix X] [--role Y] [--branch Z] [--no-init]
   ```

4. Report the result to the user.

## Examples

| User says | Command |
|-----------|---------|
| "add anton-abyzov/my-service" | `specweave get anton-abyzov/my-service` |
| "clone https://github.com/org/repo" | `specweave get https://github.com/org/repo` |
| "get this repo: git@github.com:org/repo" | `specweave get git@github.com:org/repo` |
| "add ./my-local-service to the umbrella" | `specweave get ./my-local-service` |
| "clone my-service with prefix MSV" | `specweave get owner/my-service --prefix MSV` |
| "restore all repos on this machine" | See note below |

## New Machine Restore

If the user says "restore repos", "clone all child repos", or "set up on new machine":
1. Read `.specweave/config.json` → `umbrella.childRepos`
2. For each child repo that has a `githubUrl` or derivable URL and whose directory is missing, run `specweave get <owner/repo> --no-init`
3. Report which repos were cloned and which were already present
