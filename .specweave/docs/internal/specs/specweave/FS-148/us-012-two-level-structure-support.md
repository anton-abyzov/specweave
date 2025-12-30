---
id: US-012
feature: FS-148
title: 2-Level Structure Support (Projects/Boards)
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 962
    url: https://github.com/anton-abyzov/specweave/issues/962
---

# US-012: 2-Level Structure Support (Projects/Boards)

## User Story

**As a** developer using a 2-level structure (multiple projects/boards for microservices), I want auto mode to intelligently assign increments and user stories to the correct project/board based on content analysis.

## Background

In complex architectures with microservices, different features belong to different services. Auto mode needs to:
- Detect 2-level structures from configuration
- Analyze feature content for keywords
- Auto-assign to appropriate project/board
- Split cross-cutting features across projects

## Acceptance Criteria

- [ ] **AC-US12-01**: Detect 2-level structure from config (`multiProject`, `umbrella`, ADO area paths)
- [ ] **AC-US12-02**: When splitting increments, auto-assign to appropriate project based on keywords
- [ ] **AC-US12-03**: Auth/login/JWT → backend-api project
- [ ] **AC-US12-04**: React/component/UI → frontend-web project
- [ ] **AC-US12-05**: Mobile/iOS/Android → mobile-app project
- [ ] **AC-US12-06**: When multi-project increment detected, split user stories across projects
- [ ] **AC-US12-07**: Each US in spec.md has explicit `**Project**:` field
- [ ] **AC-US12-08**: Sync to correct GitHub repo / JIRA project / ADO area path per project

## Technical Notes

### Structure Detection

```typescript
import { detectStructureLevel } from './utils/structure-level-detector';

const structureConfig = detectStructureLevel(projectRoot);
// structureConfig.level: 1 or 2
// structureConfig.projects: available projects
// structureConfig.boardsByProject: boards per project (if 2-level)
```

### Keyword Mapping

| Keywords | Target Project |
|----------|---------------|
| auth, login, JWT, session, API | backend-api |
| React, Vue, UI, component, form, button | frontend-web |
| mobile, iOS, Android, React Native | mobile-app |
| Terraform, Docker, K8s, deploy, CI/CD | infrastructure |
| types, interfaces, validators, shared | shared-lib |

### Auto-Assignment Flow

```
1. Parse feature description for keywords
2. Calculate confidence scores per project
3. If >80% single project → auto-assign silently
4. If multi-project detected (within 15%) → split USs
5. If ambiguous (<50%) → ask user
```

### spec.md Format

```markdown
### US-001: Login Form
**Project**: frontend-web
**As a** user, I want a login form...

### US-002: Auth API
**Project**: backend-api
**As a** developer, I want auth endpoints...
```
