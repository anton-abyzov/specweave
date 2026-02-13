# Living Documentation

Living documentation in SpecWeave automatically stays synchronized with your code through continuous updates and AI-powered content generation.

## What Makes Docs "Living"?

Traditional documentation becomes outdated quickly. Living docs solve this by:

- **Auto-sync**: Implementation updates flow back to specs
- **Bidirectional**: Changes propagate between code and docs
- **Always current**: Docs reflect actual system state
- **AI-generated**: Content created from code analysis

## Structure

```
.specweave/docs/internal/
├── specs/           # Feature specifications
├── architecture/    # System design docs
│   └── adr/         # Architecture Decision Records
├── modules/         # Component documentation
└── guides/          # How-to guides
```

## Benefits

- **Reduced maintenance**: Docs update automatically
- **Single source of truth**: Code and docs stay aligned
- **Better onboarding**: New team members get accurate docs
- **Brownfield support**: Generate docs from existing code

## Commands

- `/sw:living-docs` - Generate comprehensive docs from codebase
- `/sw:sync-docs update` - Sync implementation learnings to living docs
- `/sw:docs <topic>` - Load relevant docs into conversation
