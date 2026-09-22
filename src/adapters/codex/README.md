# OpenAI Codex adapter

SpecWeave uses `AGENTS.md` for project instructions and `.agents/skills` for Codex native skills. Initialize with `specweave init --adapter codex`, or use `specweave project init --name "Research" --goal "Produce a sourced report"` in an ordinary folder. Run `specweave refresh-plugins` to refresh core skills for the configured adapter.

The portable project hub holds shared goals, context, artifact references and reusable routines. `specweave project brief --harness codex` generates a fresh coordinator brief; add `--intent ID` for a worker assignment. Native task creation, subagents, connector authorization and scheduling remain with Codex and the user's permissions. CLI, desktop and cloud surfaces can differ.

Existing `.codex/skills` files are retained to avoid deleting user modifications. Review legacy duplicates when migrating. Hooks require supported events and explicit host trust review; this adapter does not install or approve hooks. No model or subscription tier is hardcoded.

Official references: [Skills](https://learn.chatgpt.com/docs/build-skills), [Projects](https://learn.chatgpt.com/docs/projects), [Hooks](https://learn.chatgpt.com/docs/hooks).
