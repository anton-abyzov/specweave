# General Rules
> Project-specific patterns learned from corrections.
> Max 30 rules, auto-deduplicated.

- ✗→✓ always use environment variables for configuration
- ✗→✓ NEVER suggest scripts/refresh-marketplace.sh to end users - ALWAYS use `specweave refresh-marketplace` CLI command (end users don't have scripts folder)
- ✗→✓ NEVER create files in project root (README.md, FIXES.md, etc) - ALWAYS use appropriate increment folders: reports/ for analysis, logs/ for execution logs, scripts/ for helpers
- ✗→✓ When working on SpecWeave repo itself, update .specweave/memory/*.md (project learnings), NOT ~/.specweave/memory/*.md (global user learnings)
