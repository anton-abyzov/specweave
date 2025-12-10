# Organization Overview

*Generated 2025-12-10 | Confidence: medium*

## Summary

- **Teams**: 4
- **Microservices**: 4
- **Domains**: 4
- **Repositories**: 20
- **Structure Level**: 1-level (multiProject configuration)

## Uncertainties

- Team boundaries are hypothetical - this appears to be a single-team monorepo project. The team structure represents logical ownership domains rather than actual separate teams.
- The 'microservices' classification is architectural potential rather than actual deployment - currently all modules are part of a monolithic CLI application.
- The external project info (Jira/ADO specs for FS-136, FS-137) suggests active development on process lifecycle testing and per-project enforcement, but team ownership of these features is unclear.
- The adapters module suggests multi-tool support is a strategic direction, but current implementation may primarily target Claude Code with other adapters in various stages of completion.
- The hooks module's cross-platform focus suggests Windows support is important, but the primary development appears macOS-focused based on notification patterns in CLAUDE.md.
- The templates module's extensive IaC templates (Terraform, Kubernetes, serverless) may indicate planned infrastructure-as-code generation features not fully integrated with the core workflow.
- The separation between 'integrations' (API clients) and 'sync' (coordination) vs 'importers' (ETL) suggests a deliberate architectural boundary, but actual coupling may be tighter in practice.
