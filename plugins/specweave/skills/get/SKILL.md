---
version: 1.1.0
description: >
  Clone and register an existing repository (or bulk-clone an entire org) into the SpecWeave workspace.
  Activate when the user wants to: add a repo, get a repo, clone a repo,
  register a repo, bring in a repo, pull in a repo, add a github repo to umbrella,
  clone and register, "get owner/repo", "add this github repo", "clone this repo
  into my workspace", "register this local repo". Also activate for "restore repos",
  "clone all child repos" on a new machine, "clone all service-* repos", "bulk clone",
  "clone entire org", "clone all repos matching pattern", "get all repos from org".
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
  - "bulk clone"
  - "clone entire org"
  - "clone all repos"
  - "clone all matching"
negative_triggers:
  - "add a feature"
  - "add a task"
  - "add a story"
  - "add an increment"
  - "create increment"
---

# sw:get — Clone & Register Repository

Use this skill when the user wants to add an existing repository (or many repositories) to their SpecWeave workspace.

## What it does

Runs `specweave get <source>` which:
1. Parses the source (GitHub shorthand, full URL, SSH URL, local path, or org glob pattern)
2. Clones the repo into `repositories/{org}/{repo}/` (in umbrella context)
3. Registers it in `.specweave/config.json` under `umbrella.childRepos`
4. Runs `specweave init` inside the cloned repo

For **bulk mode** (glob pattern or `--all`):
- Fetches matching repos from the GitHub org via API
- Launches a background clone job (survives terminal close)
- Reports job ID; user monitors with `specweave jobs`

## Instructions

1. Extract the repository source from the user's message:
   - GitHub shorthand: `owner/repo`
   - Full URL: `https://github.com/org/repo`
   - SSH: `git@github.com:org/repo`
   - Local path: `./path/to/repo`
   - Glob pattern: `org/service-*` or `org/*`
   - All repos in org: `--all org`

2. Check if the user mentioned optional flags:
   - `--prefix` — US prefix (e.g., "use prefix FE")
   - `--role` — repo role (e.g., "it's a backend service")
   - `--branch` — specific branch (e.g., "clone the develop branch")
   - `--no-init` — skip specweave init
   - `--all` — clone all repos in org
   - `--pattern` — glob filter when used with `--all`
   - `--no-archived` — skip archived repos
   - `--no-forks` — skip forks
   - `--limit` — max repos to fetch (default 1000)

3. Run the command:
   ```bash
   specweave get <source> [--prefix X] [--role Y] [--branch Z] [--no-init]
   # or bulk:
   specweave get "org/service-*"
   specweave get --all org [--pattern "svc-*"] [--no-archived] [--no-forks]
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
| "clone all service-* repos from acme-corp" | `specweave get "acme-corp/service-*"` |
| "clone all repos in acme-corp org" | `specweave get --all acme-corp` |
| "clone all acme-corp repos, skip archived and forks" | `specweave get --all acme-corp --no-archived --no-forks` |
| "clone all api-* repos from myorg, max 200" | `specweave get "myorg/api-*" --limit 200` |
| "restore all repos on this machine" | See note below |

## Bulk Clone Notes

- Requires GitHub auth: `GH_TOKEN` env var or `gh auth login`
- Cloning runs in the **background** — terminal can be closed safely
- Monitor progress: `specweave jobs`
- Already-cloned repos are skipped automatically (idempotent)
- Failed repos are tracked and can be resumed by re-running the same command

## New Machine Restore

If the user says "restore repos", "clone all child repos", or "set up on new machine":
1. Read `.specweave/config.json` → `umbrella.childRepos`
2. For each child repo that has a `githubUrl` or derivable URL and whose directory is missing, run `specweave get <owner/repo> --no-init`
3. Report which repos were cloned and which were already present

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#get)
