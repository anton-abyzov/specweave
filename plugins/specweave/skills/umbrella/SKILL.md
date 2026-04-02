---
version: 1.0.0
description: >
  Create and manage umbrella workspaces for multi-repo projects.
  Activate when the user wants to: create umbrella, umbrella init, wrap in umbrella,
  create workspace, setup multi-repo, migrate repos to umbrella, umbrella create,
  new workspace, restructure into umbrella, "wrap this repo", "create umbrella for these repos",
  "setup workspace with repos", "move repos into umbrella".
  Do NOT activate for: add a repo to existing umbrella (use sw:get), add a feature,
  add an increment, clone a repo (use sw:get).
triggers:
  - "create umbrella"
  - "umbrella init"
  - "wrap in umbrella"
  - "create workspace"
  - "setup multi-repo"
  - "migrate repos"
  - "new workspace"
  - "restructure into umbrella"
  - "wrap this repo"
negative_triggers:
  - "add a repo"
  - "clone a repo"
  - "add a feature"
  - "create increment"
---

# sw:umbrella — Create & Manage Umbrella Workspaces

Automates the creation of SpecWeave umbrella workspaces for multi-repo projects. Handles directory structure, repo cloning/migration, symlinks, `.env` consolidation, and SpecWeave initialization in a single flow.

## Modes

| Mode | Use Case |
|------|----------|
| **init** | Create a new umbrella from scratch with remote and/or local repos |
| **wrap** | Wrap an existing local repo (or set of repos) into a new umbrella |

Detect mode from context:
- User provides repo URLs or org/repo references → **init**
- User is in a repo and says "wrap" or "restructure" → **wrap**
- Ambiguous → ask which mode

---

## Mode: init

Create a new umbrella workspace from scratch.

### Step 1: Gather inputs

Extract from the user's message or ask:

| Input | Required | Default |
|-------|----------|---------|
| Umbrella name | Yes | — |
| Target directory | No | `~/Projects/{name}` |
| Repos to include | Yes | — |

**Repo source formats** (same as `sw:get`):
- GitHub shorthand: `owner/repo`
- Full URL: `https://github.com/org/repo`
- SSH: `git@github.com:org/repo`
- Local path: `~/Projects/my-repo` or `./my-repo`
- Mixed: any combination of the above

For local paths, also ask:
- Custom local name? (e.g., clone `owner/repo-long-name` as `repo`)

### Step 2: Create umbrella root

```bash
TARGET="${HOME}/Projects/${NAME}"
mkdir -p "${TARGET}"
cd "${TARGET}"
```

**Guard**: If directory already exists and contains `.specweave/`, warn and ask whether to add repos to existing umbrella (delegates to `sw:get`) or abort.

### Step 3: Initialize SpecWeave

```bash
specweave init "${NAME}"
```

This creates `.specweave/`, `config.json`, `CLAUDE.md`, `AGENTS.md`.

**Guard**: If `.specweave/config.json` already exists, skip this step.

### Step 4: Add repos

**For each remote repo:**

```bash
specweave get <source> [--prefix PREFIX]
```

`specweave get` handles: clone into `repositories/{org}/{repo}/`, register in config.json, run `specweave init` in the repo.

**For each local repo:**

Local repos need special handling — `specweave get` expects a URL, not a local move.

```bash
# 1. Detect org/repo from git remote
REMOTE_URL=$(git -C "${LOCAL_PATH}" remote get-url origin 2>/dev/null)
# Parse org and repo name from URL (handle HTTPS, SSH, GitHub shorthand)
# Example: git@github.com:antonoly/claude-code-anymodel.git → org=antonoly, repo=claude-code-anymodel

# 2. Allow custom local name (user may want 'claude-code' instead of 'claude-code-anymodel')
REPO_DIR="${CUSTOM_NAME:-${REPO_NAME}}"

# 3. Create target directory
mkdir -p "${TARGET}/repositories/${ORG}"

# 4. Move repo (REQUIRES USER CONFIRMATION — destructive operation)
mv "${LOCAL_PATH}" "${TARGET}/repositories/${ORG}/${REPO_DIR}"

# 5. Create symlink at original location for session compatibility
ln -s "${TARGET}/repositories/${ORG}/${REPO_DIR}" "${LOCAL_PATH}"

# 6. Register in config.json
# Read current config, add to umbrella.childRepos array
```

**Registration** — after moving a local repo, add it to `.specweave/config.json`:

