# General Rules
> Project-specific patterns learned from corrections.
> Max 30 rules, auto-deduplicated.

- ✗→✓ always use environment variables for configuration
- ✗→✓ NEVER suggest scripts/refresh-marketplace.sh to end users - ALWAYS use `specweave refresh-marketplace` CLI command (end users don't have scripts folder)
- ✗→✓ NEVER create files in project root (README.md, FIXES.md, etc) - ALWAYS use appropriate increment folders: reports/ for analysis, logs/ for execution logs, scripts/ for helpers
- ✗→✓ When working on SpecWeave repo itself, update .specweave/memory/*.md (project learnings), NOT ~/.specweave/memory/*.md (global user learnings)
- ✗→✓ Session watchdog is DISABLED BY DEFAULT (opt-in via SPECWEAVE_ENABLE_WATCHDOG=1) - VSCode extension manages session lifecycle, making background daemons unnecessary and preventing .specweave folder pollution
- ✗→✓ NEVER use background processes (`&`) in Claude Code hooks - use Ralph plugin pattern: queue to JSONL file, fire-and-forget detached processor with double-fork, lock-based concurrency
- → Never truncate, never hide options │
- → MUST complete or pause existing work first:
