# Plan: 0200 — Redesign Init Flow

## Architecture

### New Init Flow

```
initCommand()
  ├── Phase 1: projectIdentity()
  │   ├── promptLanguageSelection()     (existing)
  │   ├── promptProjectTopology()       (NEW: greenfield/brownfield + mono/multi)
  │   └── return { language, topology }
  │
  ├── Phase 2: platformSetup(topology)
  │   ├── if topology.multiRepo → promptProviderWithRepos()
  │   │   └── unified: provider + creds + repo selection
  │   ├── else → promptProvider()
  │   │   └── just: provider + optional creds
  │   ├── issueTracker (default from provider, or ask)
  │   └── if topology.brownfield → promptLivingDocs()
  │
  ├── applySmartDefaults()
  │   ├── testing: TDD
  │   ├── qualityGates: standard
  │   ├── deepInterview: false
  │   ├── lsp: true (Claude)
  │   └── gitHooks: auto-install
  │
  └── finalize()
      ├── createDirectoryStructure()
      ├── copyTemplates()
      ├── createConfigFile()
      ├── installPlugins()
      └── showNextSteps()
```

### Key Files to Change

1. `src/cli/commands/init.ts` — break into phases
2. `src/cli/helpers/init/project-topology.ts` — NEW: Phase 1 prompts
3. `src/cli/helpers/init/platform-setup.ts` — NEW: Phase 2 orchestrator
4. `src/cli/helpers/init/smart-defaults.ts` — NEW: default applier
5. `src/cli/helpers/init/types.ts` — add topology types

### Risks

- Breaking existing `--quick` / CI mode flows
- Existing tests depend on current question order
- Repository setup + issue tracker unification is a large refactor
- Need backward compatibility for existing `.specweave/config.json` files
