# Plugin Organization Plan - All 54 Skills

**Date**: 2025-11-02
**Issue**: User correctly identified that 30+ plugin-specific skills are missing
**Task**: Organize all 54 skills into proper marketplace plugins

---

## 🎯 **The Problem**

User said: "I can't find all those numerous claude plugins with skills, e.g. for jira sync, github, k8s, infra, skill-creator etc! it was 30+ you MUST ultrathink and restore it"

**Translation**: Many skills belong in domain-specific plugins, not in the core framework!

---

## 📊 **Current State**

**Root skills/ folder**: 54 skills (all in one place)
**plugins/ folder**: Only `specweave-github` exists

**Problem**: All skills mixed together, no proper plugin organization!

---

## ✅ **Plugin Organization Strategy**

### Core Skills (Stay in root `skills/`)

These are FRAMEWORK skills, used by all projects:
```
skills/
├── increment-planner         ← PM-led planning
├── project-kickstarter       ← New project setup
├── brownfield-analyzer       ← Existing project analysis
├── brownfield-onboarder      ← Doc migration
├── context-loader            ← Context management
├── context-optimizer         ← Token optimization
├── increment-quality-judge   ← Quality assessment
├── specweave-detector        ← Project detection
├── role-orchestrator         ← Role coordination
└── SKILLS-INDEX.md           ← Skill catalog
```

**Total Core**: 9 skills

---

### Plugin Skills (Move to `plugins/`)

#### 1. **specweave-github** ✅ (already exists)
```
plugins/specweave-github/
└── skills/
    └── github-sync
```

#### 2. **specweave-jira** (NEW)
```
plugins/specweave-jira/
└── skills/
    ├── jira-sync
    └── specweave-jira-mapper
```

#### 3. **specweave-ado** (NEW)
```
plugins/specweave-ado/
└── skills/
    ├── ado-sync
    └── specweave-ado-mapper
```

#### 4. **specweave-kubernetes** (NEW)
```
plugins/specweave-kubernetes/
└── skills/
    ├── k8s-manifest-generator
    ├── k8s-security-policies
    ├── helm-chart-scaffolding
    └── gitops-workflow
```

#### 5. **specweave-infrastructure** (NEW)
```
plugins/specweave-infrastructure/
└── skills/
    ├── hetzner-provisioner
    ├── prometheus-configuration
    ├── grafana-dashboards
    ├── distributed-tracing
    └── slo-implementation
```

#### 6. **specweave-figma** (NEW)
```
plugins/specweave-figma/
└── skills/
    ├── figma-designer
    ├── figma-implementer
    ├── figma-mcp-connector
    └── figma-to-code
```

#### 7. **specweave-frontend** (NEW)
```
plugins/specweave-frontend/
└── skills/
    ├── frontend
    ├── nextjs
    └── design-system-architect
```

#### 8. **specweave-backend** (NEW)
```
plugins/specweave-backend/
└── skills/
    ├── nodejs-backend
    ├── python-backend
    └── dotnet-backend
```

#### 9. **specweave-payments** (NEW)
```
plugins/specweave-payments/
└── skills/
    ├── stripe-integration
    ├── paypal-integration
    ├── pci-compliance
    └── billing-automation
```

#### 10. **specweave-ml** (NEW)
```
plugins/specweave-ml/
└── skills/
    └── ml-pipeline-workflow
```

#### 11. **specweave-testing** (NEW)
```
plugins/specweave-testing/
└── skills/
    ├── e2e-playwright
    └── tdd-workflow
```

#### 12. **specweave-docs** (NEW)
```
plugins/specweave-docs/
└── skills/
    ├── docusaurus
    ├── spec-driven-brainstorming
    └── spec-driven-debugging
```

#### 13. **specweave-tooling** (NEW)
```
plugins/specweave-tooling/
└── skills/
    ├── skill-creator
    └── skill-router
```

#### 14. **specweave-bmad** (NEW)
```
plugins/specweave-bmad/
└── skills/
    ├── bmad-method-expert
    └── spec-kit-expert
```

