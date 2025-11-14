# SpecWeave Roadmap

:::info Plugin Roadmap
This page lists planned plugins and features for future releases. For implemented features, see [Key Features](./key-features.md).
:::

## Available Now

**Core Plugin** (`specweave`):
- 9 skills (increment-planner, spec-generator, tdd-workflow, etc.)
- 22 agents (PM, Architect, Tech Lead, + 19 specialized)
- 22 commands (/specweave:increment, /specweave:do, etc.)
- 8 lifecycle hooks

**Integration Plugins**:
- **specweave-github** - GitHub Issues integration
- **specweave-jira** - JIRA project tracking
- **specweave-ado** - Azure DevOps integration

**Infrastructure Plugins**:
- **specweave-infrastructure** - DevOps, Terraform, K8s
- **specweave-kubernetes** - K8s architect, deployments
- **specweave-release** - Release management

**Quality Plugins**:
- **specweave-backend** - Database optimization
- **specweave-payments** - Stripe, PayPal integration
- **specweave-ml** - ML pipelines, data science
- **specweave-diagrams** - C4 diagrams, Mermaid
- **specweave-mobile** - React Native architecture

For complete list, see `plugins/` directory or run `/plugin list --installed`.

---

## Planned Plugins (Future Releases)

### Tech Stack Plugins

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **frontend-stack** | 5 | 1 | 0 | React, Next.js, Tailwind, design systems |
| **python-backend** | 3 | 1 | 0 | FastAPI, Django, Flask, Python services |
| **dotnet-backend** | 3 | 1 | 0 | ASP.NET Core, EF Core, C# services |

### Domain Expertise Plugins

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **ml-ops** | 3 | 3 | 1 | Machine learning, TensorFlow, PyTorch, model deployment |
| **observability** | 4 | 4 | 2 | Prometheus, Grafana, monitoring, alerting |
| **e2e-testing** | 1 | 0 | 0 | Playwright automation, visual regression, browser testing |
| **figma-ecosystem** | 5 | 2 | 0 | Design integration, Figma API, design tokens |
| **security** | 3 | 1 | 0 | Security scanning, OWASP, penetration testing |

### Enterprise Integration Plugins

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **slack-integration** | 2 | 1 | 3 | Team notifications, status updates, chat ops |
| **confluence-sync** | 2 | 1 | 2 | Confluence wiki sync, knowledge base integration |
| **notion-sync** | 2 | 1 | 2 | Notion workspace sync, documentation portal |

---

## Roadmap Management

:::tip Track Progress
All roadmap items are tracked in [GitHub Projects](https://github.com/anton-abyzov/specweave/projects). Vote on features, suggest new plugins, or track development progress there.
:::

### How to Request a Plugin

1. **Check existing requests**: Browse [GitHub Issues](https://github.com/anton-abyzov/specweave/issues?q=is%3Aissue+label%3Aplugin-request)
2. **Create feature request**: Open new issue with label `plugin-request`
3. **Describe use case**: What problem does it solve? Who benefits?
4. **Vote on existing**: 👍 on issues you want to see prioritized

### Plugin Development Priority

Plugins are prioritized based on:
- **Community demand** (GitHub issue votes)
- **Business impact** (enterprise customers, revenue)
- **Strategic alignment** (SpecWeave vision, roadmap)
- **Implementation complexity** (effort, dependencies)

### Want to Build a Plugin?

See [Plugin Development Guide](/docs/guides/creating-plugins) to create your own plugin!

---

## Release Timeline (Tentative)

:::caution Subject to Change
Release dates are estimates and may change based on community feedback and priorities.
:::

### Q1 2025
- **frontend-stack** plugin (React, Next.js, Tailwind)
- **slack-integration** plugin (team notifications)
- **observability** plugin enhancements (Prometheus, Grafana)

### Q2 2025
- **python-backend** plugin (FastAPI, Django)
- **e2e-testing** plugin (Playwright automation)
- **figma-ecosystem** plugin (design integration)

### Q3 2025
- **dotnet-backend** plugin (ASP.NET Core)
- **security** plugin (OWASP, pen testing)
- **confluence-sync** plugin (wiki integration)

### Q4 2025
- **ml-ops** plugin enhancements (model deployment)
- **notion-sync** plugin (documentation portal)
- Enterprise features (SSO, audit logs, compliance)

---

## Completed Milestones

### v0.17.x (Current)
- ✅ Multi-project GitHub sync with intelligent rate limiting
- ✅ Living docs domain-based organization
- ✅ External tool status synchronization
- ✅ Progressive disclosure (Phases 1-3 complete)

### v0.16.x
- ✅ Flattened multi-project structure (specs/, modules/, team/)
- ✅ Universal hierarchy for living docs
- ✅ GitHub epic sync with bidirectional updates

### v0.15.x
- ✅ Plugin validation system
- ✅ Brownfield detection and migration
- ✅ Multi-project internal docs structure

### v0.14.x
- ✅ Status line feature (ultra-fast caching)
- ✅ Metadata validation and fallback creation
- ✅ GitHub issue auto-creation

### v0.13.x
- ✅ Hooks architecture refactor (plugin-based)
- ✅ External tool sync moved to plugins
- ✅ Improved hook isolation

---

## Community Contributions

We welcome community-contributed plugins! See [Contributing Guide](/docs/guides/contributing) for details.

**Popular community plugins** (when available):
- None yet - be the first!

---

**Last Updated**: 2025-11-13

**Next Update**: Q1 2025 (after v0.18.0 release)
