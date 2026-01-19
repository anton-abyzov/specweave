# General Rules
> Project-specific patterns learned from corrections.
> Max 30 rules, auto-deduplicated.

- ✗→✓ NEVER suggest scripts/refresh-marketplace.sh to end users - ALWAYS use `specweave refresh-marketplace` CLI command (end users don't have scripts folder)
- ✗→✓ NEVER create files in project root (README.md, FIXES.md, etc) - ALWAYS use appropriate increment folders: reports/ for analysis, logs/ for execution logs, scripts/ for helpers
- ✗→✓ When working on SpecWeave repo itself, update .specweave/memory/*.md (project learnings), NOT ~/.specweave/memory/*.md (global user learnings)
- ✗→✓ Session watchdog was COMPLETELY REMOVED (ADR-0224) - not just disabled. VSCode extension manages session lifecycle. No daemons, no SPECWEAVE_ENABLE_WATCHDOG env var.
- ✗→✓ NEVER use background processes (`&`) in Claude Code hooks - use Ralph plugin pattern: queue to JSONL file, fire-and-forget detached processor with double-fork, lock-based concurrency
- ✗→✓ PASSIVE skill observation doesn't activate reliably - use ACTIVE routing that spawns specialized agents via Task tool based on detected keywords (React→sw-frontend, GitHub→sw-github, TDD→sw-testing)
