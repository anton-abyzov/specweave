---
name: sw/team-build
description: "[DEPRECATED] Use sw:team-lead --preset <name> instead."
allowed-tools: Read
---

> Deprecated: `sw:team-build` is deprecated. Use `sw:team-lead --preset <name>` instead.
> This skill will be removed in SpecWeave v1.3.0.

## Migration

Replace:
```
/sw:team-build <preset-name>
```
With:
```
/sw:team-lead --preset <preset-name>
```

## Supported Presets

The same preset names from team-build are available via `--preset`:

- `full-stack` — frontend + backend + database + testing agents
- `api-only` — backend + database + testing agents
- `frontend-only` — frontend + testing agents
- `microservice` — backend + testing + devops agents
