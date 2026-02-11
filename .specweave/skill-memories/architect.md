# Architect Memory

<!-- Project-specific learnings for this skill -->

## Learnings

- **2026-02-11**: When designing new adapter systems, first audit existing adapter patterns in codebase - reuse existing ProviderAdapter interfaces and infrastructure rather than creating parallel systems
- **2026-02-11**: Multi-repo increment placement must be explicit in agent prompts and templates - agents default to umbrella root for .specweave/increments/ without clear directory structure guidance. Add "Multi-Repo Increment Placement" section to team-orchestrate and team-build skills with step-by-step cd commands and rule that each agent creates increments in their assigned repo, not the umbrella root.