```json
{
  "umbrella": {
    "childRepos": [
      {
        "id": "{repo-dir}",
        "path": "repositories/{org}/{repo-dir}",
        "name": "{repo-dir}",
        "prefix": "{FIRST_3_UPPERCASE}",
        "githubUrl": "{remote-url}"
      }
    ]
  }
}
```

Use `jq` to merge into existing config:

```bash
jq --arg id "${REPO_DIR}" \
   --arg path "repositories/${ORG}/${REPO_DIR}" \
   --arg name "${REPO_DIR}" \
   --arg prefix "${PREFIX}" \
   --arg url "${REMOTE_URL}" \
   '.umbrella.childRepos += [{"id": $id, "path": $path, "name": $name, "prefix": $prefix, "githubUrl": $url}]' \
   .specweave/config.json > .specweave/config.tmp && mv .specweave/config.tmp .specweave/config.json
```

### Step 5: Consolidate .env files

Scan all repos for `.env` files and merge unique keys into umbrella root:

```bash
# 1. Find all .env files in repos (never display values)
ENV_FILES=$(find repositories -maxdepth 3 -name ".env" -not -path "*/node_modules/*" 2>/dev/null)

if [ -n "${ENV_FILES}" ]; then
  echo "Found .env files:"
  for f in ${ENV_FILES}; do
    echo "  ${f} ($(grep -c '=' "${f}" 2>/dev/null || echo 0) variables)"
  done

  # 2. Merge unique keys (preserving first occurrence of each key)
  # NEVER display values — only key names and counts
  for f in ${ENV_FILES}; do
    while IFS= read -r line; do
      KEY=$(echo "${line}" | cut -d'=' -f1)
      if [ -n "${KEY}" ] && ! grep -q "^${KEY}=" "${TARGET}/.env" 2>/dev/null; then
        echo "${line}" >> "${TARGET}/.env"
      fi
    done < "${f}"
  done

  echo "Consolidated $(grep -c '=' "${TARGET}/.env" 2>/dev/null || echo 0) variables into umbrella .env"
fi
```

