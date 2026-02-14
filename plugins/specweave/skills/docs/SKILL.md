---
description: Documentation hub - browse, search, serve living docs. Use for "show docs", "browse docs", "find docs", "load docs", "read ADR", "serve docs", "preview docs", "docs status".
argument-hint: "[topic] [--serve] [--status] [--public] [--internal] [--adr] [--list]"
---

# Documentation Hub

## Project Overrides

!`s="docs"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

Browse, search, load, and serve SpecWeave living documentation.

## Documentation Structure

```
.specweave/docs/
  public/          # User-facing docs (guides, workflows, troubleshooting, API)
  internal/        # Developer docs (specs, architecture, ADRs, operations)
```

## Behavior

### 1. No arguments: Show documentation dashboard

Run these diagnostic commands:

```bash
# Count documents
DOC_COUNT=$(find .specweave/docs -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
echo "DOC_COUNT:$DOC_COUNT"

# Check Docusaurus install status
[ -d ".specweave/docs-site-internal/node_modules" ] && echo "DOCUSAURUS:installed" || echo "DOCUSAURUS:not_installed"

# Check if docs server is running
SERVER_INFO=$(lsof -i :3000-3010 -sTCP:LISTEN 2>/dev/null | grep -i node | head -1 | awk '{print $9}' | cut -d: -f2)
[ -n "$SERVER_INFO" ] && echo "SERVER:running:$SERVER_INFO" || echo "SERVER:stopped"

# List topics
echo "=== Public ==="
ls .specweave/docs/public/ 2>/dev/null || echo "(none)"
echo "=== Internal ==="
ls .specweave/docs/internal/ 2>/dev/null || echo "(none)"
echo "=== ADRs ==="
ls .specweave/docs/internal/architecture/adr/ 2>/dev/null || echo "(none)"
```

Present as a clean dashboard:

```
Documentation Hub

  Documents: <count> markdown files
  Server:    Running at http://localhost:<port> | Not running
  Docusaurus: Installed | Will auto-install on first serve

  Public:
    <folder>/  - <brief description>
    ...

  Internal:
    <folder>/  - <brief description>
    ...

  Actions:
    /sw:docs <topic>              Load docs into conversation
    /sw:docs --serve              Check server status & serve guide
    specweave docs preview        Launch browser preview (hot reload)
    specweave docs build          Build static site for deployment
    specweave docs validate       Check for markdown errors
    specweave docs kill           Stop running servers
```

### 2. `--list`: List topics only

Same as dashboard but skip server/Docusaurus diagnostics. Just list folder names with descriptions.

### 3. Topic argument: Search and load docs

When user provides a topic (e.g., `/sw:docs sync`, `/sw:docs troubleshooting`):

1. **Search** for matching docs:
   ```bash
   find .specweave/docs -type d -iname "*<topic>*" -maxdepth 4
   find .specweave/docs -type f -iname "*<topic>*.md" -maxdepth 5
   ```

2. **If found**: Read the most relevant files (up to 3-5) and present a summary
3. **If not found**: Search file contents with Grep for the topic keyword, then present matches

### 4. `--serve` or serve intent: Browser preview guide

Detect serve intent from: `--serve`, `--preview`, or phrases like "serve", "preview", "browser", "open docs", "start server".

1. Check if server is already running:
   ```bash
   lsof -i :3000-3010 -sTCP:LISTEN 2>/dev/null | grep -i node
   ```

2. **If running**: "Docs server already running at http://localhost:<port>"
3. **If not running**: Display:
   ```
   To view docs in browser with hot reload, run in your terminal:

     specweave docs preview

   First run auto-installs Docusaurus (~30-60 seconds).
   Subsequent runs start instantly.

   Options:
     specweave docs preview --port 3005   Use specific port
     specweave docs preview --no-browser  Don't auto-open browser

   To stop: Ctrl+C in terminal, or: specweave docs kill
   ```

### 5. `--status`: Full status report

Run and display output of:
```bash
specweave docs status
```

### 6. Flags

| Flag | Behavior |
|------|----------|
| `--public` | Only search public docs |
| `--internal` | Only search internal docs |
| `--adr` | List and load ADRs specifically |
| `--list` | List topics without diagnostics |
| `--serve` | Browser preview guide |
| `--status` | Run `specweave docs status` |

### 7. ADR Mode (`--adr` or "ADR" in topic)

List all ADRs with their titles:
```bash
for f in .specweave/docs/internal/architecture/adr/*.md; do
  [ -f "$f" ] && echo "$(basename "$f"): $(head -1 "$f" | sed 's/^# //')"
done
```

If a specific ADR number is given, read and present it.

## Output Footer

Always append to any output:

```
Tip: Run `specweave docs preview` in your terminal to view all docs in browser with hot reload.
```