#### 15. **specweave-cost-optimizer** (NEW)
```
plugins/specweave-cost-optimizer/
└── skills/
    └── cost-optimizer
```

---

## 📊 **Skill Distribution**

| Plugin | Skills | Description |
|--------|--------|-------------|
| **Core** (framework) | 9 | Increment lifecycle, planning, quality |
| **specweave-github** | 1 | GitHub integration |
| **specweave-jira** | 2 | JIRA integration |
| **specweave-ado** | 2 | Azure DevOps integration |
| **specweave-kubernetes** | 4 | K8s deployment, Helm, GitOps |
| **specweave-infrastructure** | 5 | Cloud provisioning, monitoring |
| **specweave-figma** | 4 | Design integration |
| **specweave-frontend** | 3 | React, Next.js, design systems |
| **specweave-backend** | 3 | Node.js, Python, .NET backends |
| **specweave-payments** | 4 | Stripe, PayPal, PCI compliance |
| **specweave-ml** | 1 | ML pipelines |
| **specweave-testing** | 2 | E2E testing, TDD |
| **specweave-docs** | 3 | Docusaurus, spec-driven docs |
| **specweave-tooling** | 2 | Skill creation, routing |
| **specweave-bmad** | 2 | BMAD method expertise |
| **specweave-cost-optimizer** | 1 | Cloud cost optimization |
| **Total** | **54 skills** | |

---

## 🚀 **Implementation Steps**

### Step 1: Create Plugin Folders
```bash
mkdir -p plugins/{specweave-jira,specweave-ado,specweave-kubernetes,specweave-infrastructure}/skills
mkdir -p plugins/{specweave-figma,specweave-frontend,specweave-backend,specweave-payments}/skills
mkdir -p plugins/{specweave-ml,specweave-testing,specweave-docs,specweave-tooling}/skills
mkdir -p plugins/{specweave-bmad,specweave-cost-optimizer}/skills
```

### Step 2: Move Skills to Plugins
```bash
# JIRA
mv skills/jira-sync plugins/specweave-jira/skills/
mv skills/specweave-jira-mapper plugins/specweave-jira/skills/

# ADO
mv skills/ado-sync plugins/specweave-ado/skills/
mv skills/specweave-ado-mapper plugins/specweave-ado/skills/

# Kubernetes
mv skills/k8s-manifest-generator plugins/specweave-kubernetes/skills/
mv skills/k8s-security-policies plugins/specweave-kubernetes/skills/
mv skills/helm-chart-scaffolding plugins/specweave-kubernetes/skills/
mv skills/gitops-workflow plugins/specweave-kubernetes/skills/

# ... (and so on for all plugins)
```

### Step 3: Create Plugin Manifests
Each plugin needs:
- `.claude-plugin/plugin.json` (Claude native)
- `.claude-plugin/manifest.json` (SpecWeave metadata)

### Step 4: Update Marketplace
Add all 15 plugins to `marketplace/marketplace.json`

---

## ✅ **Benefits**

### For Users
- ✅ **Discovery**: Easy to find domain-specific skills
- ✅ **Installation**: `specweave plugin install kubernetes`
- ✅ **Context efficiency**: Only load what you need

### For SpecWeave
- ✅ **Organization**: Logical skill grouping
- ✅ **Maintainability**: Each plugin self-contained
- ✅ **Scalability**: Easy to add new plugins
- ✅ **Community**: Third-party plugins can follow same pattern

---

## 📝 **Next Actions**

1. ✅ Restore missing 8 skills (DONE)
2. ⏳ Create plugin folder structure (IN PROGRESS)
3. ⏳ Move skills to appropriate plugins
4. ⏳ Create plugin manifests
5. ⏳ Update marketplace.json
6. ⏳ Update install scripts to handle plugins
7. ⏳ Test plugin discovery and loading

---

**Status**: Plan created, ready to implement
**Estimated Time**: 2-3 hours for full migration
**Complexity**: Medium (many files to move, many manifests to create)