**Guard**: If umbrella `.env` already exists, only add NEW keys (don't overwrite existing).

### Step 6: Track symlinks

Write a manifest for future cleanup/reference:

```bash
# Create or update symlink manifest
cat > .specweave/state/symlinks.json << EOF
{
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "symlinks": [
    {
      "target": "${TARGET}/repositories/${ORG}/${REPO_DIR}",
      "link": "${LOCAL_PATH}",
      "repo": "${REPO_DIR}"
    }
  ]
}
EOF
```

### Step 7: Generate fresh-setup script

Create a reproducible bootstrap script for new machines:

```bash
cat > "${TARGET}/setup.sh" << 'SETUP_EOF'
#!/bin/bash
# Fresh setup script for {NAME}
# Run this on a new machine to recreate the umbrella workspace
set -euo pipefail

UMBRELLA_DIR="${HOME}/Projects/{NAME}"
mkdir -p "${UMBRELLA_DIR}"
cd "${UMBRELLA_DIR}"

# Initialize SpecWeave
specweave init "{NAME}"

# Clone repositories
{FOR_EACH_REPO}
specweave get {SOURCE} {FLAGS}
{END_FOR_EACH}

# Create .env placeholder
cat > .env << 'ENV_EOF'
# Fill in your secrets:
{FOR_EACH_KEY}
{KEY}=
{END_FOR_EACH}
ENV_EOF

echo "Umbrella workspace ready at ${UMBRELLA_DIR}"
echo "Fill in .env with your secrets, then: cd ${UMBRELLA_DIR} && claude"
SETUP_EOF
chmod +x "${TARGET}/setup.sh"
```

Replace `{PLACEHOLDERS}` with actual values from the repos that were added.

### Step 8: Verify

Run these checks and report results:

```bash
# 1. All repos accessible
for repo in repositories/*/*; do
  [ -d "${repo}/.git" ] && echo "OK: ${repo}" || echo "MISSING: ${repo}"
done

# 2. Config valid
jq '.umbrella.childRepos | length' .specweave/config.json

# 3. Symlinks valid (if any)
if [ -f .specweave/state/symlinks.json ]; then
  jq -r '.symlinks[].link' .specweave/state/symlinks.json | while read link; do
    [ -L "${link}" ] && echo "OK: ${link}" || echo "BROKEN: ${link}"
  done
fi

# 4. .env exists (if consolidated)
[ -f .env ] && echo ".env: $(grep -c '=' .env) variables" || echo ".env: not created"
```

### Step 8 output format:

```
Umbrella workspace created: {NAME}
  Location: {TARGET}
  Repos: {COUNT} registered
  Symlinks: {COUNT} created
  .env: {COUNT} variables consolidated
  Setup script: {TARGET}/setup.sh

  Next steps:
    cd {TARGET} && claude
    sw:get <more-repos>           # add more repos
    sw:sync-setup                 # configure GitHub/JIRA/ADO sync
```

---

## Mode: wrap

Wrap an existing repo (or set of repos) into a new umbrella.

### Step 1: Detect current repo

```bash
# Must be inside a git repo
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
# Parse org and repo name
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
```

If not in a git repo, abort with: "Must be inside a git repository. Use `sw:umbrella init` instead."

### Step 2: Determine umbrella name

- User-specified: use that
- Default: `{repo-name}-umb`

```bash
TARGET="${HOME}/Projects/${UMBRELLA_NAME}"
```

**Guard**: If target already exists, ask whether to add this repo to it or choose a different name.

### Step 3: Create umbrella and move repo

```bash
# 1. Create umbrella structure
mkdir -p "${TARGET}/repositories/${ORG}"

# 2. CONFIRM with user before moving (destructive)
echo "Will move: ${REPO_ROOT} → ${TARGET}/repositories/${ORG}/${REPO_NAME}"

# 3. Move repo
mv "${REPO_ROOT}" "${TARGET}/repositories/${ORG}/${REPO_NAME}"

# 4. Create symlink at old location
ln -s "${TARGET}/repositories/${ORG}/${REPO_NAME}" "${REPO_ROOT}"
```

### Step 4: Initialize SpecWeave

```bash
cd "${TARGET}"
specweave init "${UMBRELLA_NAME}"
```

### Step 5: Register repo

Same registration as init mode Step 4 (local repo section).

### Step 6: Additional repos

Ask: "Would you like to add more repos to this umbrella?"

If yes, for each additional repo use `specweave get <source>` or the local move flow from init mode.

### Step 7: Consolidate .env and verify

Same as init mode Steps 5-8.

---

## Symlink Management

Symlinks are tracked in `.specweave/state/symlinks.json` for reference and cleanup.

**To list symlinks:**
```bash
jq -r '.symlinks[] | "\(.link) → \(.target)"' .specweave/state/symlinks.json
```

**To remove symlinks** (when no longer needed):
```bash
jq -r '.symlinks[].link' .specweave/state/symlinks.json | while read link; do
  [ -L "${link}" ] && rm "${link}" && echo "Removed: ${link}"
done
```

---

## .env Safety Rules

1. **NEVER** display .env values — use `grep -c '='` for counts, `cut -d'=' -f1` for key names only
2. **NEVER** commit .env files — verify `.gitignore` includes `.env*`
3. When consolidating, preserve first occurrence of each key (don't overwrite)
4. If a key exists in multiple repos with different values, note the conflict for the user (by key name only)

---

## Examples

| User says | Mode | Action |
|-----------|------|--------|
| "Create umbrella cloud-umb with org/api and org/web" | init | Clone 2 repos into new umbrella |
| "Create umbrella for claude-code and anymodel" | init | Prompt for URLs/locations, clone/move |
| "Wrap this repo in an umbrella" | wrap | Move current repo into new umbrella |
| "Restructure these projects into an umbrella workspace" | init | Gather repo list, create umbrella |
| "Setup multi-repo workspace" | init | Prompt for name and repos |
| "I need an umbrella for my-api, my-web, and my-shared" | init | Parse 3 repos, create umbrella |

---

## Verification Checklist

After creating the umbrella, verify all of these pass:

- [ ] `ls repositories/*/*/.git` — all repos have .git directories
- [ ] `jq '.umbrella.childRepos | length' .specweave/config.json` — matches repo count
- [ ] `jq '.umbrella.enabled' .specweave/config.json` — returns `true`
- [ ] `[ -f CLAUDE.md ]` — instruction file exists
- [ ] `[ -f .env ] || echo "no .env (expected if no secrets)"` — .env handled
- [ ] Symlinks resolve: `for l in $(jq -r '.symlinks[].link' .specweave/state/symlinks.json 2>/dev/null); do test -L "$l"; done`

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#umbrella)
