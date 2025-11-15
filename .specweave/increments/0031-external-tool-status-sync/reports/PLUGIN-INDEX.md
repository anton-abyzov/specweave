# SpecWeave Plugin Documentation Index

## Overview

This comprehensive plugin analysis covers all 21 SpecWeave plugins with complete documentation of skills, agents, commands, and special features.

**Created**: 2025-11-13
**Total Plugins**: 21
**Total Skills**: 78+
**Total Agents**: 31
**Total Commands**: 54+

---

## Documentation Files

### 1. PLUGIN-CATALOG-COMPREHENSIVE.md (522 lines)
**Complete plugin reference with full details**

Contains exhaustive analysis of all 21 plugins organized by category:
- Core Plugin (specweave): 18 skills, 10 agents, 22 commands
- External Tool Integration (3 plugins): GitHub, JIRA, Azure DevOps
- Tech Stack (3 plugins): Frontend, Backend, Mobile
- Infrastructure & Deployment (2 plugins): Kubernetes, Infrastructure
- Machine Learning (1 plugin): 13 skills, 3 agents
- Documentation (2 plugins): Docs, Docs Preview
- Design & Development (3 plugins): Figma, Diagrams, Testing
- Utility & Specialized (4 plugins): Cost Optimizer, Payments, Tooling, Alternatives

**Use Case**: Reference guide for developers needing complete plugin information
**Best For**: Architecture decisions, feature planning, integration setup

---

### 2. PLUGIN-QUICK-REFERENCE.md (426 lines)
**Fast lookup guide with commands and workflows**

Quick reference organized by use case:
- Installation & Activation (auto-activation keywords for each plugin)
- Command Reference by Plugin (organized by category)
- Agent Reference (all 31 agents with descriptions)
- Tech Stack Coverage (frontend, backend, mobile, databases, cloud)
- Typical Workflows (feature building, releases, ML, infrastructure)
- Context Loading & Token Efficiency
- Configuration Files (JSON examples)
- Environment Variables (GitHub, JIRA, ADO, Cloud)
- Performance Tips
- Troubleshooting

**Use Case**: Day-to-day development reference
**Best For**: Developers using SpecWeave features, command lookup, workflow guidance

---

### 3. PLUGIN-MATRIX-DETAILED.md (460 lines)
**Visual matrices and architecture deep dives**

Detailed analysis with tables and diagrams:
- Plugin Summary Matrix (21 plugins with stats)
- Core Plugin Deep Dive (architecture diagram)
- Integration Plugin Comparison (feature matrix)
- Tech Stack Coverage Matrix (framework support)
- ML Plugin Capabilities (end-to-end workflow)
- Skills Auto-Activation Keywords (with priority levels)
- Token Efficiency Analysis (context loading scenarios)
- Command Namespacing (prefix conventions)
- Dependency Graph (plugin relationships)
- Installation Verification (testing steps)
- Future Roadmap (potential additions)

**Use Case**: Architecture documentation, capacity planning, plugin selection
**Best For**: Architects, tech leads, infrastructure planning

---

## Quick Navigation

### Looking for...

**How to use a specific command?**
→ PLUGIN-QUICK-REFERENCE.md → "Command Reference by Plugin"

**What plugins are installed?**
→ PLUGIN-CATALOG-COMPREHENSIVE.md → "SUMMARY STATISTICS"

**How much context/tokens will this use?**
→ PLUGIN-MATRIX-DETAILED.md → "Token Efficiency Analysis"

**Which agents can help with X?**
→ PLUGIN-QUICK-REFERENCE.md → "Agent Reference"

**How do I set up GitHub/JIRA/ADO sync?**
→ PLUGIN-QUICK-REFERENCE.md → "Configuration Files"

**What tech stacks are supported?**
→ PLUGIN-MATRIX-DETAILED.md → "Tech Stack Coverage Matrix"

**How do I build an ML model with SpecWeave?**
→ PLUGIN-CATALOG-COMPREHENSIVE.md → "specweave-ml" section
→ PLUGIN-QUICK-REFERENCE.md → "Typical Workflows" → "ML Model Development"

**What's the best workflow for feature development?**
→ PLUGIN-QUICK-REFERENCE.md → "Typical Workflows" → "Building a New Feature"

