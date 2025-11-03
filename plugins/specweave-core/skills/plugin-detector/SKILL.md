---
name: plugin-detector
description: Detects when SpecWeave plugins are needed and guides installation. Activates for GitHub sync, Kubernetes deployment, Figma integration, ML pipelines, payment processing, React/frontend development, backend APIs, and other domain-specific features requiring plugins.
---

# SpecWeave Plugin Detector

## What I Do

I detect when you need a SpecWeave plugin that isn't installed yet, and guide you through enabling it with clear, copy-pasteable commands.

## When I Activate

When you mention capabilities that require specific SpecWeave plugins:

### External Integrations
- **GitHub**: "sync to GitHub", "create issue", "GitHub integration", "export to GitHub" → needs `specweave-github`
- **Jira**: "sync to Jira", "create Jira ticket", "Jira integration" → needs `specweave-jira`
- **Azure DevOps**: "sync to ADO", "Azure DevOps", "work items" → needs `specweave-ado`

### Tech Stacks
- **Kubernetes**: "deploy to K8s", "Helm chart", "kubectl", "K8s manifests" → needs `specweave-kubernetes`
- **Frontend**: "React component", "Next.js", "Vue", "design system" → needs `specweave-frontend`
- **Backend**: "Express API", "FastAPI", "NestJS", ".NET backend" → needs `specweave-backend`

### Domain Expertise
- **ML/AI**: "train model", "MLflow", "TensorFlow", "PyTorch", "ML pipeline" → needs `specweave-ml`
- **Payments**: "Stripe", "PayPal", "subscription billing", "PCI compliance" → needs `specweave-payments`
- **Testing**: "Playwright tests", "E2E testing", "visual regression" → needs `specweave-testing`
- **Figma**: "Figma design", "design tokens", "import from Figma" → needs `specweave-figma`
- **Infrastructure**: "Hetzner", "Prometheus", "Grafana", "monitoring" → needs `specweave-infrastructure`
- **Diagrams**: "C4 diagram", "architecture diagram", "Mermaid", "sequence diagram" → needs `specweave-diagrams`

## How I Help

1. **Detect missing plugin**: Check if the required plugin is installed
2. **Provide installation command**: Give exact `/plugin install` command
3. **Explain benefits**: List what the plugin provides (skills, agents, commands)
4. **Continue once enabled**: Resume your task with plugin features available

## Plugin Detection Logic

I check for plugin installation by:
- Looking for plugin-specific commands (e.g., `/specweave-github:sync`)
- Checking if plugin files exist in `.claude/` directory
- Detecting absence of expected skills/agents

**If a plugin is missing**, I provide:
```
📦 Plugin Required: specweave-{name}

To enable this plugin:
1. Run: /plugin install specweave-{name}@specweave
2. Restart this conversation (or continue - plugin will load)

This plugin provides:
✅ {List of key features}
✅ {Specialized agents}
✅ {Slash commands}

Would you like me to guide you through the installation?
```

## Example Flows

### Example 1: GitHub Integration

**User**: "Let's sync this increment to GitHub Issues"

**Me**:
```
📦 Plugin Required: specweave-github

I notice you want GitHub integration, but the `specweave-github` plugin isn't installed yet.

To enable GitHub sync features:

1. Run this command:
   /plugin install specweave-github@specweave

2. Once installed, you'll have access to:
   ✅ Bidirectional increment ↔ GitHub Issue sync
   ✅ Task-level progress tracking via issue comments
   ✅ Automatic issue creation from specs
   ✅ GitHub CLI integration (via `gh` command)
   ✅ Commands: /specweave:github:sync, /specweave:github:create-issue, /specweave:github:status

Would you like me to guide you through the installation, or would you prefer to continue without GitHub sync?
```

### Example 2: Kubernetes Deployment

**User**: "Deploy this to Kubernetes with Helm"

**Me**:
```
📦 Plugin Required: specweave-kubernetes

For Kubernetes deployment features, you'll need the `specweave-kubernetes` plugin.

To enable:

1. Run: /plugin install specweave-kubernetes@specweave

2. This plugin provides:
   ✅ K8s manifest generation (deployments, services, configmaps)
   ✅ Helm chart scaffolding and templates
   ✅ GitOps workflow with ArgoCD/Flux
   ✅ Security policies and RBAC patterns
   ✅ Skills: k8s-manifest-generator, helm-chart-scaffolding, gitops-workflow

Alternatively, I can help you create basic K8s manifests manually without the plugin. Which would you prefer?
```

### Example 3: Already Installed

**User**: "Create a C4 diagram for this architecture"

**Me**:
```
✅ Plugin Available: specweave-diagrams

Great! The diagrams plugin is installed. I can create C4 diagrams for you.

I'll use the diagrams-architect agent to:
1. Analyze your architecture from specs
2. Generate Mermaid C4 diagram code
3. Export to both .mmd and .svg formats
4. Place in .specweave/docs/internal/architecture/diagrams/

Let me start by examining your architecture specifications...
```

## Available SpecWeave Plugins

### Core (Always Available)
- `specweave-core` - Framework essentials (increment lifecycle, PM/Architect/Tech Lead agents)

### Integrations
- `specweave-github` - GitHub Issues sync
- `specweave-jira` - Jira integration
- `specweave-ado` - Azure DevOps integration

### Tech Stacks
- `specweave-frontend` - React, Next.js, Vue, design systems
- `specweave-backend` - Node.js, Python, .NET APIs
- `specweave-kubernetes` - K8s deployment, Helm, GitOps
- `specweave-infrastructure` - Cloud infra, monitoring, Hetzner

### Domain Expertise
- `specweave-ml` - ML pipelines, training, deployment
- `specweave-payments` - Stripe, PayPal, PCI compliance
- `specweave-testing` - Playwright E2E, visual regression
- `specweave-figma` - Design system integration
- `specweave-diagrams` - C4, Mermaid, architecture diagrams
- `specweave-docs` - Docusaurus generation

### Utilities
- `specweave-tooling` - Skill creation, routing
- `specweave-cost-optimizer` - Cloud cost comparison
- `specweave-alternatives` - Framework comparison

## Installation Commands Reference

**Quick Install (Most Common)**:
```bash
# GitHub integration
/plugin install specweave-github@specweave

# Frontend development
/plugin install specweave-frontend@specweave

# Backend APIs
/plugin install specweave-backend@specweave

# Kubernetes deployment
/plugin install specweave-kubernetes@specweave

# ML/AI workflows
/plugin install specweave-ml@specweave

# Architecture diagrams
/plugin install specweave-diagrams@specweave
```

**View All Available**:
```bash
/plugin marketplace list specweave
```

## Best Practices

1. **Be Proactive**: Detect missing plugins early in the conversation
2. **Offer Alternatives**: If a plugin isn't installed, suggest manual approaches
3. **Don't Block**: Never refuse to help—offer to continue without the plugin
4. **Clear Instructions**: Always provide exact copy-pasteable commands
5. **Explain Benefits**: Help users understand why the plugin is valuable

## Integration with Other Skills

This skill works alongside:
- **project-kickstarter**: Suggests plugins during new project setup
- **increment-planner**: Recommends plugins based on increment requirements
- **specweave-detector**: Coordinates with workflow detection

## Notes

- This skill is **non-blocking** - I always offer to continue without plugins
- Plugins are **opt-in** - users choose what to install
- Installation is **instant** - plugins activate immediately
- All plugins follow **Claude Code's native plugin architecture**
