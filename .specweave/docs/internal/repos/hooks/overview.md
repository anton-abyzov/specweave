# hooks

*Analyzed: 2025-12-10 | Confidence: low**

## Purpose

Cross-platform hooks module for SpecWeave that provides platform-independent hook implementations for Windows, macOS, and Linux. It handles session lifecycle management, background event processing, scheduled job checking, and process orchestration without requiring WSL on Windows.

## Key Concepts

- Cross-platform compatibility (Windows/macOS/Linux)
- Hook protocol for Claude Code integration
- Event-driven architecture with pending.jsonl queue (v1.0.148)
- Batched sync at session end via stop-sync.sh (v1.0.148)
- File-based locking mechanism
- Scheduled job orchestration
- Git Bash fallback on Windows

## Patterns

- **Event-Driven Architecture with pending.jsonl** (architecture) (v1.0.148)
- **Stop Hook Batched Sync Pattern** (architecture) (v1.0.148)
- **Idempotent Event Processing** (data) (v1.0.148)
- **Hook Protocol for Claude Code** (integration)
- **Cross-Platform Process Spawning** (deployment)
- **Handler Routing with Timeout** (architecture)
- **Scheduled Job Orchestration** (architecture)
- **Atomic File Operations** (data)
- **Platform Detection Caching** (structure)

## External Dependencies

- Node.js runtime (process.execPath)
- Git Bash on Windows (optional)
- WSL on Windows (fallback)
- Bash shell on POSIX systems

## Observations

- Windows support uses Git Bash as PRIMARY strategy, WSL as FALLBACK only
- Graceful degradation when neither Git Bash nor WSL available on Windows
- Self-terminating daemon pattern prevents orphaned background processes
- Event queue uses timestamp-based file naming for FIFO ordering
- Handler timeout prevents hung handlers from blocking processor
- Lock staleness detection uses both PID checking and file age
- Development vs production mode detected by checking node_modules vs local dist paths
- All hooks return JSON to stdout following Claude Code hook protocol
- Environment variable SPECWEAVE_BACKGROUND_PROCESS marks spawned background processes
- **VSCode Detection Pattern** (v1.0.91+): Hooks detect VSCode via `CLAUDE_CODE_ENTRYPOINT=claude-vscode` and return `{"decision":"approve"}` instead of `{"decision":"block"}` to allow fallback command execution
- Instant commands (jobs, status, progress, workflow, costs, analytics) use hook-based execution in CLI (<100ms) and fallback to CLI commands in VSCode