**How do skills auto-activate?**
→ PLUGIN-QUICK-REFERENCE.md → "Installation & Activation"
→ PLUGIN-MATRIX-DETAILED.md → "Skills Auto-Activation Keywords"

**I'm getting an error - where do I look?**
→ PLUGIN-QUICK-REFERENCE.md → "Troubleshooting"

---

## Plugin Categories

### Core Framework
- **specweave**: Planning, specs, TDD, living docs (18 skills, 10 agents)

### External Integrations
- **specweave-github**: GitHub Issues sync
- **specweave-jira**: JIRA epics/stories sync
- **specweave-ado**: Azure DevOps work items

### Tech Stacks
- **specweave-frontend**: React, Vue, Angular, Next.js
- **specweave-backend**: Node.js, Python, .NET
- **specweave-mobile**: React Native, Expo

### Infrastructure
- **specweave-kubernetes**: K8s, Helm, GitOps, security
- **specweave-infrastructure**: Cloud, monitoring, SLOs

### Specialized Domains
- **specweave-ml**: Complete ML lifecycle (13 skills, 3 agents)
- **specweave-release**: Release management, version alignment
- **specweave-ui**: Playwright E2E testing
- **specweave-testing**: Browser automation
- **specweave-payments**: Stripe, PayPal, billing
- **specweave-cost-optimizer**: Cloud cost analysis
- **specweave-figma**: Design-to-code
- **specweave-diagrams**: Mermaid, C4 diagrams

### Documentation
- **specweave-docs**: Docusaurus, spec-driven workflows
- **specweave-docs-preview**: Interactive documentation preview

### Meta/Tools
- **specweave-tooling**: Skill creation, orchestration
- **specweave-alternatives**: Framework comparison (BMAD, spec-kit)

---

## Key Statistics

### Skills Distribution
- Core plugin: 18 skills
- ML plugin: 13 skills
- Infrastructure: 5 + 5 = 10 skills
- Tech stacks: 13 skills (frontend 3, backend 3, mobile 7)
- Integrations: 10 skills (GitHub 3, JIRA 3, ADO 4)
- Others: 14 skills

**Total**: 78+ skills across 21 plugins

### Agents Distribution
- Core plugin: 10 agents (PM, Architect, Tech Lead, QA, Security, Performance, etc.)
- Infrastructure: 5 agents (DevOps, SRE, Network, Observability, Performance)
- ML plugin: 3 agents (Data Scientist, ML Engineer, MLOps)
- Integrations: 6 agents (GitHub, JIRA, ADO managers + mappers)
- Others: 7 agents (Database optimizer, Mobile architect, Release manager, etc.)

**Total**: 31 agents across 21 plugins

### Commands Distribution
- Core plugin: 22+ commands
- Integrations: 16 commands (GitHub 8, JIRA 3, ADO 5)
- ML: 4 commands
- Release: 4 commands
- Infrastructure: 2 commands
- Docs: 2 commands

**Total**: 54+ commands across 21 plugins

---

## Feature Highlights

### Unique SpecWeave Features
- **Intelligent Living Docs**: 9-category classification, multi-project support
- **Universal Hierarchy**: Epic → Spec → Task mapping across all tools
- **Status Line**: 1ms real-time progress display
- **Progressive Disclosure**: 75%+ token reduction with smart skill loading
- **Auto-Creation**: GitHub issues auto-created after increment planning
- **Bidirectional Sync**: Full two-way sync with GitHub, JIRA, ADO
- **Multi-Project Support**: Parallel increment planning across projects
- **Test-Aware Planning**: Embedded tests in tasks (no separate test files)
- **TDD Enforcement**: Red-green-refactor cycle with validation gates
- **Brownfield Support**: Intelligent migration from legacy documentation

### Tech Stack Depth
- **Frontend**: React, Vue, Angular, Next.js 14+ with full patterns
- **Backend**: Node.js/Python/.NET with database integration
- **Mobile**: React Native + Expo with debugging & optimization
- **ML**: Complete pipeline (data → training → evaluation → deployment)
- **Infrastructure**: K8s, cloud provisioning, monitoring, SLOs
- **Deployment**: Docker, GitOps, CI/CD integration

---

## Context Efficiency

### Token Usage Estimates
- **Core Only**: 12K tokens
- **Core + GitHub**: 14K tokens
- **Core + Frontend**: 15K tokens
- **Core + Backend**: 15K tokens
- **Core + ML**: 18K tokens
- **Full Setup**: 28-30K tokens

