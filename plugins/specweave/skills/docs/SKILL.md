---
description: Browse and load SpecWeave living docs (public, internal, architecture, ADRs). Use when saying "show docs", "browse docs", "find docs about", "what docs exist", "load docs", "read ADR", "architecture docs", "troubleshooting docs". Args: [topic] [--public] [--internal] [--adr] [--list].
---

# Living Docs Browser

Browse, search, and load SpecWeave living documentation into the conversation.

## Project-Specific Learnings

Before starting work, check for project-specific learnings:

```bash
cat .specweave/skill-memories/docs.md 2>/dev/null || echo "No project learnings yet"
```

## Documentation Structure

```
.specweave/docs/
  public/          # User-facing docs (guides, workflows, troubleshooting, API)
  internal/        # Developer docs (specs, architecture, ADRs, operations)
```

## Behavior

### 1. No arguments or `--list`: Show available topics

```bash
echo "=== Public Docs ==="
ls .specweave/docs/public/ 2>/dev/null || echo "(none)"

echo ""
echo "=== Internal Docs ==="
ls .specweave/docs/internal/ 2>/dev/null || echo "(none)"

echo ""
echo "=== Architecture ==="
ls .specweave/docs/internal/architecture/ 2>/dev/null || echo "(none)"

echo ""
echo "=== ADRs ==="
ls .specweave/docs/internal/architecture/adr/ 2>/dev/null || echo "(none)"
```

Present as a clean table with folder names and brief descriptions.

### 2. Topic argument: Load relevant docs

When user provides a topic (e.g., `/sw:docs sync`, `/sw:docs troubleshooting`):

1. **Search** for matching docs:
   ```bash
   # Find matching directories
   find .specweave/docs -type d -iname "*<topic>*" -maxdepth 4

   # Find matching files
   find .specweave/docs -type f -iname "*<topic>*.md" -maxdepth 5
   ```

2. **If found**: Read the most relevant files (up to 3-5) and present a summary
3. **If not found**: Search file contents with Grep for the topic keyword, then present matches

### 3. Flags

| Flag | Behavior |
|------|----------|
| `--public` | Only search public docs |
| `--internal` | Only search internal docs |
| `--adr` | List and load ADRs specifically |
| `--list` | Just list available topics, don't load content |

### 4. ADR Mode (`--adr` or "ADR" in topic)

List all ADRs with their titles:
```bash
for f in .specweave/docs/internal/architecture/adr/*.md; do
  echo "$(basename "$f"): $(head -1 "$f" | sed 's/^# //')"
done
```

If a specific ADR number is given, read and present it.

## Output Format

When listing topics:
```
Living Docs

  Public:
    guides/          - Getting started, core concepts, mobile
    workflows/       - Development workflows
    troubleshooting/ - Common issues and fixes
    api/             - API documentation
    integrations/    - External tool integration guides

  Internal:
    specs/           - Feature specifications
    architecture/    - ADRs, HLD, diagrams, concepts
    operations/      - Operational runbooks
    repos/           - Repository module documentation

  Use: /sw:docs <topic> to load specific docs
```

When loading docs, present content with clear headers and file paths for reference.
