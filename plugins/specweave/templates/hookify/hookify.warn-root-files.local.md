---
name: warn-root-files
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: ^[^/]+\.md$
  - field: file_path
    operator: not_contains
    pattern: README|CLAUDE|AGENTS|CHANGELOG|LICENSE|CODE_OF_CONDUCT|SECURITY
---

**Root-level markdown file detected!**

SpecWeave files should go in:
- `.specweave/increments/<id>/` for increment docs
- `.specweave/docs/internal/` for living docs

Only README.md, CLAUDE.md, AGENTS.md, CHANGELOG.md allowed at root.