### Optimization Techniques
1. Progressive Disclosure (only load needed skills)
2. Context Optimizer (80%+ reduction possible)
3. Keyword-based Activation (no manual skill loading)
4. Per-conversation Loading (skills reset between chats)
5. Project-specific Keywords (activate only relevant stacks)

---

## Installation

### Quick Start
```bash
cd your-project
npx specweave init .
```

### What Gets Installed
- Core plugin (always)
- All 20 optional plugins (auto-installed)
- Global marketplace registration
- Configuration files (.specweave/config.json)

### Verification
```bash
/plugin list --installed    # Should show 21 SpecWeave plugins
/specweave:status           # Should show increment status
/specweave:progress         # Should show active skills
```

---

## Common Workflows

### Feature Development
1. `/specweave:increment "Feature name"`
2. Design with architect agent
3. `/specweave:do` to execute
4. `/specweave:check-tests` to validate
5. Auto-sync to GitHub/JIRA/ADO
6. `/specweave:done` to complete

### Multi-Repo Release
1. `/specweave-release:init`
2. `/specweave-release:align` for version sync
3. `/specweave-release:rc` for release candidate
4. Test & promote to production

### ML Model Development
1. `/specweave:increment "ML: Feature"`
2. `/specweave-ml:pipeline` to design
3. `/specweave:do` to train
4. `/specweave-ml:evaluate` for metrics
5. `/specweave-ml:explain` for insights
6. `/specweave-ml:deploy` for production

### Infrastructure Setup
1. `/specweave:increment "Infrastructure: Monitoring"`
2. `/specweave-infrastructure:monitor-setup`
3. `/specweave-infrastructure:slo-implement`
4. Deploy via `/specweave:do`
5. Verify dashboards

---

## Architecture Decisions

### Why 21 Plugins Instead of Monolithic?
- **Modularity**: Each plugin is independently useful
- **Context Efficiency**: Only load what's needed
- **Extensibility**: Easy to add new plugins
- **Maintainability**: Clear separation of concerns
- **Distribution**: Can install selectively (though all auto-install)

### Why Universal Hierarchy?
- **Consistency**: Same model across all external tools
- **Traceability**: Epic → Spec → Task linkage
- **Flexibility**: Works with GitHub Issues, JIRA, ADO
- **Scalability**: Supports multi-project setups

### Why Living Docs with 9 Categories?
- **Organization**: Content automatically classified
- **Discoverability**: Easier to find documentation
- **Reusability**: Specs distributed by type
- **Maintainability**: Single source of truth

---

## Support & Resources

### Documentation
- Official Docs: https://spec-weave.com
- Marketplace: https://github.com/anton-abyzov/specweave/.claude-plugin/
- Architecture: .specweave/docs/internal/architecture/
- Guides: .specweave/docs/internal/delivery/guides/

### Getting Help
- GitHub Issues: Report bugs and request features
- Discussions: Share experiences and ask questions
- CLAUDE.md: Project-specific guidance

---

## File Organization

All documentation is stored in:
```
.specweave/increments/0031-external-tool-status-sync/reports/
├── PLUGIN-CATALOG-COMPREHENSIVE.md    (Full reference)
├── PLUGIN-QUICK-REFERENCE.md          (Quick lookup)
├── PLUGIN-MATRIX-DETAILED.md          (Architecture & tables)
└── PLUGIN-INDEX.md                    (This file)
```

---

## Version Information

**SpecWeave Version**: 0.8.0
**Documentation Date**: 2025-11-13
**Plugins Analyzed**: 21
**Last Updated**: 2025-11-13

---

## Summary

SpecWeave provides a comprehensive, modular plugin architecture with:
- **21 auto-installed plugins** covering planning, development, deployment, and analytics
- **78+ skills** providing domain expertise across all major tech stacks
- **31 agents** offering specialized roles from PM to DevOps
- **54+ commands** enabling powerful workflows and integrations
- **Progressive disclosure** loading only ~12K tokens for core, scaling to 30K for full setup
- **Universal hierarchy** for consistent sync across GitHub, JIRA, and Azure DevOps
- **Intelligent living docs** with 9-category classification and multi-project support

This represents **75% smaller core plugin** than pre-plugin architecture while maintaining **100% feature coverage**.

Use these documents as your comprehensive reference guide for SpecWeave plugins!
