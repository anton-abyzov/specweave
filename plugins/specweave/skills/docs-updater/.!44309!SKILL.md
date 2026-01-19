---
name: docs-updater
description: Updates living documentation during implementation. Syncs task completion to docs, changes [DRAFT] to [COMPLETE], maintains bidirectional links. Activates for update docs, sync documentation, mark complete, documentation updates, living docs sync.
---

# Documentation Updater

Updates product documentation (.specweave/docs/) based on implementation progress.

## When to Use

- Task specifies documentation updates in tasks.md
- Feature implementation is complete
- User says "update documentation" or "sync docs"
- After closing increment to ensure docs reflect reality

## What It Does

1. **Reads task requirements** - Understands what was implemented from tasks.md
2. **Updates living docs** - Modifies `.specweave/docs/` files with actual implementation
