# Product Roadmap

## Current Status: Beta (v0.1.0-beta.1)

### Completed (Q4 2024 - Q1 2025)

**✅ Increment 0001: Core Framework**
- Skills system (detector, router, loader, planner)
- Agents (PM, Architect, DevOps, Security, QA, SRE, Tech Lead)
- Context manifests (70%+ token reduction)
- Increment lifecycle with WIP limits
- 4-level testing strategy
- C4 diagram conventions
- Factory pattern (selective installation)
- Brownfield support (analyzer, onboarder)

### In Progress (Q1 2025)

**🚧 Increment 0002: Multi-Tool Support**
- Completion: 85%
- Enhanced CLI commands
- Documentation improvements
- Testing enhancements

### Planned (Q1-Q2 2025)

**📋 Q1 2025**
- Increment 0003: JIRA Integration
- Increment 0004: GitHub Sync (bidirectional)
- Increment 0005: Azure DevOps Integration

**📋 Q2 2025**
- Increment 0006: Figma-to-Code Pipeline
- Increment 0007: Performance Optimization
- Increment 0008: Enterprise Features (SSO, RBAC)

### Long-term Vision (2025+)

**🔮 Q3 2025**
- Multi-language support (framework detects ANY tech stack)
- Visual Studio Code extension
- IntelliJ IDEA plugin

**🔮 Q4 2025**
- SpecWeave Cloud (hosted specs, collaboration)
- Team features (shared context, approval workflows)
- Compliance packs (SOC 2, HIPAA, GDPR templates)

### Backlog & Research Items

**🔬 Community Integration Research**
- **Subagents Library**: Evaluate [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) for extending existing agents
  - Goal: Identify high-value subagents that complement current agent roster
  - Consider: Database specialists, API integrators, documentation generators
  - Effort: 2-3 weeks research + integration

- **Official Skills Repository**: Review [anthropics/skills](https://github.com/anthropics/skills) for reusable components
  - Goal: Adopt official patterns and best practices
  - Priority: Official Anthropic skills may have better maintenance/compatibility
  - Effort: 1-2 weeks evaluation

- **Community Skills Catalog**: Explore [awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) for domain-specific expertise
  - Goal: Identify specialized skills (e.g., blockchain, ML, mobile dev)
  - Strategy: Create adapter layer for non-SpecWeave skills
  - Effort: 2-4 weeks (depends on skill complexity)

**🚀 /do Command Enhancement**
- **Parallel Task Execution**: Implement wave-based parallel execution for large increments (40+ tasks)
  - Expected speedup: 40-60% for multi-file, independent tasks
  - Dependencies: Smart dependency graph analysis, consolidated hooks
  - Risk: Medium (file conflicts, race conditions)
  - Effort: 3-4 weeks

## Release Cadence

- **Major** (X.0.0): Quarterly (new features, breaking changes)
- **Minor** (0.X.0): Monthly (new features, non-breaking)
- **Patch** (0.0.X): As needed (bug fixes)

## Related

- [Release Process](release-process.md)
- [CLAUDE.md](../../../CLAUDE.md)
