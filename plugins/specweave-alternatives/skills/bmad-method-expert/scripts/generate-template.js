#!/usr/bin/env node

/**
 * BMAD Template Generator
 *
 * Generates starter templates for BMAD documents
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES = {
  prd: {
    name: 'Product Requirements Document (PRD)',
    filename: 'docs/prd.md',
    content: `# Product Requirements Document (PRD)

## Project Overview

**Project Name:** [Your Project Name]
**Version:** 1.0
**Date:** ${new Date().toISOString().split('T')[0]}
**Product Manager:** [Name]
**Status:** Draft

### Executive Summary

[Brief overview of the product - what it is, why it exists, and what problem it solves]

### Goals and Objectives

1. [Primary goal]
2. [Secondary goal]
3. [Additional objectives]

## Target Audience

### Primary Users
- [User persona 1]: [Description]
- [User persona 2]: [Description]

### Secondary Users
- [Stakeholder type]: [Description]

## Functional Requirements

### Core Features

#### Feature 1: [Feature Name]
**Description:** [What this feature does]
**Priority:** [High/Medium/Low]
**User Story:** As a [user type], I want to [action] so that [benefit]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

#### Feature 2: [Feature Name]
**Description:** [What this feature does]
**Priority:** [High/Medium/Low]
**User Story:** As a [user type], I want to [action] so that [benefit]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Non-Functional Requirements

### Performance
- [Performance requirement 1]
- [Performance requirement 2]

### Security
- [Security requirement 1]
- [Security requirement 2]

### Scalability
- [Scalability requirement 1]

### Reliability
- [Reliability requirement 1]

### Usability
- [Usability requirement 1]

### Maintainability
- [Maintainability requirement 1]

## Epics

### Epic 1: [Epic Name]
**Description:** [High-level description of this epic]

**User Stories:**
1. As a [user], I want to [action] so that [benefit]
2. As a [user], I want to [action] so that [benefit]

### Epic 2: [Epic Name]
**Description:** [High-level description of this epic]

**User Stories:**
1. As a [user], I want to [action] so that [benefit]
2. As a [user], I want to [action] so that [benefit]

## User Stories

### Story 1: [Story Title]
**Epic:** [Parent Epic]
**Priority:** P0/P1/P2
**Story Points:** [Estimate]

**Description:**
As a [user type]
I want to [action]
So that [benefit]

**Acceptance Criteria:**
- [ ] Given [context], when [action], then [outcome]
- [ ] Given [context], when [action], then [outcome]

**Technical Notes:**
- [Technical consideration 1]
- [Technical consideration 2]

## Dependencies

### External Dependencies
- [Dependency 1]: [Description]
- [Dependency 2]: [Description]

### Internal Dependencies
- [Team/Component dependency]

## Timeline

### Phase 1: [Phase Name]
- Duration: [Timeframe]
- Deliverables: [What will be completed]

### Phase 2: [Phase Name]
- Duration: [Timeframe]
- Deliverables: [What will be completed]

## Success Metrics

### Key Performance Indicators (KPIs)
1. [Metric 1]: [Target]
2. [Metric 2]: [Target]
3. [Metric 3]: [Target]

### Success Criteria
- [ ] [Success criterion 1]
- [ ] [Success criterion 2]
- [ ] [Success criterion 3]

## Risks and Mitigation

### Risk 1: [Risk Description]
- **Probability:** [High/Medium/Low]
- **Impact:** [High/Medium/Low]
- **Mitigation:** [How to address]

### Risk 2: [Risk Description]
- **Probability:** [High/Medium/Low]
- **Impact:** [High/Medium/Low]
- **Mitigation:** [How to address]

## Open Questions

1. [Question 1]
2. [Question 2]

## Appendix

### Glossary
- **[Term 1]:** [Definition]
- **[Term 2]:** [Definition]

### References
- [Reference 1]
- [Reference 2]

---

**Document History:**
- ${new Date().toISOString().split('T')[0]}: Initial draft
`
  },

  architecture: {
    name: 'Architecture Document',
    filename: 'docs/architecture.md',
    content: `# System Architecture Document

## Project Information

**Project Name:** [Your Project Name]
**Version:** 1.0
**Date:** ${new Date().toISOString().split('T')[0]}
**Architect:** [Name]
**Status:** Draft

## Executive Summary

[High-level overview of the system architecture and key design decisions]

## Architecture Overview

### System Context

[Describe how this system fits into the larger ecosystem - external systems, users, integrations]

### Architectural Style

**Pattern:** [e.g., Microservices, Monolithic, Serverless, Event-Driven, etc.]

**Rationale:** [Why this architectural style was chosen]

## Technology Stack

### Frontend
- **Framework:** [e.g., React, Vue, Angular]
- **Language:** [e.g., TypeScript, JavaScript]
- **Build Tool:** [e.g., Vite, Webpack]
- **State Management:** [e.g., Redux, Zustand, Context API]
- **UI Library:** [e.g., Material-UI, Tailwind CSS]

### Backend
- **Framework:** [e.g., Express, FastAPI, Django]
- **Language:** [e.g., Node.js, Python, Go]
- **Runtime:** [e.g., Node.js v20+, Python 3.11+]
- **API Style:** [e.g., REST, GraphQL, gRPC]

### Database
- **Primary Database:** [e.g., PostgreSQL, MongoDB]
- **Caching Layer:** [e.g., Redis, Memcached]
- **Search Engine:** [e.g., Elasticsearch] (if applicable)

### Infrastructure
- **Hosting:** [e.g., AWS, GCP, Azure, Vercel]
- **Container Orchestration:** [e.g., Kubernetes, Docker Compose]
- **CI/CD:** [e.g., GitHub Actions, GitLab CI]
- **Monitoring:** [e.g., Datadog, New Relic, Prometheus]

### Authentication & Security
- **Auth Method:** [e.g., JWT, OAuth 2.0, Session-based]
- **Identity Provider:** [e.g., Auth0, Cognito, custom]
- **Secrets Management:** [e.g., AWS Secrets Manager, HashiCorp Vault]

## System Components

### Component 1: [Component Name]

**Purpose:** [What this component does]

**Responsibilities:**
- [Responsibility 1]
- [Responsibility 2]

**Technology:** [Technologies used]

**Interfaces:**
- [API endpoints or communication methods]

**Dependencies:**
- [Other components or services this depends on]

### Component 2: [Component Name]

**Purpose:** [What this component does]

**Responsibilities:**
- [Responsibility 1]
- [Responsibility 2]

**Technology:** [Technologies used]

## Data Architecture

### Data Models

#### Entity 1: [Entity Name]

\`\`\`
{
  "id": "uuid",
  "field1": "type",
  "field2": "type",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
\`\`\`

#### Entity 2: [Entity Name]

\`\`\`
{
  "id": "uuid",
  "field1": "type",
  "field2": "type"
}
\`\`\`

### Database Schema

[Describe tables, relationships, indexes, constraints]

### Data Flow

1. [Step 1 of data flow]
2. [Step 2 of data flow]
3. [Step 3 of data flow]

## API Design

### REST API Endpoints

#### User Management

\`\`\`
POST   /api/v1/users              Create user
GET    /api/v1/users/:id          Get user by ID
PUT    /api/v1/users/:id          Update user
DELETE /api/v1/users/:id          Delete user
GET    /api/v1/users              List users
\`\`\`

#### [Other Resource]

\`\`\`
POST   /api/v1/[resource]         Create
GET    /api/v1/[resource]/:id     Get by ID
PUT    /api/v1/[resource]/:id     Update
DELETE /api/v1/[resource]/:id     Delete
GET    /api/v1/[resource]         List
\`\`\`

### API Authentication

- **Method:** [JWT bearer token, API keys, etc.]
- **Token Expiration:** [e.g., 1 hour]
- **Refresh Strategy:** [How tokens are refreshed]

### Error Handling

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
\`\`\`

## Security Architecture

### Authentication Flow
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Authorization Model
- **Model:** [e.g., RBAC, ABAC, ACL]
- **Roles:** [List of roles and permissions]

### Security Measures
- [ ] HTTPS/TLS encryption
- [ ] Input validation and sanitization
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Password hashing (bcrypt/argon2)
- [ ] Secrets management
- [ ] Security headers
- [ ] API authentication
- [ ] Audit logging

## Deployment Architecture

### Environments

#### Development
- **URL:** [dev.example.com]
- **Purpose:** [Development and testing]

#### Staging
- **URL:** [staging.example.com]
- **Purpose:** [Pre-production testing]

#### Production
- **URL:** [example.com]
- **Purpose:** [Live production system]

### Deployment Strategy

**Approach:** [e.g., Blue-Green, Canary, Rolling]

**Process:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Scaling Strategy

- **Horizontal Scaling:** [How and when to scale out]
- **Vertical Scaling:** [Resource limits and upgrades]
- **Auto-scaling Rules:** [CPU, memory, request thresholds]

## Performance Considerations

### Optimization Strategies
- [Strategy 1: e.g., Database indexing]
- [Strategy 2: e.g., Caching frequently accessed data]
- [Strategy 3: e.g., CDN for static assets]

### Performance Targets
- **API Response Time:** [e.g., <200ms for 95th percentile]
- **Page Load Time:** [e.g., <2s for First Contentful Paint]
- **Throughput:** [e.g., 1000 requests/second]
- **Concurrent Users:** [e.g., 10,000 concurrent users]

## Monitoring and Observability

### Metrics
- [Metric 1: e.g., Request rate]
- [Metric 2: e.g., Error rate]
- [Metric 3: e.g., Response time]

### Logging
- **Log Aggregation:** [Tool/service]
- **Log Retention:** [Duration]
- **Log Levels:** [DEBUG, INFO, WARN, ERROR]

### Alerting
- [Alert 1: Condition and notification]
- [Alert 2: Condition and notification]

## Disaster Recovery

### Backup Strategy
- **Frequency:** [e.g., Daily automated backups]
- **Retention:** [e.g., 30 days]
- **Storage:** [Where backups are stored]

### Recovery Procedures
1. [Step 1]
2. [Step 2]
3. [Step 3]

### RTO and RPO
- **Recovery Time Objective (RTO):** [e.g., 4 hours]
- **Recovery Point Objective (RPO):** [e.g., 1 hour]

## Design Patterns

### Pattern 1: [Pattern Name]
- **Use Case:** [When this pattern is used]
- **Implementation:** [How it's implemented]

### Pattern 2: [Pattern Name]
- **Use Case:** [When this pattern is used]
- **Implementation:** [How it's implemented]

## Technical Debt and Future Considerations

### Known Technical Debt
1. [Item 1: Description and plan to address]
2. [Item 2: Description and plan to address]

### Future Enhancements
1. [Enhancement 1]
2. [Enhancement 2]

## Dependencies and Integrations

### External Services
- **[Service 1]:** [Purpose and integration details]
- **[Service 2]:** [Purpose and integration details]

### Third-Party Libraries
- [Library 1]: [Version and purpose]
- [Library 2]: [Version and purpose]

## Coding Standards

### Code Style
- **Linting:** [e.g., ESLint, Pylint]
- **Formatting:** [e.g., Prettier, Black]
- **Style Guide:** [Reference to style guide]

### Testing Standards
- **Unit Test Coverage:** [e.g., 80% minimum]
- **Integration Tests:** [Requirements]
- **E2E Tests:** [Critical paths to test]

### Code Review Process
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Appendix

### Glossary
- **[Term 1]:** [Definition]
- **[Term 2]:** [Definition]

### References
- [Architecture decision record 1]
- [External documentation]

### Diagrams
[Links to architecture diagrams - consider using Mermaid, PlantUML, or C4]

---

**Document History:**
- ${new Date().toISOString().split('T')[0]}: Initial draft
`
  },

  story: {
    name: 'User Story',
    filename: 'docs/stories/story-template.md',
    content: `# User Story: [Story Title]

**Story ID:** [e.g., US-001]
**Epic:** [Parent Epic Name]
**Priority:** [P0/P1/P2]
**Status:** [Draft/In Progress/Review/Complete]
**Story Points:** [Estimate]
**Assigned To:** [Developer name or @dev]
**Created:** ${new Date().toISOString().split('T')[0]}

## Story Description

**As a** [user type/role]
**I want to** [action/feature]
**So that** [benefit/value]

## Context

[Provide background information about why this story is needed and how it fits into the larger product vision]

## Acceptance Criteria

### Functional Requirements
- [ ] **AC1:** Given [context], when [action], then [expected outcome]
- [ ] **AC2:** Given [context], when [action], then [expected outcome]
- [ ] **AC3:** Given [context], when [action], then [expected outcome]

### Non-Functional Requirements
- [ ] **NFR1:** [Performance requirement, e.g., "Response time < 200ms"]
- [ ] **NFR2:** [Security requirement]
- [ ] **NFR3:** [Accessibility requirement]

### Quality Criteria
- [ ] Unit tests written and passing (coverage ≥ 80%)
- [ ] Integration tests cover main workflows
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] No critical or high-severity issues

## Technical Details

### Architectural Context

[Reference relevant sections from architecture.md]

**Components Affected:**
- [Component 1]: [What changes]
- [Component 2]: [What changes]

**Dependencies:**
- [Dependency 1]: [Description]
- [Dependency 2]: [Description]

### Implementation Approach

1. [Step 1: What to implement]
2. [Step 2: What to implement]
3. [Step 3: What to implement]

### Database Changes

\`\`\`sql
-- New tables, columns, or migrations needed
[SQL schema changes if applicable]
\`\`\`

### API Changes

\`\`\`
[New or modified API endpoints]
POST   /api/v1/[resource]
GET    /api/v1/[resource]/:id
\`\`\`

### Files to Modify

- [ ] \`src/components/[ComponentName].tsx\`
- [ ] \`src/services/[ServiceName].ts\`
- [ ] \`src/api/[EndpointName].ts\`
- [ ] \`tests/[TestFile].test.ts\`

## Testing Strategy

### Unit Tests
- [ ] Test [functionality 1]
- [ ] Test [functionality 2]
- [ ] Test error handling
- [ ] Test edge cases

### Integration Tests
- [ ] Test [workflow 1]
- [ ] Test [workflow 2]

### Manual Testing Checklist
- [ ] [Manual test step 1]
- [ ] [Manual test step 2]
- [ ] Test in different browsers
- [ ] Test responsive design

## Risk Assessment

**Risk Level:** [Low/Medium/High]

### Identified Risks
1. **[Risk 1]:** [Description]
   - **Mitigation:** [How to address]

2. **[Risk 2]:** [Description]
   - **Mitigation:** [How to address]

## Design/UI Considerations

[Any UI mockups, wireframes, or design system references]

**Design Files:** [Link to Figma/design files]

## Related Stories

- **Depends On:** [Story IDs that must be completed first]
- **Related To:** [Related story IDs]
- **Blocks:** [Story IDs that are blocked by this one]

## QA Notes

### Risk Profile
[Results from @qa *risk assessment]

### Test Design
[Results from @qa *design assessment]

### Traceability Matrix
[Results from @qa *trace assessment]

## Development Notes

### Implementation Progress
- [Date]: [What was implemented]
- [Date]: [What was implemented]

### Blockers
- [Blocker description and status]

### Questions
1. [Question 1]
2. [Question 2]

## Review Checklist

### Code Review
- [ ] Code follows project style guide
- [ ] No hardcoded credentials or sensitive data
- [ ] Error handling is appropriate
- [ ] Code is well-commented
- [ ] No console.logs or debug code
- [ ] Performance considerations addressed

### QA Review
- [ ] All acceptance criteria met
- [ ] All tests passing
- [ ] No regression issues
- [ ] Documentation complete
- [ ] Ready for deployment

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Code reviewed and approved
- [ ] QA review completed (@qa *review)
- [ ] Documentation updated
- [ ] No critical/high bugs
- [ ] Merged to main branch
- [ ] Deployed to staging
- [ ] Product owner approval

---

**Story History:**
- ${new Date().toISOString().split('T')[0]}: Story created
`
  },

  'technical-preferences': {
    name: 'Technical Preferences',
    filename: '.bmad-core/data/technical-preferences.md',
    content: `# Technical Preferences

**Project:** [Your Project Name]
**Last Updated:** ${new Date().toISOString().split('T')[0]}

## Overview

This document defines the technical preferences, standards, and conventions for this project. All agents (PM, Architect, Developer, QA) reference this document to ensure consistency in technology choices, design patterns, and implementation approaches.

## Technology Stack

### Frontend

**Framework:** [e.g., React 18+]
**Language:** [e.g., TypeScript 5.0+]
**Build Tool:** [e.g., Vite]
**Package Manager:** [e.g., npm, pnpm, yarn]

**State Management:**
- Preferred: [e.g., Zustand for simple state, Redux Toolkit for complex]
- Avoid: [e.g., Context API for large state trees]

**Styling:**
- Primary: [e.g., Tailwind CSS]
- Component Library: [e.g., shadcn/ui, Material-UI]
- Avoid: [e.g., Inline styles, CSS-in-JS unless necessary]

**Routing:** [e.g., React Router v6]

### Backend

**Framework:** [e.g., Express.js]
**Language:** [e.g., TypeScript/Node.js 20+]
**API Style:** [e.g., RESTful APIs]

**Validation:** [e.g., Zod for schema validation]
**Authentication:** [e.g., JWT with refresh tokens]

### Database

**Primary Database:** [e.g., PostgreSQL 15+]
**ORM/Query Builder:** [e.g., Prisma, TypeORM, Drizzle]
**Migrations:** [e.g., Prisma Migrate, Knex.js]

**Caching:** [e.g., Redis for session and data caching]

### Testing

**Unit Testing:** [e.g., Vitest]
**Integration Testing:** [e.g., Supertest for API tests]
**E2E Testing:** [e.g., Playwright]
**Test Coverage:** Minimum 80% for critical paths

### DevOps & Infrastructure

**Hosting:** [e.g., Vercel for frontend, Railway for backend]
**Container:** [e.g., Docker]
**CI/CD:** [e.g., GitHub Actions]
**Monitoring:** [e.g., Sentry for errors, Vercel Analytics]

## Design Patterns & Principles

### Architecture Patterns

**Preferred:**
- [e.g., Clean Architecture / Hexagonal Architecture]
- [e.g., Repository Pattern for data access]
- [e.g., Service Layer for business logic]

**Avoid:**
- [e.g., God objects / Large monolithic modules]
- [e.g., Tight coupling between layers]

### Code Organization

**Folder Structure:**
\`\`\`
src/
  components/       # React components
  services/         # Business logic services
  api/              # API routes or client
  types/            # TypeScript type definitions
  utils/            # Utility functions
  hooks/            # Custom React hooks
  tests/            # Test files
\`\`\`

**Naming Conventions:**
- Components: PascalCase (e.g., \`UserProfile.tsx\`)
- Functions: camelCase (e.g., \`getUserById\`)
- Constants: UPPER_SNAKE_CASE (e.g., \`API_BASE_URL\`)
- Types/Interfaces: PascalCase with \`I\` prefix for interfaces (e.g., \`IUser\`) OR just PascalCase without prefix

### Error Handling

**Frontend:**
- Use Error Boundaries for React component errors
- Toast notifications for user-facing errors
- Detailed logging to monitoring service

**Backend:**
- Centralized error handling middleware
- Structured error responses with error codes
- Never expose stack traces in production

**Error Response Format:**
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
\`\`\`

### Async Handling

**Preferred:** async/await
**Avoid:** Callback hell, excessive .then() chains

### Type Safety

**TypeScript Strictness:**
- \`strict: true\`
- \`noImplicitAny: true\`
- \`strictNullChecks: true\`

**Avoid:**
- \`any\` type (use \`unknown\` instead)
- Type assertions unless absolutely necessary
- Suppressing TypeScript errors with @ts-ignore

## API Conventions

### REST API Design

**URL Structure:**
- Use nouns for resources: \`/api/v1/users\` not \`/api/v1/getUsers\`
- Use HTTP methods correctly: GET, POST, PUT, DELETE, PATCH
- Version your APIs: \`/api/v1/...\`

**Status Codes:**
- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

**Response Format:**
\`\`\`json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid"
  }
}
\`\`\`

### Pagination

**Preferred Approach:** Cursor-based pagination for scalability
**Alternative:** Offset-based for simple use cases

\`\`\`
GET /api/v1/users?cursor=xyz&limit=20
\`\`\`

## Security Standards

### Authentication & Authorization

- Use JWT with short expiration (15 min access, 7 day refresh)
- Store tokens securely (httpOnly cookies for refresh tokens)
- Implement CSRF protection
- Use secure password hashing (bcrypt, argon2)

### Data Validation

- Validate all user input on both client and server
- Use schema validation (Zod, Joi)
- Sanitize inputs to prevent XSS/SQL injection

### Secrets Management

- Never commit secrets to version control
- Use environment variables
- Use secrets manager for production (AWS Secrets Manager, etc.)

## Performance Standards

### Frontend Performance

- Code splitting and lazy loading for routes
- Optimize images (WebP format, lazy loading)
- Minimize bundle size (tree-shaking, dynamic imports)
- Use React.memo for expensive components
- Debounce/throttle event handlers

**Targets:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

### Backend Performance

- Database indexing for frequently queried fields
- Implement caching for expensive operations
- Use connection pooling
- Implement rate limiting

**Targets:**
- API response time: < 200ms (95th percentile)
- Database query time: < 100ms

## Code Quality Standards

### Linting & Formatting

**Linter:** [e.g., ESLint with recommended rules]
**Formatter:** [e.g., Prettier]
**Pre-commit Hooks:** [e.g., Husky + lint-staged]

### Code Review Guidelines

**Required:**
- All code must be reviewed before merging
- At least one approval required
- All tests must pass
- No linting errors

**Review Checklist:**
- Code follows style guide
- Tests are comprehensive
- No performance issues
- Error handling is appropriate
- Documentation is updated

### Documentation Standards

- Document all public APIs
- Use JSDoc/TSDoc for functions
- README for each major module
- Keep architecture docs updated

## Commit Conventions

**Format:** [e.g., Conventional Commits]

\`\`\`
feat: add user authentication
fix: resolve login redirect issue
docs: update API documentation
refactor: simplify user service
test: add tests for user validation
\`\`\`

## Dependency Management

### Adding Dependencies

**Before adding:**
1. Check if functionality can be achieved with existing dependencies
2. Evaluate package: maintenance, size, security
3. Prefer packages with TypeScript support

**Avoid:**
- Abandoned packages (last update > 2 years)
- Packages with known security vulnerabilities
- Bloated packages for simple functionality

### Version Management

- Use exact versions or minor updates (~)
- Regular dependency audits
- Update dependencies in controlled batches

## Accessibility Standards

**Required:**
- Semantic HTML
- ARIA labels where necessary
- Keyboard navigation support
- Color contrast ratios (WCAG AA minimum)
- Screen reader testing for critical paths

## Browser & Device Support

**Browsers:**
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

**Devices:**
- Desktop: 1920x1080 and down to 1366x768
- Tablet: iPad and equivalents
- Mobile: iOS Safari, Chrome Android

**Responsive Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Environment Variables

**Naming Convention:**
- Prefix with project identifier: \`MYAPP_\`
- All uppercase with underscores
- Group by category

**Example:**
\`\`\`
MYAPP_DATABASE_URL=
MYAPP_API_KEY=
MYAPP_REDIS_URL=
\`\`\`

## When to Deviate

These preferences are guidelines, not rigid rules. Deviate when:
- Clear technical benefit
- Well-documented reason
- Team consensus
- Documented in architecture decision record (ADR)

## Updates

This document should be reviewed and updated:
- When adopting new technologies
- After major architectural changes
- Quarterly review for relevance

---

**Changelog:**
- ${new Date().toISOString().split('T')[0]}: Initial preferences defined
`
  }
};

class TemplateGenerator {
  constructor() {
    this.projectRoot = process.cwd();
  }

  ensureDirectory(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  Created directory: ${dir}`);
    }
  }

  generateTemplate(templateKey, options = {}) {
    const template = TEMPLATES[templateKey];

    if (!template) {
      console.error(`\n❌ Error: Template '${templateKey}' not found.`);
      console.log('\nAvailable templates:');
      Object.keys(TEMPLATES).forEach(key => {
        console.log(`  - ${key}: ${TEMPLATES[key].name}`);
      });
      return false;
    }

    const outputPath = options.output || path.join(this.projectRoot, template.filename);
    const fullPath = path.resolve(outputPath);

    // Check if file exists
    if (fs.existsSync(fullPath) && !options.force) {
      console.log(`\n⚠️  File already exists: ${fullPath}`);
      console.log('   Use --force to overwrite');
      return false;
    }

    // Ensure directory exists
    this.ensureDirectory(fullPath);

    // Write file
    fs.writeFileSync(fullPath, template.content);

    console.log(`\n✅ Generated: ${template.name}`);
    console.log(`   Location: ${fullPath}`);
    console.log(`   Size: ${(template.content.length / 1024).toFixed(1)}KB\n`);

    return true;
  }

  listTemplates() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('         AVAILABLE BMAD TEMPLATES');
    console.log('═══════════════════════════════════════════════════════\n');

    Object.entries(TEMPLATES).forEach(([key, template]) => {
      console.log(`📄 ${key}`);
      console.log(`   Name: ${template.name}`);
      console.log(`   Default location: ${template.filename}`);
      console.log(`   Size: ${(template.content.length / 1024).toFixed(1)}KB\n`);
    });

    console.log('Usage:');
    console.log('  node generate-template.js <template-name>');
    console.log('  node generate-template.js <template-name> --output <path>');
    console.log('  node generate-template.js <template-name> --force\n');
  }
}

// Main execution
const args = process.argv.slice(2);
const generator = new TemplateGenerator();

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  generator.listTemplates();
} else {
  const templateKey = args[0];
  const options = {};

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' || args[i] === '-o') {
      options.output = args[i + 1];
      i++;
    } else if (args[i] === '--force' || args[i] === '-f') {
      options.force = true;
    }
  }

  generator.generateTemplate(templateKey, options);
}
