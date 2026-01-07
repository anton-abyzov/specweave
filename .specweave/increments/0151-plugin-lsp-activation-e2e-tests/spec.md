---
increment: 0151-plugin-lsp-activation-e2e-tests
title: "Plugin/LSP Activation E2E Tests and Fixes"
status: completed
priority: P0
type: feature
created: 2025-12-31
completed: 2026-01-07
---

# Plugin/LSP Activation E2E Tests and Fixes

## Problem Statement

Two critical issues prevent SpecWeave from leveraging its full capabilities:

1. **Plugin/Skill Activation Gap**: 24 plugins with 119 skills are installed, but they rarely activate for domain-specific work (K8s, mobile, backend). Root cause: Claude only sees ~40 tokens per skill, not the detailed triggers in SKILL.md files.

2. **LSP Not Implemented**: Documentation claims LSP is "ENABLED BY DEFAULT" but zero implementation exists. All code analysis is regex-based, making Python/C#/etc. support superficial.

## Goals

- Build E2E tests proving plugin activation works for domain keywords
- Build E2E tests proving LSP integration works for multiple languages
- Fix any gaps discovered during testing
- Ensure the 24 plugins actually get used in real-world scenarios

## User Stories

### US-001: Plugin Activation E2E Tests
**Project**: specweave
**As a** developer using SpecWeave
**I want** proof that domain-specific plugins activate when I ask about K8s, mobile, or backend topics
**So that** I can trust the plugin system works as documented

**Acceptance Criteria**:
- [x] **AC-US1-01**: E2E test verifies kubernetes-architect agent activates for "deploy to EKS with GitOps"
- [x] **AC-US1-02**: E2E test verifies mobile-architect agent activates for "React Native authentication flow"
- [x] **AC-US1-03**: E2E test verifies backend agents activate for "NestJS API with Prisma"
- [x] **AC-US1-04**: E2E test verifies frontend-architect activates for "Next.js dashboard"
- [x] **AC-US1-05**: Test coverage includes at least 5 different plugin domains

### US-002: Skill Trigger Index Generation
**Project**: specweave
**As a** developer
**I want** an auto-generated skill trigger index that maps keywords to skills
**So that** Claude can match user prompts to the right skills

**Acceptance Criteria**:
- [x] **AC-US2-01**: Script extracts trigger keywords from all 119 SKILL.md files
- [x] **AC-US2-02**: Generates `.specweave/state/skill-triggers-index.json`
- [x] **AC-US2-03**: Index maps keywords → skill names (e.g., "EKS" → "kubernetes-architect")
- [x] **AC-US2-04**: Index is refreshed on plugin installation
- [x] **AC-US2-05**: Unit tests verify index generation works

### US-003: LSP Implementation (Basic)
**Project**: specweave
**As a** developer working with Python/C#/Go projects
**I want** LSP to actually provide semantic code analysis
**So that** living docs and code understanding are accurate

**Acceptance Criteria**:
- [x] **AC-US3-01**: TypeScript/JavaScript LSP integration works (goToDefinition, findReferences)
- [x] **AC-US3-02**: Python LSP integration works (pylsp or pyright)
- [x] **AC-US3-03**: LSP initialization occurs on living-docs commands
- [x] **AC-US3-04**: Fallback to grep when LSP unavailable
- [x] **AC-US3-05**: E2E test proves LSP finds symbols faster than grep

### US-004: Plugin Activation Debugging
**Project**: specweave
**As a** developer troubleshooting plugin issues
**I want** visibility into which plugins/skills are matching my prompts
**So that** I can understand why a skill isn't activating

**Acceptance Criteria**:
- [x] **AC-US4-01**: `/sw:plugin-status` shows loaded plugins and their activation status
- [x] **AC-US4-02**: `/sw:skill-match "prompt"` tests a prompt against skill triggers
- [x] **AC-US4-03**: Debug mode logs skill matching decisions
- [x] **AC-US4-04**: Activation failures are logged with reasons

## Out of Scope

- Visual regression testing
- Full LSP for all 20+ languages (just TypeScript and Python for now)
- Performance benchmarking

## Technical Notes

### Skill Trigger Index Format

```json
{
  "keywords": {
    "kubernetes": ["kubernetes-architect", "k8s-manifest-generator"],
    "eks": ["kubernetes-architect"],
    "react native": ["mobile-architect"],
    "nestjs": ["nodejs-backend"],
    "prisma": ["nodejs-backend", "database-optimizer"]
  },
  "skills": {
    "kubernetes-architect": {
      "plugin": "specweave-kubernetes",
      "triggers": ["kubernetes", "k8s", "eks", "aks", "gke", "helm", "gitops"],
      "description": "Expert Kubernetes architect..."
    }
  },
  "generatedAt": "2025-12-31T20:00:00Z",
  "skillCount": 119
}
```

### E2E Test Structure

```typescript
describe('Plugin Activation E2E', () => {
  it('activates kubernetes-architect for EKS GitOps prompt', async () => {
    const result = await testSkillActivation(
      'I need to deploy microservices to EKS with ArgoCD GitOps'
    );
    expect(result.matchedSkills).toContain('kubernetes-architect');
  });
});
```

## Success Metrics

- 100% of E2E tests pass for 5+ plugin domains
- Skill trigger index covers all 119 skills
- LSP provides faster symbol resolution than grep
