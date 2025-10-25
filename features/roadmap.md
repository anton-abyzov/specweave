# SpecWeave Roadmap

> **Current Version**: 0.1.0-alpha
> **Next Release**: 0.2.0 (Target: 2025-02-15)

---

## 🚀 In Progress

### 001: Context Loader (P1) - 0% Complete
**Status**: Planned
**Assignee**: Unassigned
**Target**: v0.2.0

Selective specification loading based on context manifests. Reduces token usage by 70%+.

**Tasks**: 0/78 completed
[View Feature →](./001-context-loader/)

---

## 📋 Planned for v0.2.0

### 002: Skill Router (P1)
**Status**: Not Started
**Priority**: P1 (Critical)

Auto-detect user intent and route to appropriate skills without manual @role selection.

**Dependencies**: 001-context-loader

### 003: Docs Updater (P2)
**Status**: Not Started
**Priority**: P2 (Important)

Auto-update living documentation via Claude hooks after task completion.

**Dependencies**: 001-context-loader

---

## 📅 Planned for v0.3.0

### 004: Spec Author
Create and update specifications with modular structure support.

### 005: Architect
System design, API contracts, data models, and architecture documentation.

### 006: Developer
Implement features with context awareness and E2E testing.

### 007: QA Engineer
Comprehensive testing strategy, test generation, and validation.

---

## 🔮 Planned for v0.4.0 (Integration & IaC)

### 008: JIRA Sync
Bi-directional sync between SpecWeave features and JIRA epics/stories.

### 009: GitHub Sync
Create GitHub issues from SpecWeave features, sync status and progress.

### 010: ADO Sync
Azure DevOps integration for work item management.

### 011: IaC Provisioner
Generate Terraform/Pulumi code from infrastructure specs.

---

## 💡 Backlog (Future)

### Community & Marketplace
- [ ] Skills marketplace
- [ ] Community skill contributions
- [ ] Verified skill badges
- [ ] Skill dependency management

### Enterprise Features
- [ ] Multi-team support
- [ ] Compliance tracking (SOC2, HIPAA, GDPR)
- [ ] Advanced analytics
- [ ] Role-based access control

### Advanced Capabilities
- [ ] Vector search for semantic context loading
- [ ] AI-powered spec summarization
- [ ] Automated regression detection
- [ ] Performance profiling integration

### Domain-Specific Skills
- [ ] New Relic monitoring integration
- [ ] CQRS pattern implementation
- [ ] Event-Driven Architecture (Kafka, RabbitMQ)
- [ ] Microservices orchestration
- [ ] Database migration management

---

## ✅ Completed

*(None yet - v0.1.0 is foundation only)*

**v0.1.0-alpha** (2025-01-25):
- ✅ Project structure established
- ✅ Principles defined (docs/principles.md)
- ✅ feature-planner skill created
- ✅ specweave-detector skill created (entry point)
- ✅ First feature planned (001-context-loader)

---

## 📊 Release Timeline

```
v0.1.0 ────┬──── v0.2.0 ────┬──── v0.3.0 ────┬──── v0.4.0 ────┬──── v1.0.0
  (Now)    │    (Feb 15)    │    (Mar 15)    │    (Apr 15)    │   (May 15)
           │                │                │                │
     Foundation      Core Skills      Dev Skills     Integration     GA Release
```

---

## 🎯 Version Goals

### v0.2.0 - Core Framework
**Target**: 2025-02-15

- ✅ Context loading with 70%+ token reduction
- ✅ Auto-role routing (no manual @role)
- ✅ Living documentation via hooks
- ✅ Test coverage >80%

**Exit Criteria**:
- All P1 features implemented and tested
- Documentation portal live
- 5+ real-world test projects

### v0.3.0 - Development Skills
**Target**: 2025-03-15

- ✅ Complete skill library (spec-author, architect, developer, qa-engineer)
- ✅ Brownfield project support
- ✅ Regression prevention workflows
- ✅ CLI tool fully functional

**Exit Criteria**:
- Can build complete features end-to-end
- Brownfield onboarding validated
- 20+ community skills

### v0.4.0 - Integration & IaC
**Target**: 2025-04-15

- ✅ JIRA/GitHub/ADO sync
- ✅ Infrastructure as Code support
- ✅ MCP wrapper skills
- ✅ Cross-platform installers

**Exit Criteria**:
- Enterprise-ready
- Production deployments
- Case studies published

### v1.0.0 - General Availability
**Target**: 2025-05-15

- ✅ Stable API
- ✅ Complete documentation
- ✅ Skills marketplace
- ✅ YouTube tutorial series
- ✅ 100+ stars on GitHub

**Exit Criteria**:
- Used in 50+ production projects
- <10 critical bugs in 30 days
- Community contributions active

---

## 🔗 Integration Status

| Tool | Status | Sync Features ↔ Issues | Bi-Directional |
|------|--------|------------------------|----------------|
| **GitHub** | Planned | ✅ | ✅ |
| **JIRA** | Planned | ✅ | ✅ |
| **Azure DevOps** | Planned | ✅ | ✅ |
| **Trello** | Backlog | ✅ | ❌ |
| **Linear** | Backlog | ✅ | ✅ |

---

## 📈 Metrics & KPIs

### Current (v0.1.0)
- **Features Planned**: 1
- **Features Completed**: 0
- **Skills Created**: 2 (feature-planner, specweave-detector)
- **Test Coverage**: N/A
- **Documentation Pages**: 15+

### Targets (v0.2.0)
- **Features Completed**: 3 (context-loader, skill-router, docs-updater)
- **Skills Created**: 5+
- **Test Coverage**: >80%
- **Token Reduction**: 70%+
- **Cache Hit Rate**: >60%
- **Routing Accuracy**: >90%

### Targets (v1.0.0)
- **Production Projects**: 50+
- **Community Skills**: 100+
- **GitHub Stars**: 1000+
- **Documentation Portal Visits**: 10k+/month

---

## 🤝 Contributing

### How to Contribute

1. **Create Skills**: Build domain-specific skills (New Relic, CQRS, EDA)
2. **Report Issues**: Use GitHub issue templates
3. **Submit PRs**: Follow Git Flow, require tests
4. **Write Docs**: Improve guides and tutorials
5. **Share Feedback**: What's working? What's missing?

### Priority Areas

- 🔥 **High Priority**: Core skills (spec-author, architect, developer)
- 🔥 **High Priority**: Test coverage for existing skills
- 🟡 **Medium Priority**: Integration skills (JIRA, GitHub)
- 🟢 **Low Priority**: Domain-specific skills (optional enhancements)

---

## 📞 Stay Updated

- **GitHub**: [Watch releases](https://github.com/yourusername/specweave/releases)
- **Changelog**: [docs/changelog/releases.md](../docs/changelog/releases.md)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/specweave/discussions)

---

**Last Updated**: 2025-01-25
**Auto-Generated**: This roadmap is automatically updated from `features/` directory status.

Run `specweave roadmap update` to refresh.
